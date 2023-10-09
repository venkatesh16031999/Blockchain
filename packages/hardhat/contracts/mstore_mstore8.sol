// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract MemoryStore {
    function memoryStore() external pure {
        assembly {
            let freePtr := mload(0x40) // Loads the free mem pointer
            // Stores the value `1` in the memory layout which occupies 32 bytes
            mstore(freePtr, 1)
            // Memory Layout Output
            // 0x0000000000000000000000000000000000000000000000000000000000000001

            freePtr := add(freePtr, 0x20) // Increments the mem pointer by 32 bytes
            // Stores the value `2` in the next 32 byte memory slot which occupies 1 byte
            mstore8(freePtr, 2)
            // Memory Layout Output
            // 0x0200000000000000000000000000000000000000000000000000000000000000

            // Stores the value `3` in the same 32 byte memory slot
            mstore8(add(freePtr, 1), 3)
            // Memory Layout Output
            // 0x0203000000000000000000000000000000000000000000000000000000000000
        }
    }
}

