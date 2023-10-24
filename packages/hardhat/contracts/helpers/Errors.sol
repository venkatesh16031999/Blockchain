// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

interface Errors {
    error ZeroAddressNotAllowed();
    error InvalidMintAmount();
    error TokenMintNotAllowed();
    error InvalidSalt();
    error InvalidTokenBytecode();
    error DeployerRoleMissing();
}
