// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./Errors.sol";
import "@openzeppelin/contracts-upgradeable/utils/introspection/ERC165CheckerUpgradeable.sol";

library Validation {
    /// @notice Check for zero address and reverts automatically
    /// @param _address address
    function checkForZeroAddress(address _address) internal pure {
        if (_address == address(0)) {
            revert Errors.ZeroAddressNotAllowed();
        }
    }

    /// @notice Check for ERC165 compatibility
    /// @param _contractAddress contract address
    /// @param _interfaceId interface id of the contract
    function checkSupportsInterface(
        address _contractAddress,
        bytes4 _interfaceId
    ) internal view {
        bool isSupported = ERC165CheckerUpgradeable.supportsInterface(
            _contractAddress,
            _interfaceId
        );

        if (!isSupported) {
            revert Errors.IncompatibleNFTContract();
        }
    }
}
