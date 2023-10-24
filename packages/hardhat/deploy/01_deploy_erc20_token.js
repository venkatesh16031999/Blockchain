const { ethers, network, artifacts } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main() {
    const signers = await ethers.getSigners();

    const [deployer] = signers;

    // retrieve the bytecode from the build folder (artifacts)
    const { bytecode, abi } = await artifacts.readArtifact('ERC20Token');

    const exisitingConfig = JSON.parse(await fs.readFile("config/deployment-config.json", "utf8"));

    const { factoryContractAddress } = exisitingConfig[network.name].TokenFactory;
    const { recipient, amount, cap, layerZeroEndpoint, isBaseChain, owner } = exisitingConfig[network.name].ERC20Token;

    const capInWei = ethers.parseUnits(cap, "ether");
    const amountInWei = ethers.parseUnits(amount, "ether");

    const args = [capInWei, layerZeroEndpoint];
    const initializerArgs = [recipient, amountInWei, owner, isBaseChain];

    // Abi Coder to encode the data
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();

    // this is equivalent to abi.encode(args); in solidity
    const encodedArgs = abiCoder.encode(["uint256", "address"], args);

    let tokenInterface = new ethers.Interface(abi);
    const initializeData = tokenInterface.encodeFunctionData('initialize', initializerArgs);

    // this is equivalent to abi.encodePacked(args); in solidity
    const deployableBytecode = ethers.solidityPacked(["bytes", "bytes"], [bytecode, encodedArgs]);

    // this is equivalent to abi.encode(args); in solidity
    // The salt should be same accros all the chains to get the same address
    // Contract cannot be deployed twice with the same salt
    const salt = abiCoder.encode(["address", "uint256"], [await deployer.getAddress(), 0]);

    // this is equivalent to keccak256(abi.encode(args)); in solidity
    const deployableSalt = ethers.solidityPackedKeccak256(["bytes"], [salt]);

    const TokenFactory = await ethers.getContractAt("TokenFactory", factoryContractAddress, deployer);

    // derive the computed address. Address computation is based on the 
    // Temprory Proxy - bytecode, salt, deployer address and 0xff (prefix byte to prevent a collision with create opcode)
    // Implementation contract is attached to the proxy
    // Hence create3 is only dependent on the salt and deployer address
    const computedAddress = await TokenFactory.computeAddress(deployableSalt);

    console.log(`Deterministic computed address of ERC20 (${network.name}) is: , ${computedAddress}`);

    // Deploy the contract at the deterministic address
    const erc20TokenTx = await TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData);

    // Wait for 15 block confirmation to prevent contract verification failure
    await erc20TokenTx.wait(15);
 
    console.log(`ERC20Token (${network.name}) deployed to ${computedAddress}`);

    const config = {
        ...exisitingConfig,
        [network.name]: {
            ...exisitingConfig[network.name],
            ERC20Token: {
                ...exisitingConfig[network.name]['ERC20Token'],
                tokenAddress: computedAddress,
            },
        },
    };

    // store the contract address in the deployment config
    await fs.writeFile("config/deployment-config.json", JSON.stringify(config), "utf8");

    if (network.config.chainId !== 31337) {
        await hre.run("verify:verify", {
            address: computedAddress,
            constructorArguments: args,
        });
    }
};

module.exports.tags = ["ERC20Token", "all", "local", "mumbai", "sepolia", "goerli", "fuji", "polygon", "ethereum", "avalanche"];