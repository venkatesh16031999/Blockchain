// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "./Errors.sol";
import "../PerpetualConfigurator.sol";
import "./Price.sol";

library Validation {
	function checkForZeroAddress(address _address) internal pure {
		if (_address == address(0)) {
			revert Errors.ZeroAddress(_address);
		}
	}

	function checkFeePercentageValidity(uint16 _fee) internal pure {
		if (_fee < 10 && _fee > 1000) {
			revert Errors.InvalidPercentage();
		}
	}

	function checkForValidLeverage(
		address _collateralToken,
		uint8 _leverage,
		address _perpetualConfigurator
	) internal view {
		PerpetualConfigurator perpetualConfigurator = PerpetualConfigurator(
			_perpetualConfigurator
		);

		uint8 maxLeverage = perpetualConfigurator.marketLeverage(
			_collateralToken
		);

		if (_leverage <= 0 || _leverage > maxLeverage) {
			revert Errors.LeverageNotSupported();
		}
	}
}
