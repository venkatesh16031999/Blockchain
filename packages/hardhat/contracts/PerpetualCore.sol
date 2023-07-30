// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./helpers/Errors.sol";
import "./helpers/Validation.sol";
import "./helpers/Price.sol";
import "./interfaces/IERC20Token.sol";
import "./PerpetualConfigurator.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract PerpetualCore is Errors {
	uint256 public totalSupply;
	uint256 public totalReservedSupply;

	mapping(address => uint256) public collateralTokenSupply;
	mapping(bytes32 => Position) public positions;

	struct Position {
		address userAddress;
		address collateralTokenAddress;
		uint256 collateralSize;
		uint256 collateralTokenPriceInUSD;
		uint256 positionSizeInUSD;
		bool isLong;
	}

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

		Validation.checkForValidLeverage(
			_collateralTokenAddress,
			_leverage,
			address(perpetualConfigurator)
		);

		(
			uint256 collateralPriceInUSD,
			uint256 totalCollateralPriceInUSD
		) = Price.tokenToUsd(
				_collateralTokenAddress,
				_collateralSize,
				address(perpetualConfigurator)
			);

		uint256 leveragedPositionSizeInUSD = totalCollateralPriceInUSD *
			_leverage;

		bytes32 positionKey = _getPositionKey(
			_userAddress,
			_collateralTokenAddress,
			_isLong
		);

		Position storage position = positions[positionKey];

		if (position.positionSizeInUSD == 0) {
			position.collateralTokenPriceInUSD = collateralPriceInUSD;
			position.collateralTokenAddress = _collateralTokenAddress;
			position.userAddress = _userAddress;
			position.isLong = _isLong;
		}

		if (position.positionSizeInUSD > 0 && leveragedPositionSizeInUSD > 0) {
			position.collateralTokenPriceInUSD = 0; // TBD
		}

		position.positionSizeInUSD += leveragedPositionSizeInUSD;
		position.collateralSize += _collateralSize;
		totalReservedSupply += position.positionSizeInUSD;

		uint8 maxLeverage = perpetualConfigurator.marketLeverage(
			_collateralTokenAddress
		);

		uint256 maxLeverageAmountInUSD = position.collateralSize *
			maxLeverage *
			collateralPriceInUSD;

		if (position.positionSizeInUSD > maxLeverageAmountInUSD) {
			revert InvalidPositionSize();
		}

		if (position.positionSizeInUSD > (totalSupply - totalReservedSupply)) {
			revert InsufficientFunds();
		}

		_increaseColleteralTokenSupply(
			_collateralTokenAddress,
			position.collateralSize
		);

		// events TBD
	}

	function decreasePosition(
		address _userAddress,
		address _collateralTokenAddress,
		uint256 _collateralSize,
		uint256 _positionSizeInUSD,
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

		if (_collateralSize > position.collateralSize) {
			revert InvalidCollateralSize();
		}
		if (_positionSizeInUSD > position.positionSizeInUSD) {
			revert InvalidPositionSize();
		}

		if (position.positionSizeInUSD == _positionSizeInUSD) {
			delete positions[positionKey];
		} else {
			// TBD
		}

		// TBD
	}

	function _increaseColleteralTokenSupply(
		address _token,
		uint256 _positionSize
	) internal {
		collateralTokenSupply[address(_token)] += _positionSize;
	}

	function _decreaseColleteralTokenSupply(
		address _token,
		uint256 _positionSize
	) internal {
		collateralTokenSupply[_token] -= _positionSize;
	}

	function _getPositionKey(
		address _userAddress,
		address _collateral,
		bool _isLong
	) internal pure returns (bytes32) {
		return keccak256(abi.encodePacked(_userAddress, _collateral, _isLong));
	}
}
