//SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";

contract GovernanceToken is ERC20Votes {
    uint256 public constant maxSupply = 10000000000000000000000000;

    constructor(string memory name, string memory symbol)
        ERC20Permit(name)
        ERC20(name, symbol)
    {
        _mint(msg.sender, maxSupply);
    }

    function _mint(address account, uint256 amount)
        internal
        virtual
        override(ERC20Votes)
    {
        super._mint(account, amount);
    }

    function _burn(address account, uint256 amount)
        internal
        virtual
        override(ERC20Votes)
    {
        super._mint(account, amount);
    }

    function _afterTokenTransfer(
        address from,
        address to,
        uint256 amount
    ) internal virtual override(ERC20Votes) {
        super._afterTokenTransfer(from, to, amount);
    }
}
