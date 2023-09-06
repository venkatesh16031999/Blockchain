const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main() {
    const devChainIds = JSON.parse(process.env.DEV_CHAIN_IDS)?.map((id) => Number(id));
    if (devChainIds.includes(network.config.chainId)) {
        const MockNFT = await ethers.getContractFactory("MockNFT");

        const mockNFTContract = await upgrades.deployProxy(MockNFT, [], { kind: "uups" });
        await mockNFTContract.waitForDeployment();

        const mockNFTContractAddress = await mockNFTContract.getAddress();

        console.log("MockNFT deployed to:", mockNFTContractAddress);

        const implementationContractAddress = await upgrades.erc1967.getImplementationAddress(
            mockNFTContractAddress
        );

        const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));

        const config = {
            ...exisitingConfig,
            [network.config.chainId]: {
                ...exisitingConfig[network.config.chainId],
                MockNFT: {
                    proxy: mockNFTContractAddress,
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
    }
};

module.exports.tags = ["all", "MockNFT", "deploy"];
