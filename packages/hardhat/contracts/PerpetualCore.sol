// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./helpers/Errors.sol";
import "./helpers/Validation.sol";
import "./helpers/Price.sol";
import "./interfaces/IERC20Token.sol";
import "./PerpetualConfigurator.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract PerpetualCore is Errors {
	uint256 public totalReservedSupply;
	uint256 public collateralTokenSupply;
	uint256 public feeReserve;

	mapping(bytes32 => Position) public positions;

	struct Position {
		address userAddress;
		address collateralTokenAddress;
		uint256 collateralSize;
		uint256 collateralTokenPrice;
		uint256 leveragedPositionSize;
		bool isLong;
	}

	event PositionIncreased(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		uint256 collateralTokenPrice,
		uint256 collateralTokenSize
	);

	event PositionDecreased(
		address indexed userAddress,
		address indexed collateralTokenAddress,
		bool indexed isLong,
		bytes32 positionKey,
		uint256 collateralTokenPrice,
		uint256 collateralTokenSize
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

	PerpetualConfigurator immutable perpetualConfigurator;

	constructor(PerpetualConfigurator _configuratorAddress) {
		perpetualConfigurator = PerpetualConfigurator(_configuratorAddress);
	}

	function increasePosition(
		address _userAddress,
		address _collateralTokenAddress,
		uint256 _collateralSize,
		uint8 _leverage,
		bool _isLong
	) external {
		Validation.checkForZeroAddress(_userAddress);
		Validation.checkForZeroAddress(_collateralTokenAddress);
		if (!perpetualConfigurator.isMarketSupported(_collateralTokenAddress)) {
			revert UnsupportedMarket();
		}

		if (_collateralSize <= 0) {
			revert InsufficientCollateralFunds();
		}

		Validation.checkForValidLeverage(
			_collateralTokenAddress,
			_leverage,
			address(perpetualConfigurator)
		);

		uint256 _totalSupply = getTotalSupply();

		bool collateralTransferStatus = IERC20Token(
			perpetualConfigurator.baseMarketToken.address
		).transferFrom(_userAddress, address(this), _collateralSize);

		if (!collateralTransferStatus) {
			revert CollateralTokenTransferFailed();
		}

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

		if (position.leveragedPositionSize == 0) {
			position.collateralTokenPrice = _newCollateralTokenPrice;
			position.collateralTokenAddress = _collateralTokenAddress;
			position.userAddress = _userAddress;
			position.isLong = _isLong;
		}

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

		if (
			position.leveragedPositionSize >
			(_totalSupply - totalReservedSupply)
		) {
			revert InsufficientFunds();
		}

		totalReservedSupply += _leveragedPositionSize;

		uint8 maxLeverage = perpetualConfigurator.marketLeverage(
			_collateralTokenAddress
		);

		uint256 maxLeverageSize = position.collateralSize *
			maxLeverage *
			_newCollateralTokenPrice;

		if (position.leveragedPositionSize > maxLeverageSize) {
			revert InvalidPositionSize();
		}

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
			_leveragedPositionSize
		);
	}

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

		Position memory position = positions[positionKey];

		if (position.leveragedPositionSize == 0) {
			return (false, 0, 0);
		}

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

		uint256 liquidationFee = (position.collateralSize *
			perpetualConfigurator.liquidationFee) / 1000;

		uint256 marketFee = (position.leveragedPositionSize *
			perpetualConfigurator.baseMarketFee) / 1000;

		uint256 liquidationThresoldAmount = (position.collateralSize *
			perpetualConfigurator.liquidationThreshold) / 1000;

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

		if (_remainingCollateralSize < liquidationThresoldAmount) {
			return (true, marketFee, liquidationFee);
		}

		return (false, 0, 0);
	}

	function liquidateCall(
		address _userAddress,
		address _collateralTokenAddress,
		bool _isLong
	) external returns (bool) {
		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		Position storage position = positions[positionKey];

		if (position.leveragedPositionSize == 0) {
			revert PositionCannotLiquidated();
		}

		(
			bool liquidationStatus,
			uint256 marketFee,
			uint256 liquidationFee
		) = checkLiquidation(_userAddress, _collateralTokenAddress, _isLong);

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
	}

	function decreasePosition(
		address _userAddress,
		address _collateralTokenAddress,
		uint256 _collateralSize,
		uint256 _positionSize,
		bool _isLong
	) external {
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

		uint256 marketFee = (_positionSize *
			perpetualConfigurator.baseMarketFee) / 1000;

		totalReservedSupply -= _positionSize;

		uint256 realizedAmount = 0;

		(bool isProfit, uint256 delta) = Price.getPositionDelta(
			_collateralTokenAddress,
			position.leveragedPositionSize,
			position.collateralTokenPrice,
			_isLong,
			address(perpetualConfigurator)
		);

		if (_collateralSize > 0) {
			realizedAmount += _collateralSize;
			position.collateralSize -= _collateralSize;
			collateralTokenSupply -= _collateralSize;
		}

		if (_positionSize == position.leveragedPositionSize) {
			realizedAmount += position.collateralSize;
			collateralTokenSupply -= position.collateralSize;
			position.collateralSize = 0;
			position.leveragedPositionSize = 0;
		} else {
			position.leveragedPositionSize -= _positionSize;
		}

		// if (position.leveragedPositionSize == _positionSizeInUSD) {
		// 	delete positions[positionKey];

		// 	emit PositionDecreased(
		// 		_userAddress,
		// 		position.collateralTokenAddress,
		// 		_isLong,
		// 		positionKey,
		// 		collateralPriceInUSD,
		// 		leveragedPositionSizeInUSD
		// 	);
		// } else {
		// 	emit PositionDecreased(
		// 		_userAddress,
		// 		position.collateralTokenAddress,
		// 		_isLong,
		// 		positionKey,
		// 		collateralPriceInUSD,
		// 		leveragedPositionSizeInUSD
		// 	);
		// }

		// TBD
	}

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

	function getTotalSupply() public view returns (uint256 totalSupply) {
		totalSupply = IERC20Token(
			perpetualConfigurator.baseMarketToken.address
		).totalSupply();
	}
}
