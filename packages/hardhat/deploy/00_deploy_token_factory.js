const { isAddress } = require("ethers");
const { network } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main({ getNamedAccounts, deployments }) {
    const exisitingConfig = JSON.parse(await fs.readFile("config/deployment-config.json", "utf8"));

    const { factoryContractAddress } = exisitingConfig[network.name].TokenFactory;
    
    if (isAddress(factoryContractAddress)) {
        console.log("Token factory contract is already deployed");
    } else {
        const { deploy, log } = deployments;
        // factory deployer will deploy the token factory contract 
        // - The nonce is really important to get a same contract address in multiple chains
        
        // deployer will be the owner of the contract where other contracts will be deployed via factory contract
        const { deployer, factoryDeployer } = await getNamedAccounts();

        const args = [deployer];

        const TokenFactory = await deploy('TokenFactory', {
            from: factoryDeployer,
            args,
            autoMine: true,
            log: true,
            waitConfirmations: network.config.chainId === 31337 ? 1 : 6
        });

        log(`TokenFactory (${network.name}) deployed to ${TokenFactory.address}`);

        const config = {
            ...exisitingConfig,
            [network.name]: {
                ...exisitingConfig[network.name],
                TokenFactory: {
                    ...exisitingConfig[network.name]['TokenFactory'],
                    factoryContractAddress: TokenFactory.address,
                },
            },
        };

        await fs.writeFile("config/deployment-config.json", JSON.stringify(config), "utf8");

        if (network.config.chainId !== 31337) {
            await hre.run("verify:verify", {
                address: TokenFactory.address,
                constructorArguments: args,
            });
        }
    }
};

module.exports.tags = ["TokenFactory", "all", "local", "mumbai", "sepolia", "goerli", "fuji", "polygon", "ethereum", "avalanche"];
