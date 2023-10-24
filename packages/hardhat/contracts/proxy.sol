// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./utils/Validation.sol";

contract Proxy {
    constructor(address _implementation) {
        Validation.checkForZeroAddress(_implementation);

        assembly {
            sstore(address(), _implementation)
        }
    }

    fallback() external payable {
        assembly {
            let target := sload(address())
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), target, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())

            switch result 
            case 0 {
                revert(0, returndatasize())
            }
            default {
                return(0, returndatasize())
            }
        }
    }
}