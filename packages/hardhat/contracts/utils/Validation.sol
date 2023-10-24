// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

library Validation {
    error ZeroAddressNotAllowed();

	function checkForZeroAddress(address _address) internal pure {
		if (_address == address(0)) {
			revert ZeroAddressNotAllowed();
		}
	}
}