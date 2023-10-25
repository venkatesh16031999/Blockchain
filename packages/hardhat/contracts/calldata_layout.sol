// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract CalldataLayout {
    function calldataLayout(
        uint256 one, // 1
        uint16 two, // 2
        bytes calldata hello, // 0x11
        bytes memory world // 0x22
    ) external pure {
        assembly {

            // ========================================================================== //

            // Calldata Layout Internals

            // 1. First 4 bytes of calldata is always a function selector

            // 2. All the non memory variables will be placed in the calldata

            // 3. Values less than 256 bits are unpacked into 256 bits value
            // Example: uint16 will use the same space as uint256

            // 4. Values with keyword memory will be placed in both memory and calldata

            // ========================================================================== //

            // Detailed Breakdown of this function's calldata
            // Function Selector 
            // 0x6948f829

            // Value of variable one 
            // 0000000000000000000000000000000000000000000000000000000000000001

            // Value of variable two
            // 0000000000000000000000000000000000000000000000000000000000000002

            // Pointer to the slot 0x80
            // 0000000000000000000000000000000000000000000000000000000000000080

            // Pointer to the slot 0xc0
            // 00000000000000000000000000000000000000000000000000000000000000c0

            // Length of the bytes value
            // 0000000000000000000000000000000000000000000000000000000000000001

            // bytes value - bytes/string values placed left side of the slot
            // 1100000000000000000000000000000000000000000000000000000000000000

            // Length of the bytes value
            // 0000000000000000000000000000000000000000000000000000000000000001

            // bytes value - bytes/string values placed left side of the slot
            // 2200000000000000000000000000000000000000000000000000000000000000

            // ========================================================================== //
        }
    }
}
