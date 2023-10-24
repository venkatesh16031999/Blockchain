// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "./base/ModuleManager.sol";
import "./interfaces/IAccount.sol";
import "./utils/Validation.sol";
import "./interfaces/IEntryPoint.sol";

contract SmartWalletErrors {
    error CallerIsNotEntryPoint(address sender);
    error CallerIsNotEntryPointOrSelf(address sender);
    error WrongExecutionBatchInfo(
        uint256 targetsLength,
        uint256 valuesLength,
        uint256 datasLength
    );
    error DelegateCallsOnly();
    error AlreadyInitialized();
}

contract SmartWallet is IAccount, ModuleManager, SmartWalletErrors {
    IEntryPoint public immutable entryPoint;
    address private immutable self;

    event SmartAccountReceivedNativeToken(address indexed sender, uint256 indexed value);

    constructor(IEntryPoint _entryPoint) {
        Validation.checkForZeroAddress(address(_entryPoint));
        entryPoint = _entryPoint;
        self = address(this);
    }

    function init(
        address moduleSetupTarget,
        bytes calldata moduleSetupData
    ) external returns (address) {
        if (
            _modules[SENTINEL_MODULES] != address(0)
        ) revert AlreadyInitialized();

        return _setupAndEnableModule(moduleSetupTarget, moduleSetupData);
    }

    receive() external payable {
        if (address(this) == self) revert DelegateCallsOnly();
        emit SmartAccountReceivedNativeToken(msg.sender, msg.value);
    }

    function enableModule(
        address module
    ) external override onlyEntryPointOrSelfAuthorized {
        _enableModule(module);
    }

    function disableModule(
        address prevModule,
        address module
    ) external override onlyEntryPointOrSelfAuthorized {
        _disableModule(prevModule, module);
    }

    function _execute(
        address target,
        uint256 value,
        bytes memory data
    ) internal {
        assembly {
            let success := call(gas(), target, value, add(data, 0x20), mload(data), 0, 0)
            let ptr := mload(0x40)
            returndatacopy(ptr, 0, returndatasize())
            if iszero(success) {
                revert(ptr, returndatasize())
            }
        }
    }

    function execute(
        address target,
        uint256 value,
        bytes calldata data
    ) external onlyEntryPoint {
        _execute(target, value, data);
    }

    function executeBatch(
        address[] calldata targets,
        uint256[] calldata values,
        bytes[] calldata datas
    ) external onlyEntryPoint {
        if (
            targets.length == 0 ||
            targets.length != values.length ||
            values.length != datas.length
        ) revert WrongExecutionBatchInfo(targets.length, values.length, datas.length);

        for (uint256 i; i < targets.length; ) {
            _execute(targets[i], values[i], datas[i]);
            unchecked {
                ++i;
            }
        }
    }

    function addDeposit() external payable {
        entryPoint.depositTo{value: msg.value}(address(this));
    }

    function getDeposit() external view returns (uint256) {
        return entryPoint.balanceOf(address(this));
    }

    function withdrawDepositTo(
        address payable withdrawAddress,
        uint256 amount
    ) external payable onlyEntryPointOrSelfAuthorized {
        entryPoint.withdrawTo(withdrawAddress, amount);
    }

    function validateUserOp(
        UserOperation calldata /*userOp*/,
        bytes32 /*userOpHash*/,
        uint256 missingAccountFunds
    ) external onlyEntryPoint returns (uint256 validationData) {
        if (missingAccountFunds != 0) {
            (bool result,) = payable(msg.sender).call{
                value: missingAccountFunds,
                gas: gasleft()
            }("");

            (result);
        }

        return 0;
    }

    function setupAndEnableModule(
        address setupContract,
        bytes memory setupData
    ) external override onlyEntryPointOrSelfAuthorized returns (address) {
        return _setupAndEnableModule(setupContract, setupData);
    }

    function nonce(uint192 _key) external view virtual returns (uint256) {
        return entryPoint.getNonce(address(this), _key);
    }

    modifier onlyEntryPoint() {
        if (msg.sender != address(entryPoint)) {
            revert CallerIsNotEntryPoint(msg.sender);
        }
        _;
    }

    modifier onlyEntryPointOrSelfAuthorized() {
        if (msg.sender != address(this) && msg.sender != address(entryPoint)) {
            revert CallerIsNotEntryPointOrSelf(msg.sender);
        }
        _;
    }
}
