// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

contract SelfAuthorized {
    error CallerIsNotSelf(address);

    modifier authorized() {
        _requireSelfCall();
        _;
    }

    function _requireSelfCall() private view {
        if (msg.sender != address(this)) revert CallerIsNotSelf(msg.sender);
    }
}