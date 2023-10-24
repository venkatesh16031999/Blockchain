const { ethers, artifacts } = require("hardhat");

const getTokenDeployableBytecodeAndSalt = async (_constructorArgs, _initializerArgs, _salt) => {
    const { bytecode, abi } = await artifacts.readArtifact('ERC20Token');

    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    const encodedArgs = abiCoder.encode(["uint256", "address"], _constructorArgs);

    let tokenInterface = new ethers.Interface(abi);
    const initializeData = tokenInterface.encodeFunctionData('initialize', _initializerArgs);

    const deployableBytecode = ethers.solidityPacked(["bytes", "bytes"], [bytecode, encodedArgs]);
    const salt = abiCoder.encode(["uint256"], [_salt]);
    const deployableSalt = ethers.solidityPackedKeccak256(["bytes"], [salt]);

    return [deployableSalt, deployableBytecode, initializeData];
}

module.exports = {
    getTokenDeployableBytecodeAndSalt
}