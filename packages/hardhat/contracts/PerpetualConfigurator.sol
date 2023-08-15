// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./helpers/Validation.sol";
import "./helpers/Errors.sol";
import "./interfaces/IERC20Token.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";

/// @title USDT Perpetual Configuration contract powered by governance
/// @author Venkatesh Rajendran
contract PerpetualConfigurator is Ownable, Errors, Pausable {
	// Tracks the supported markets
	mapping(address => bool) public isMarketSupported;
	// token chainlink price feeds for the markets
	mapping(address => address) public tokenPriceFeeds;
	// Market maximum leverages
	mapping(address => uint8) public marketLeverage;

	IERC20Token public immutable baseMarketToken;
	uint16 public liquidationFee; // Liquidation fee in percentage
	uint16 public liquidationThreshold; // Liquidation thresold in percentage
	uint16 public baseMarketFee; // base market fee in percentage

	constructor(address _baseMarketTokenAddress, uint16 _baseFee) {
		Validation.checkForZeroAddress(_baseMarketTokenAddress);
		Validation.checkFeePercentageValidity(_baseFee);

		baseMarketToken = IERC20Token(_baseMarketTokenAddress);
		baseMarketFee = _baseFee;
	}

	/// @notice Get the chainlink oracle price feed address
	/// @param _token Market token address like ETH, UNI, MATIC, etc...
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

	/// @notice Add a market to the perpetual trading via governance
	/// @param _token Market token address like ETH, UNI, MATIC, etc...
	/// @param _priceFeed Chainlink orcale price feed address
	function addMarket(address _token, address _priceFeed) external onlyOwner {
		Validation.checkForZeroAddress(_priceFeed);
		Validation.checkForZeroAddress(_token);

		isMarketSupported[_token] = true;
		tokenPriceFeeds[_token] = _priceFeed;
		marketLeverage[_token] = 20;
	}

	/// @notice Configure the liquidation thresold and fees for positions/markets
	/// @param _feePercentage liquidation fee percentage
	/// @param _thresoldPercentage liquidation thresold in percentage
	function configureLiquidations(
		uint16 _feePercentage,
		uint16 _thresoldPercentage
	) external onlyOwner {
		Validation.checkFeePercentageValidity(_feePercentage);
		Validation.checkFeePercentageValidity(_thresoldPercentage);

		liquidationFee = _feePercentage;
		liquidationThreshold = _thresoldPercentage;
	}

	/// @notice Function to pause the perpetual market
	function pause() public onlyOwner {
		_pause();
	}

	/// @notice Function to unpause the perpetual market
	function unpause() public onlyOwner {
		_unpause();
	}
}
