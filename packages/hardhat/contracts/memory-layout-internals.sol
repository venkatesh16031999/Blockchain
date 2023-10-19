// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract AssemblyMemoryInternals {
    function memoryInternals() external pure {
        assembly {
            // Memory Layout in solidity

            // ==================================================================== //
            
            // 1. Solidity always starts with 2 scratch space memory slot
            // - 0x00 - scratch space
            // - 0x20 - scratch space

            // Usage: Hashing, Short term allocation

            // ==================================================================== //

            // 2. A free memory pointers which points to 0x80 (Initial starting memory)
            // - 0x40 - Free memory pointer

            // Usage:  Whenever a memory is used, the latest memory pointer will be 
            // pointed to 0x40 so that solidity can always refer 0x40 for a latest
            // free memory pointer

            // ===================================================================== //

            // 3. Zero slot
            // - 0x60 - Zero slot 

            // Usage: This pointer is zero permanently and is used as the initial value 
            // for empty dynamic memory arrays

            // ===================================================================== //
        }
    }
}
