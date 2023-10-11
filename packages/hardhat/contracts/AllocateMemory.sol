// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract MemoryAssembly {
    function allocateMemory() external pure {
        assembly {
            function allocate(length) {
                // 0x40 is a free memory pointer
                // initially it will be 0x80
                let pos := mload(0x40) // Get the latest free pointer

                // increament the memory based on length and
                // store the new memory pointer in 0x40
                mstore(0x40, add(pos, length))
            }

            // cache the free mem ptr => 0x80
            let ptrOne := mload(0x40) 
            allocate(0x20) // increase the mem ptr to 0x100

            // store `1` in the 0x80 memory slot
            mstore(ptrOne, 1) 

            // cache the free mem ptr => 0x100
            let ptrTwo := mload(0x40)
            allocate(0x40) // increase the mem ptr to 0x140

            // store `2` in the 0x100 memory slot
            mstore(ptrTwo, 2)
            // store `3` in the 0x120 memory slot
            mstore(add(ptrTwo, 0x20), 3)

            // Final memory layout is
            // 0x40 => 0x140
            // 0x80 => 1
            // 0x100 => 2
            // 0x120 => 3
        }
    }
}
