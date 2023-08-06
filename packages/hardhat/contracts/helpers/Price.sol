// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Errors.sol";
import "@chainlink/contracts/src/v0.8/interfaces/AggregatorV3Interface.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";
import "../PerpetualConfigurator.sol";
import "../interfaces/IERC20Token.sol";
import "../PerpetualCore.sol";

library Price {
	function getTokenPrice(address _token, address _perpetualConfigurator)
		internal
		view
		returns (uint256)
	{
		PerpetualConfigurator perpetualConfigurator = PerpetualConfigurator(
			_perpetualConfigurator
		);

		AggregatorV3Interface dataFeed = AggregatorV3Interface(
			perpetualConfigurator.getTokenPriceFeed(_token)
		);

		(
			,
			int256 answer, /*uint startedAt*/ /*uint timeStamp*/ /*uint80 answeredInRound*/
			,
			,

		) = dataFeed.latestRoundData();
		return uint256(answer);
	}

	function getPositionDelta(
		address _collateralTokenAddress,
		uint256 _leveragedPositionSize,
		uint256 _previousCollateralTokenPrice,
		bool _isLong,
		address _perpetualConfiguratorAddress
	) internal view returns (bool isProfit, uint256 delta) {
		uint256 _newCollateralTokenPrice = getTokenPrice(
			_collateralTokenAddress,
			_perpetualConfiguratorAddress
		);

		uint256 _collateralPriceDifference = _previousCollateralTokenPrice >
			_newCollateralTokenPrice
			? _previousCollateralTokenPrice - _newCollateralTokenPrice
			: _newCollateralTokenPrice - _previousCollateralTokenPrice;

		delta = Math.mulDiv(
			_leveragedPositionSize,
			_collateralPriceDifference,
			_previousCollateralTokenPrice
		);

		if (_isLong) {
			isProfit = _newCollateralTokenPrice > _previousCollateralTokenPrice;
		} else {
			isProfit = _previousCollateralTokenPrice > _newCollateralTokenPrice;
		}
	}

	function getAveragePositionPrice(
		address _collateralTokenAddress,
		uint256 _newLeveragedPositionSize,
		uint256 _newCollateralTokenPrice,
		uint256 _previousLeveragedPositionSize,
		uint256 _previousCollateralTokenPrice,
		bool _isLong,
		address _perpetualConfiguratorAddress
	) internal view returns (uint256 averagePrice) {
		(bool isProfit, uint256 delta) = getPositionDelta(
			_collateralTokenAddress,
			_previousLeveragedPositionSize,
			_previousCollateralTokenPrice,
			_isLong,
			_perpetualConfiguratorAddress
		);

		uint256 _leveragedPositionSize = _previousLeveragedPositionSize +
			_newLeveragedPositionSize;

		uint256 divisor;

		if (_isLong) {
			divisor = isProfit
				? (_leveragedPositionSize + delta)
				: (_leveragedPositionSize - delta);
		} else {
			divisor = isProfit
				? (_leveragedPositionSize - delta)
				: (_leveragedPositionSize + delta);
		}

		averagePrice = Math.mulDiv(
			_leveragedPositionSize,
			_newCollateralTokenPrice,
			divisor
		);
	}

	// // TBD
	// function usdToToken(address _token, uint256 _amount)
	// 	internal
	// 	pure
	// 	returns (uint256 amount)
	// {
	// 	amount = _amount;

	// 	return amount;
	// }

	// function tokenToUsd(
	// 	address _token,
	// 	uint256 _size,
	// 	address _perpetualConfiguratorAddress
	// ) internal view returns (uint256 collateralPrice, uint256 totalAmount) {
	// 	uint256 price = getTokenPrice(_token, _perpetualConfiguratorAddress);
	// 	uint256 decimals = IERC20Token(_token).decimals();

	// 	totalAmount = Math.mulDiv(_size, price, 10**decimals);
	// 	collateralPrice = totalAmount / _size;

	// 	return (collateralPrice, totalAmount);
	// }
}
