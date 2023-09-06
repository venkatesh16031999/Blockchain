// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./ERC6551Manager.sol";

contract ERC6551ManagerV2 is ERC6551Manager {
    /// @notice Used to check the contract version
    /// @return v returns the contract version
    function version() external pure virtual override returns (uint256 v) {
        v = 2;
    }
}
