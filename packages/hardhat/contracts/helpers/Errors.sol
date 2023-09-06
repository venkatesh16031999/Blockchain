// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface Errors {
    error TokenTransferNotAllowed();
    error NFTContractNotSupported();
    error ZeroAddressNotAllowed();
    error ZeroNumberNotAllowed();
    error IncompatibleNFTContract();
    error InvalidBaseURI();
    error BadgeNotSupported();
    error DuplicateBadgesNotAllowed();
	error InvalidPoints();
	error MaximumPointsReached();
}
