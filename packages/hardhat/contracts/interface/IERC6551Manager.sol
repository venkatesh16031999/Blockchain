// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface IERC6551Manager {
    /// @notice Determine or retrieve the NFT's token bound account address
    /// @param _nftContractAddress NFT contract address
    /// @param _tokenId NFT token ID
    /// @return tokenBoundAccountAddress NFT's token bound address
    function getTokenBoundAccount(address _nftContractAddress, uint256 _tokenId)
        external
        view
        returns (address tokenBoundAccountAddress);
}
