// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import {SelfAuthorized} from "../utils/SelfAuthorized.sol";
import "../utils/Exec.sol";

contract ModuleManagerErrors {
    error ModulesAlreadyInitialized();
    error ModulesSetupExecutionFailed();
    error ModuleCannotBeZeroOrSentinel(address module);
    error ModuleAlreadyEnabled(address module);
    error ModuleAndPrevModuleMismatch(
        address expectedModule,
        address returnedModule,
        address prevModule
    );
    error ModuleNotEnabled(address module);
    error WrongBatchProvided(
        uint256 destLength,
        uint256 valueLength,
        uint256 funcLength,
        uint256 operationLength
    );
    error WrongModuleSetupAddress(address target);
}

abstract contract ModuleManager is SelfAuthorized, ModuleManagerErrors {
    address internal constant SENTINEL_MODULES = address(0x1);
    mapping(address => address) internal _modules;

    enum Operation {
        DelegateCall,
        Call
    }

    event ExecutionFailure(
        address indexed to,
        uint256 indexed value,
        bytes indexed data,
        Operation operation,
        uint256 txGas
    );

    event ExecutionSuccess(
        address indexed to,
        uint256 indexed value,
        bytes indexed data,
        Operation operation,
        uint256 txGas
    );

    event ModuleEnabled(address module);
    event ModuleDisabled(address module);
    event ModuleExecutionSuccess(address indexed module);
    event ModuleExecutionFailure(address indexed module);

    event ModuleTransaction(
        address module,
        address to,
        uint256 value,
        bytes data,
        Operation operation
    );

    function enableModule(address module) external virtual;
    function disableModule(address prevModule, address module) external virtual;

    function setupAndEnableModule(
        address setupContract,
        bytes memory setupData
    ) external virtual returns (address);

    function getModulesPaginated(
        address start,
        uint256 pageSize
    ) external view returns (address[] memory array, address next) {
        array = new address[](pageSize);

        uint256 moduleCount;
        address currentModule = _modules[start];
        while (
            currentModule != address(0x0) &&
            currentModule != SENTINEL_MODULES &&
            moduleCount < pageSize
        ) {
            array[moduleCount] = currentModule;
            currentModule = _modules[currentModule];
            moduleCount++;
        }
        next = currentModule;

        assembly {
            mstore(array, moduleCount)
        }
    }

    function _execute(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation,
        uint256 txGas
    ) internal returns (bool result) {
        if (operation == Operation.Call) {
            result = Exec.call(to, value, data, txGas);
        } else {
            result = Exec.delegateCall(to, data, txGas);
        }

        if (result) {
            emit ExecutionSuccess(to, value, data, operation, txGas);
        } else {
            emit ExecutionFailure(to, value, data, operation, txGas);
        }
    }

    function execTransactionFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation,
        uint256 txGas
    ) public virtual returns (bool success) {
        if (
            msg.sender == SENTINEL_MODULES || _modules[msg.sender] == address(0)
        ) revert ModuleNotEnabled(msg.sender);

        success = _execute(
            to,
            value,
            data,
            operation,
            txGas == 0 ? gasleft() : txGas
        );
    }

    function execTransactionFromModuleReturnData(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) public returns (bool success, bytes memory returnData) {
        success = execTransactionFromModule(to, value, data, operation, 0);
        returnData = Exec.getReturnData(0);
    }

    function execBatchTransactionFromModule(
        address[] calldata to,
        uint256[] calldata value,
        bytes[] calldata data,
        Operation[] calldata operations
    ) public virtual returns (bool success) {
        if (
            to.length == 0 ||
            to.length != value.length ||
            value.length != data.length ||
            data.length != operations.length
        )
            revert WrongBatchProvided(
                to.length,
                value.length,
                data.length,
                operations.length
            );

        if (
            msg.sender == SENTINEL_MODULES || _modules[msg.sender] == address(0)
        ) revert ModuleNotEnabled(msg.sender);

        for (uint256 i; i < to.length; ) {
            success = _executeFromModule(
                to[i],
                value[i],
                data[i],
                operations[i]
            );
            unchecked {
                ++i;
            }
        }
    }

    function isModuleEnabled(address module) public view returns (bool) {
        return SENTINEL_MODULES != module && _modules[module] != address(0);
    }

    function _enableModule(address module) internal virtual {
        if (module == address(0) || module == SENTINEL_MODULES)
            revert ModuleCannotBeZeroOrSentinel(module);
        if (_modules[module] != address(0)) revert ModuleAlreadyEnabled(module);

        _modules[module] = _modules[SENTINEL_MODULES];
        _modules[SENTINEL_MODULES] = module;

        emit ModuleEnabled(module);
    }

    function _setupAndEnableModule(
        address setupContract,
        bytes memory setupData
    ) internal virtual returns (address) {
        address module = _setupModule(setupContract, setupData);
        _enableModule(module);
        return module;
    }

    function _disableModule(
        address prevModule,
        address module
    ) internal virtual {
        // Validate module address and check that it corresponds to module index.
        if (module == address(0) || module == SENTINEL_MODULES)
            revert ModuleCannotBeZeroOrSentinel(module);
        if (_modules[prevModule] != module)
            revert ModuleAndPrevModuleMismatch(
                module,
                _modules[prevModule],
                prevModule
            );
        _modules[prevModule] = _modules[module];
        delete _modules[module];
        emit ModuleDisabled(module);
    }

    function _executeFromModule(
        address to,
        uint256 value,
        bytes memory data,
        Operation operation
    ) internal returns (bool success) {
        success = _execute(to, value, data, operation, gasleft());

        if (success) {
            emit ModuleTransaction(msg.sender, to, value, data, operation);
            emit ModuleExecutionSuccess(msg.sender);
        } else emit ModuleExecutionFailure(msg.sender);
    }

    function _setupModule(
        address setupContract,
        bytes memory setupData
    ) internal returns (address module) {
        if (setupContract == address(0))
            revert WrongModuleSetupAddress(setupContract);
        bool success = Exec.call(setupContract, 0, setupData, gasleft());
        bytes memory returnData = Exec.getReturnData(0);

        if (success) {
            module = address(uint160(bytes20(returnData)));
        } else {
            Exec.revertWithData(returnData);
        }
    }
}
