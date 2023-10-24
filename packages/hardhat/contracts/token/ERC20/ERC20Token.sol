// SPDX-License-Identifier: MIT

pragma solidity 0.8.18;

import "@layerzerolabs/solidity-examples/contracts/token/oft/OFT.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Capped.sol";
import "@openzeppelin/contracts/token/ERC20/extensions/ERC20Votes.sol";
import "@openzeppelin/contracts/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts/security/Pausable.sol";
import "../../helpers/Errors.sol";
import "../../helpers/Validation.sol";

/// @title Omnichain ERC20 token with LayerZero support
/// @author Venkatesh
/// @notice This contract is compatible of message passing via LayerZero protocol for token bridging
contract ERC20Token is
    OFT,
    ERC20Capped,
    ERC20Burnable,
    ERC20Votes,
    Pausable,
    Initializable
{
    bool private _isBaseChain = false;

    constructor(
        uint256 _cap,
        address _layerZeroEndpoint // Layer Zero protocol contract which facilitates the message passing
    )
        OFT("Token", "TK", _layerZeroEndpoint)
        ERC20Capped(_cap)
        ERC20Permit("Token")
    {
        Validation.checkForZeroAddress(_layerZeroEndpoint);
    }

    function initialize(
        address _recipient,
        uint256 _amount,
        address _owner,
        bool _isBase
    ) external initializer {
        Validation.checkForZeroAddress(_recipient);
        Validation.checkForZeroAddress(_owner);

        if (_isBase) {
            if (_amount == 0) {
                revert Errors.InvalidMintAmount();
            } else {
                _mint(_recipient, _amount);
            }

            _isBaseChain = true;
        } else {
            if (_amount > 0) {
                revert Errors.TokenMintNotAllowed();
            }

            _isBaseChain = false;
        }

        _transferOwnership(_owner);
    }

    /// @notice Determines whether the token is deployed on base chain or child chain
    function isBaseChain() external view returns (bool) {
        return _isBaseChain;
    }

    /// @notice Deduct the tokens from a user during the cross chain call
    function _debitFrom(
        address _from,
        uint16 _dstChainId,
        bytes memory _toAddress,
        uint256 _amount
    ) internal virtual override whenNotPaused returns (uint256) {
        return super._debitFrom(_from, _dstChainId, _toAddress, _amount);
    }

    /// @notice Pause and Unpause the token transfer between multiple chains
    /// @param pause boolean value true/false
    function pauseSendTokens(bool pause) external onlyOwner {
        pause ? _pause() : _unpause();
    }

    /// @notice Mints a token for the user
    function _mint(
        address _account,
        uint256 _amount
    ) internal virtual override(ERC20, ERC20Capped, ERC20Votes) {
        super._mint(_account, _amount);
    }

    function _burn(
        address _account,
        uint256 _amount
    ) internal virtual override(ERC20, ERC20Votes) {
        super._burn(_account, _amount);
    }

    function _afterTokenTransfer(
        address _from,
        address _to,
        uint256 _amount
    ) internal virtual override(ERC20, ERC20Votes) {
        super._afterTokenTransfer(_from, _to, _amount);
    }
}
