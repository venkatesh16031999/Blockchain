// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Errors {
	error ZeroAddress(address);
	error InsufficientFunds();
	error LeverageNotSupported();
	error UnsupportedMarket();
	error InvalidPercentage();
	error InvalidPositionSize();
	error InsufficientCollateralFunds();
	error CollateralTokenTransferFailed();
	error LiquidationFeeTokenTransferFailed();
	error PositionCannotLiquidated();
	error InsufficientFundsForFees();
}
