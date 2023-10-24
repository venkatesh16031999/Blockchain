// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./Errors.sol";

library Validation {
    /// @notice Check for zero address and reverts automatically
    /// @param _address address
    function checkForZeroAddress(address _address) internal pure {
        if (_address == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }
}
