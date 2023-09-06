// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./ArcadiansPoints.sol";

contract ArcadiansPointsV2 is ArcadiansPoints {
    /// @notice Used to check the contract version
    /// @return v returns the contract version
    function version() external pure virtual override returns (uint256 v) {
        v = 2;
    }

    /// @notice Used to mint an arcadian points for EOA wallet
    /// @param _walletAddress user wallet address
    /// @param _points The number of points to be minted
    /// @custom:testing This function is used only for testing purposes
    function mintEOA(address _walletAddress, uint256 _points)
        external
        virtual
        nonReentrant
        onlyRole(MINTER_ROLE)
    {
        Validation.checkForZeroAddress(_walletAddress);
        _mint(_walletAddress, _points);
    }
}
