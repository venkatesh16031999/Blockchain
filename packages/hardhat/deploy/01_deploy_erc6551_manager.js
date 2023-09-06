const { network, ethers } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main() {
    const devChainIds = JSON.parse(process.env.DEV_CHAIN_IDS)?.map((id) => Number(id));

    const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));

    const ERC6551Manager = await ethers.getContractFactory("ERC6551Manager");

    const { registry, implementation, salt } = exisitingConfig[network.config.chainId].ERC6551;

    const ERC6551Registry = registry;
    const ERC6551AccountImplementation = implementation;
    const ERC6551Salt = salt;

    const erc6551ManagerContract = await upgrades.deployProxy(
        ERC6551Manager,
        [ERC6551Registry, ERC6551AccountImplementation, ERC6551Salt],
        { kind: "uups" }
    );

    await erc6551ManagerContract.waitForDeployment();

    const erc6551ManagerContractAddress = await erc6551ManagerContract.getAddress();

    console.log("ERC6551 Manager Contract deployed to:", erc6551ManagerContractAddress);

    let NFTContractAddress;

    if (devChainIds.includes(network.config.chainId)) {
        const { proxy } = exisitingConfig[network.config.chainId].MockNFT;
        NFTContractAddress = proxy;
    } else {
        NFTContractAddress = process.env.ARCADIANS_V2_NFT_ADDRESS;
    }

    await erc6551ManagerContract.configureNFTContract(NFTContractAddress, true);
    console.log(
        "Configured the NFT contract :",
        NFTContractAddress,
        await erc6551ManagerContract.supportedNFTContracts(NFTContractAddress)
    );

    const implementationContractAddress = await upgrades.erc1967.getImplementationAddress(
        erc6551ManagerContractAddress
    );

    const config = {
        ...exisitingConfig,
        [network.config.chainId]: {
            ...exisitingConfig[network.config.chainId],
            ERC6551Manager: {
                proxy: erc6551ManagerContractAddress,
                implementation: implementationContractAddress,
            },
        },
    };

    await fs.writeFile("utils/config.json", JSON.stringify(config), "utf8");

    if (network.config.chainId !== 31337) {
        await hre.run("verify:verify", {
            address: implementationContractAddress,
            constructorArguments: [],
        });
    }
};

module.exports.tags = ["all", "ERC6551Manager", "deploy"];
