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
		PerpetualCore.Position calldata _postion,
		address _perpetualConfiguratorAddress
	) internal view returns (bool isProfit, uint256 delta) {
		uint256 priceInUSD = getTokenPrice(
			_postion.collateralTokenAddress,
			_perpetualConfiguratorAddress
		);

		uint256 priceDifferenceInUSD = _postion.collateralTokenPriceInUSD >
			priceInUSD
			? _postion.collateralTokenPriceInUSD - priceInUSD
			: priceInUSD - _postion.collateralTokenPriceInUSD;

		delta =
			(_postion.positionSizeInUSD * priceDifferenceInUSD) /
			_postion.collateralTokenPriceInUSD;

		if (_postion.isLong) {
			isProfit = _postion.collateralTokenPriceInUSD > priceInUSD;
		} else {
			isProfit = _postion.collateralTokenPriceInUSD < priceInUSD;
		}
	}

	// TBD
	function usdToToken(address _token, uint256 _amount)
		internal
		pure
		returns (uint256 amount)
	{
		amount = _amount;

		return amount;
	}

	function tokenToUsd(
		address _token,
		uint256 _size,
		address _perpetualConfiguratorAddress
	) internal view returns (uint256 collateralPrice, uint256 totalAmount) {
		uint256 price = getTokenPrice(_token, _perpetualConfiguratorAddress);
		uint256 decimals = IERC20Token(_token).decimals();

		totalAmount = Math.mulDiv(_size, price, 10**decimals);
		collateralPrice = totalAmount / _size;

		return (collateralPrice, totalAmount);
	}
}
