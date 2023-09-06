const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main() {
    const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));

    const ArcadiansPoints = await ethers.getContractFactory("ArcadiansPoints");

    const { proxy } = exisitingConfig[network.config.chainId].ERC6551Manager;

    const ERC6551Manager = proxy;

    const arcadiansPointsContract = await upgrades.deployProxy(
        ArcadiansPoints,
        ["ArcadiansPoints", "AXP", ERC6551Manager],
        { kind: "uups" }
    );

    await arcadiansPointsContract.waitForDeployment();

    const arcadiansPointsContractAddress = await arcadiansPointsContract.getAddress();

    console.log("ArcadiansPoints deployed to:", arcadiansPointsContractAddress);

    const implementationContractAddress = await upgrades.erc1967.getImplementationAddress(
        arcadiansPointsContractAddress
    );

    const config = {
        ...exisitingConfig,
        [network.config.chainId]: {
            ...exisitingConfig[network.config.chainId],
            ArcadiansPoints: {
                proxy: arcadiansPointsContractAddress,
                implementation: implementationContractAddress,
            },
        },
    };

    await fs.writeFile("utils/config.json", JSON.stringify(config), "utf8");

    if (network.config.chainId !== 31337) {
        await hre.run("verify:verify", {
            address: implementationContractAddress,
            constructorArguments: [], // implementation contract doesn't require any args
        });
    }
};

module.exports.tags = ["all", "ArcadiansPoints", "deploy"];
