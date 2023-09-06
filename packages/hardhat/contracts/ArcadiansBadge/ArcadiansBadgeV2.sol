// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./ArcadiansBadge.sol";

contract ArcadiansBadgeV2 is ArcadiansBadge {
    /// @notice Used to check the contract version
    /// @return v returns the contract version
    function version() external pure virtual override returns (uint256 v) {
        v = 2;
    }

    /// @notice Used to mint an arcadian badge for EOA wallet
    /// @custom:testing This function is used only for testing purposes
    function mintEOA(string memory _badgeType) external {
        userBadges[msg.sender][_badgeType] = true;
        _safeMint(msg.sender, 100);
        _setTokenURI(100, _badgeType);
    }
}
