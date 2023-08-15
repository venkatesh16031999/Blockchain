// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./helpers/Errors.sol";
import "./helpers/Validation.sol";
import "./helpers/Price.sol";
import "./interfaces/IERC20Token.sol";
import "./PerpetualConfigurator.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "@openzeppelin/contracts/security/ReentrancyGuard.sol";

/// @title USDT Perpetual Contract
/// @author Venkatesh Rajendran
contract PerpetualCore is Errors, ReentrancyGuard {

	// tracks the total reserved USDT tokens 
	uint256 public totalReservedSupply;
	// tracks the total collateral USDT tokens for each positions
	uint256 public collateralTokenSupply;
	// tracks the fee reserve in USDT tokens
	uint256 public feeReserve;

	// Users trade positions are tracked here
	mapping(bytes32 => Position) public positions;

	struct Position {
		address userAddress;
		address collateralTokenAddress;
		uint256 collateralSize; // Collateral size in USDT
		uint256 collateralTokenPrice; // Collateral Prize is USDT
		uint256 leveragedPositionSize; // Total leverage position in USDT
		int256 realisedPNL; // Proift and Loss of a position is tracked here
		bool isLong; // Long positions and short position
	}

	event PositionIncreased(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		uint256 collateralTokenPrice,
		uint256 collateralTokenSize,
		uint256 leveragedPositionSize
	);

	event PositionDecreased(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		uint256 collateralTokenPrice,
		uint256 collateralTokenSize,
		uint256 leveragedPositionSize
	);

	event PositionLiquidated(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		address liquidator,
		uint256 liquidationFees
	);

	event MarketFeeCollected(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		uint256 fees
	);

	modifier whenMarketNotPaused() {
        if (!perpetualConfigurator.paused()) {
			revert MarketIsPaused();
		}
        _;
    }

	// Configuration contract which is powered by governance
	PerpetualConfigurator immutable perpetualConfigurator;

	constructor(PerpetualConfigurator _configuratorAddress) {
		perpetualConfigurator = PerpetualConfigurator(_configuratorAddress);
	}

    /// @notice Creates or Increase the trading position for both short and long
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _collateralSize Collateral token is taken as a collateral for the position
	/// @param _leverage Trading position leverage 
	/// @param _isLong Trading position indicator to represents a long / short position
	function increasePosition(
		address _userAddress,
		address _collateralTokenAddress,
		uint256 _collateralSize,
		uint8 _leverage,
		bool _isLong
	) external nonReentrant whenMarketNotPaused {
		{
			Validation.checkForZeroAddress(_userAddress);
			Validation.checkForZeroAddress(_collateralTokenAddress);

			// check if the market is support or not
			if (!perpetualConfigurator.isMarketSupported(_collateralTokenAddress)) {
				revert UnsupportedMarket();
			}

			if (_collateralSize <= 0) {
				revert InsufficientCollateralFunds();
			}

			// check the maximum leverage supported by the market
			Validation.checkForValidLeverage(
				_collateralTokenAddress,
				_leverage,
				address(perpetualConfigurator)
			);
		}

		// total USDT supply
		uint256 _totalSupply = getTotalSupply();

		{
			bool collateralTransferStatus = IERC20Token(
				perpetualConfigurator.baseMarketToken.address
			).transferFrom(_userAddress, address(this), _collateralSize);

			if (!collateralTransferStatus) {
				revert CollateralTokenTransferFailed();
			}
		}

		// Retrieves the token price in USD from chainlink oracle
		uint256 _newCollateralTokenPrice = Price.getTokenPrice(
			_collateralTokenAddress,
			address(perpetualConfigurator)
		);

		uint256 _leveragedPositionSize = _collateralSize * _leverage;

		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		Position storage position = positions[positionKey];

		bool _liquidationCheckRequired = false;

		// creates a new positions 
		if (position.leveragedPositionSize == 0) {
			position.collateralTokenPrice = _newCollateralTokenPrice;
			position.collateralTokenAddress = _collateralTokenAddress;
			position.userAddress = _userAddress;
			position.isLong = _isLong;
		}

		// Increase the existing position and update the average position price
		if (position.leveragedPositionSize > 0) {
			position.collateralTokenPrice = Price.getAveragePositionPrice(
				position.collateralTokenAddress,
				_leveragedPositionSize,
				_newCollateralTokenPrice,
				position.leveragedPositionSize,
				position.collateralTokenPrice,
				_isLong,
				address(perpetualConfigurator)
			);

			_liquidationCheckRequired = true;
		}

		position.leveragedPositionSize += _leveragedPositionSize;
		position.collateralSize += _collateralSize;
		collateralTokenSupply += _collateralSize;

		// check if the maximum reserved token supply is used or not
		if (
			position.leveragedPositionSize >
			(_totalSupply - (totalReservedSupply + feeReserve))
		) {
			revert InsufficientFunds();
		}

		// tracks the USDT reserve supply 
		totalReservedSupply += _leveragedPositionSize;

		{
			uint8 maxLeverage = perpetualConfigurator.marketLeverage(
				_collateralTokenAddress
			);

			uint256 maxLeverageSize = position.collateralSize *
				maxLeverage *
				_newCollateralTokenPrice;

			// Restrict user to increase a position more than the maximum leverage
			if (position.leveragedPositionSize > maxLeverageSize) {
				revert InvalidPositionSize();
			}
		}

		// Check for the posibility of liquation while increase the position size
		if (_liquidationCheckRequired) {
			(bool _liquidationStatus, , ) = checkLiquidation(
				_userAddress,
				_collateralTokenAddress,
				_isLong
			);

			if (_liquidationStatus) {
				revert InsufficientCollateralFunds();
			}
		}

		emit PositionIncreased(
			_userAddress,
			position.collateralTokenAddress,
			_isLong,
			positionKey,
			_newCollateralTokenPrice,
			_collateralSize,
			_leveragedPositionSize
		);
	}

    /// @notice Check if the position is liquidated or not
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _isLong Trading position indicator to represents a long / short position
	function checkLiquidation(
		address _userAddress,
		address _collateralTokenAddress,
		bool _isLong
	)
		public
		view
		returns (
			bool,
			uint256,
			uint256
		)
	{
		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		onlyPositionOwner(msg.sender, positionKey);

		Position memory position = positions[positionKey];

		if (position.leveragedPositionSize == 0) {
			return (false, 0, 0);
		}

		// Retrieve the price difference for the trading position
		(bool isProfit, uint256 delta) = Price.getPositionDelta(
			_collateralTokenAddress,
			position.leveragedPositionSize,
			position.collateralTokenPrice,
			_isLong,
			address(perpetualConfigurator)
		);

		if (!isProfit && position.collateralSize < delta) {
			return (true, 0, 0);
		}

		// liquadation fee calculation
		uint256 liquidationFee = (position.collateralSize *
			perpetualConfigurator.liquidationFee()) / 1000;

		// market fee calculation
		uint256 marketFee = (position.leveragedPositionSize *
			perpetualConfigurator.baseMarketFee()) / 1000;

		// liquadation thresold calculation
		uint256 liquidationThresoldAmount = (position.collateralSize *
			perpetualConfigurator.liquidationThreshold()) / 1000;

		uint256 _remainingCollateralSize = position.collateralSize;

		if (!isProfit) {
			_remainingCollateralSize -= delta;
		}

		if (_remainingCollateralSize < marketFee) {
			return (true, _remainingCollateralSize, 0);
		}

		_remainingCollateralSize -= marketFee;

		if (_remainingCollateralSize < liquidationFee) {
			return (true, marketFee, _remainingCollateralSize);
		}

		_remainingCollateralSize -= liquidationFee;

		// liquidate the position if the price difference in position exceeds the liquidation thresold
		if (_remainingCollateralSize < liquidationThresoldAmount) {
			return (true, marketFee, liquidationFee);
		}

		return (false, 0, 0);
	}

    /// @notice Check if the position is liquidated or not and liquidate the trading position
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _isLong Trading position indicator to represents a long / short position
	function liquidateCall(
		address _userAddress,
		address _collateralTokenAddress,
		bool _isLong
	) external nonReentrant whenMarketNotPaused returns (bool) {
		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		Position storage position = positions[positionKey];

		if (position.leveragedPositionSize == 0) {
			revert PositionCannotLiquidated();
		}

		// Check if the position is liquidated or not and liquidate
		(
			bool liquidationStatus,
			uint256 marketFee,
			uint256 liquidationFee
		) = checkLiquidation(_userAddress, _collateralTokenAddress, _isLong);

		if (!liquidationStatus) return false;

		if (liquidationStatus && marketFee <= 0) {
			revert InsufficientFundsForFees();
		}

		if (liquidationStatus && liquidationFee <= 0) {
			revert InsufficientFundsForFees();
		}

		collateralTokenSupply -= position.collateralSize;
		totalReservedSupply -= position.leveragedPositionSize;
		feeReserve += marketFee;

		delete positions[positionKey];

		// transfer the liquidation fee for the liquidator as incentive
		bool liquidationFeeDistributionStatus = IERC20Token(
			perpetualConfigurator.baseMarketToken.address
		).transfer(msg.sender, liquidationFee);

		if (!liquidationFeeDistributionStatus) {
			revert LiquidationFeeTokenTransferFailed();
		}

		emit MarketFeeCollected(
			_userAddress,
			_collateralTokenAddress,
			_isLong,
			positionKey,
			marketFee
		);

		emit PositionLiquidated(
			_userAddress,
			_collateralTokenAddress,
			_isLong,
			positionKey,
			msg.sender,
			liquidationFee
		);

		return true;
	}

    /// @notice Used to Reduce the position and collateral size 
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _isLong Trading position indicator to represents a long / short position
	/// @param _positionSize leveraged position size in USDT
	/// @param _collateralSize collateral position size in USDT
	function _reduceCollateral(
		address _userAddress,
		address _collateralTokenAddress,
		bool _isLong,
		uint256 _positionSize,
		uint256 _collateralSize
	) internal returns (uint256) {
		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		Position storage position = positions[positionKey];

		uint256 marketFee = (_positionSize *
			perpetualConfigurator.baseMarketFee()) / 1000;

		// Retrieve the price difference for the trading position
		(bool isProfit, uint256 delta) = Price.getPositionDelta(
			_collateralTokenAddress,
			position.leveragedPositionSize,
			position.collateralTokenPrice,
			_isLong,
			address(perpetualConfigurator)
		);

		// adjusts the position size based on the amountOut and actual position size
		uint256 adjustedPositionSize = Math.mulDiv(
			_positionSize,
			delta,
			position.leveragedPositionSize
		);

		uint256 releaseAmount = 0;

		if (isProfit) {
			position.realisedPNL += int256(adjustedPositionSize);
			releaseAmount += adjustedPositionSize;
		} else {
			position.collateralSize -= adjustedPositionSize;
			collateralTokenSupply -= adjustedPositionSize;
			position.realisedPNL -= int256(adjustedPositionSize);
		}

		if (_collateralSize > 0) {
			releaseAmount += _collateralSize;
			position.collateralSize -= _collateralSize;
			collateralTokenSupply -= _collateralSize;
		}

		if (_positionSize == position.leveragedPositionSize) {
			releaseAmount += position.collateralSize;
			collateralTokenSupply -= position.collateralSize;
			position.collateralSize = 0;
			position.leveragedPositionSize = 0;
		} else {
			position.leveragedPositionSize -= _positionSize;
		}

		totalReservedSupply -= _positionSize;

		if (releaseAmount > marketFee) {
			releaseAmount -= marketFee;
		} else {
			position.collateralSize -= marketFee;
		}

		feeReserve += marketFee;

		emit MarketFeeCollected(
			_userAddress,
			_collateralTokenAddress,
			_isLong,
			positionKey,
			marketFee
		);

		return releaseAmount;
	}

    /// @notice Used to reduce the position and collateral size 
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _isLong Trading position indicator to represents a long / short position
	/// @param _positionSize leveraged position size in USDT
	/// @param _collateralSize collateral position size in USDT
	function decreasePosition(
		address _userAddress,
		address _collateralTokenAddress,
		uint256 _collateralSize,
		uint256 _positionSize,
		bool _isLong
	) external nonReentrant whenMarketNotPaused {
		Validation.checkForZeroAddress(_userAddress);
		Validation.checkForZeroAddress(_collateralTokenAddress);
		if (!perpetualConfigurator.isMarketSupported(_collateralTokenAddress)) {
			revert UnsupportedMarket();
		}

		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		onlyPositionOwner(msg.sender, positionKey);

		Position storage position = positions[positionKey];

		if (
			position.leveragedPositionSize == 0 || position.collateralSize == 0
		) {
			revert InvalidPositionSize();
		}

		if (_positionSize <= 0) {
			revert InvalidPositionSize();
		}

		if (_collateralSize > position.collateralSize) {
			revert InvalidPositionSize();
		}

		if (_positionSize > position.leveragedPositionSize) {
			revert InvalidPositionSize();
		}

		// Internal function to reduce the position and collateral size 
		uint256 releaseAmount = _reduceCollateral(
			_userAddress,
			_collateralTokenAddress,
			_isLong,
			_positionSize,
			_collateralSize
		);

		{
			// check the possibility of the position for the liquidation
			(
				bool liquidationStatus,,
			) = checkLiquidation(_userAddress, _collateralTokenAddress, _isLong);

			if (liquidationStatus) {
				revert CannotDecreasePositionSize();
			}

			if (position.leveragedPositionSize < position.collateralSize) {
				revert InvalidPositionSize();
			}

		}

		uint256 currentCollateralTokenPrice = Price.getTokenPrice(
			_collateralTokenAddress,
			address(perpetualConfigurator)
		);

		// if full position is attempted to close, close the position completly
		if (_positionSize == position.leveragedPositionSize) {
			delete positions[positionKey];
			emit PositionDecreased(
				_userAddress,
				position.collateralTokenAddress,
				_isLong,
				positionKey,
				currentCollateralTokenPrice,
				_collateralSize,
				_positionSize
			);
		} else { // If a partial position size is reduced, the collateral or position size will be reduced
			emit PositionDecreased(
				_userAddress,
				position.collateralTokenAddress,
				_isLong,
				positionKey,
				currentCollateralTokenPrice,
				_collateralSize,
				_positionSize
			);
		}
		
		// transfer the collateral or a profit for the user
		bool amountDistributionStatus = IERC20Token(
			perpetualConfigurator.baseMarketToken.address
		).transfer(position.userAddress, releaseAmount);

		if (!amountDistributionStatus) {
			revert PNLTokenTransferFailed();
		}
	}

    /// @notice Generate a trading position key
    /// @param _userAddress User's wallet address
	/// @param _collateralTokenAddress Collateral token address (like BTC, ETH, UNI etc....)
	/// @param _isLong Trading position indicator to represents a long / short position
	function _getPositionKey(
		address _userAddress,
		address _collateralTokenAddress,
		bool _isLong
	) internal pure returns (bytes32) {
		return
			keccak256(
				abi.encodePacked(_userAddress, _collateralTokenAddress, _isLong)
			);
	}

    /// @notice Used to retrieve the USDT total supply
	function getTotalSupply() public view returns (uint256 totalSupply) {
		totalSupply = IERC20Token(
			perpetualConfigurator.baseMarketToken.address
		).totalSupply();
	}

    /// @notice Used to check if the user is a owner of the position
	/// @param _userAddress User's wallet address
	/// @param _positionKey User's trade position key
	function onlyPositionOwner(address _userAddress, bytes32 _positionKey) internal view {
		if (positions[_positionKey].userAddress != _userAddress) {
			revert NotAnPositionOwner();
		}
	}
}
