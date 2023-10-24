// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "solmate/src/utils/CREATE3.sol";
import "@openzeppelin/contracts/access/AccessControl.sol";
import "../helpers/Validation.sol";
import "../helpers/Errors.sol";

contract TokenFactory is AccessControl {
    bytes32 public constant DEPLOYER_ROLE = keccak256("DEPLOYER_ROLE");

    event TokenContractCreated(
        address indexed contractAddress,
        address indexed createdBy,
        bytes initializeData
    );

    modifier onlyDeployer() {
        if (
            !hasRole(DEPLOYER_ROLE, _msgSender()) ||
            !hasRole(DEFAULT_ADMIN_ROLE, _msgSender())
        ) {
            revert Errors.DeployerRoleMissing();
        }
        _;
    }

    constructor(address _owner) {
        Validation.checkForZeroAddress(_owner);

        _grantRole(DEFAULT_ADMIN_ROLE, _owner);
        _grantRole(DEPLOYER_ROLE, _owner);
    }

    function determinsiticDeploy(
        uint256 _amount,
        bytes32 _salt,
        bytes calldata _bytecode,
        bytes memory _initializeData
    ) external onlyDeployer returns (address) {
        if (_salt.length == 0) {
            revert Errors.InvalidSalt();
        }

        if (_bytecode.length == 0) {
            revert Errors.InvalidTokenBytecode();
        }

        address contractAddress = CREATE3.deploy(
            _salt,
            _bytecode,
            _amount
        );

        Validation.checkForZeroAddress(contractAddress);

        if (_initializeData.length > 0) {
            assembly {
                let result := call(
                    gas(),
                    contractAddress,
                    0,
                    add(_initializeData, 0x20),
                    mload(_initializeData),
                    0,
                    0
                )

                let ptr := mload(0x40)

                returndatacopy(ptr, 0, returndatasize())

                if iszero(result) {
                    revert(ptr, returndatasize())
                }
            }
        }

        emit TokenContractCreated(contractAddress, msg.sender, _initializeData);

        return contractAddress;
    }

    function computeAddress(
        bytes32 _salt
    ) external view returns (address) {
        return
            CREATE3.getDeployed(_salt);
    }
}
