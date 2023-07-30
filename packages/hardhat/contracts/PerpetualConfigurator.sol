// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./helpers/Validation.sol";
import "./helpers/Errors.sol";
import "./interfaces/IERC20Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract PerpetualConfigurator is Ownable, Errors {
	mapping(address => bool) public isMarketSupported;
	mapping(address => address) public tokenPriceFeeds;
	mapping(address => uint8) public marketLeverage;

	IERC20Token public immutable baseMarketTokenAddress;
	uint16 public liquidationFee;
	uint16 public liquidationFeeThreshold;
	uint16 public baseMarketFee;

	constructor(address _baseMarketTokenAddress, uint16 _baseFee) {
		Validation.checkForZeroAddress(_baseMarketTokenAddress);
		Validation.checkFeePercentageValidity(_baseFee);

		baseMarketTokenAddress = IERC20Token(_baseMarketTokenAddress);
		baseMarketFee = _baseFee;
	}

	function getTokenPriceFeed(address _token)
		public
		view
		returns (address priceFeed)
	{
		if (!isMarketSupported[_token]) {
			revert UnsupportedMarket();
		}

		priceFeed = tokenPriceFeeds[_token];
	}

	function addMarket(address _token, address _priceFeed) external onlyOwner {
		Validation.checkForZeroAddress(_priceFeed);
		Validation.checkForZeroAddress(_token);

		isMarketSupported[_token] = true;
		tokenPriceFeeds[_token] = _priceFeed;
		marketLeverage[_token] = 20;
	}

	function configureLiquidations(
		uint16 _feePercentage,
		uint16 _thresoldPercentage
	) external onlyOwner {
		Validation.checkFeePercentageValidity(_feePercentage);
		Validation.checkFeePercentageValidity(_thresoldPercentage);

		liquidationFee = _feePercentage;
		liquidationFeeThreshold = _thresoldPercentage;
	}
}
