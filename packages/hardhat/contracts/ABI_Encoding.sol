// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract MemoryEncoding {
    struct Person { uint256 age; string name; }

    function getEncodedBytes() external pure returns (bytes memory res) {
        res = abi.encode(1, 2, 3); // Solidity way of encoding the data
    }

    function getEncodedBytesByYul() external view returns (bytes memory) {
        // 0x80 == 128 bytes slot and 0x20 == 32 bytes
        // each slots are incremented by 32 bytes
        // 0x80 - Creates a memory slot and store the length 32 bytes * 3 = 96
        bytes memory res = new bytes(96);
        
        assembly {
            mstore(add(res, 0x20), 1) // add `1` in 160 bytes slot
            mstore(add(res, 0x40), 2) // add `2` in 192 bytes slot
            mstore(add(res, 0x60), shl(96, caller())) // add `3` in 224 slot
        }

        // 256 bytes slot - creates a pointer slot to point the value in memory 
        // 288 bytes slot - Stores the length of the returning bytes
        // 320 bytes slot - stores the returnining `1`
        // 352 bytes slot - stores the returnining `2`
        // 384 bytes slot - stores the returnining `3`
        // finally returns the encoded bytes
        return res;
    }
}

