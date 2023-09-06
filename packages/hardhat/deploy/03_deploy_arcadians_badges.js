const { ethers, upgrades, network } = require("hardhat");
const fs = require("fs").promises;

module.exports = async function main() {
    const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));

    const ArcadiansBadge = await ethers.getContractFactory("ArcadiansBadge");

    const { proxy } = exisitingConfig[network.config.chainId].ERC6551Manager;

    const ERC6551Manager = proxy;

    const arcadiansBadgeContract = await upgrades.deployProxy(
        ArcadiansBadge,
        ["ArcadiansBadge", "ABADGE", ERC6551Manager],
        { kind: "uups" }
    );

    await arcadiansBadgeContract.waitForDeployment();

    const arcadiansBadgeContractAddress = await arcadiansBadgeContract.getAddress();

    console.log("ArcadiansBadge deployed to:", arcadiansBadgeContractAddress);

    await arcadiansBadgeContract.configureBadgeType("sparkbearer", true);
    await arcadiansBadgeContract.configureBadgeType("shardspeaker", true);
    await arcadiansBadgeContract.configureBadgeType("guidestar", true);
    await arcadiansBadgeContract.configureBadgeType("fatesmith", true);

    const implementationContractAddress = await upgrades.erc1967.getImplementationAddress(
        arcadiansBadgeContractAddress
    );

    const config = {
        ...exisitingConfig,
        [network.config.chainId]: {
            ...exisitingConfig[network.config.chainId],
            ArcadiansBadge: {
                proxy: arcadiansBadgeContractAddress,
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

module.exports.tags = ["all", "ArcadiansBadge", "deploy"];
