const { ethers, upgrades, network } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs").promises;
const { TokenboundClient } = require("@tokenbound/sdk");

describe("Arcadians Badge Test Cases", () => {
    let ArcadiansBadge;
    let ArcadiansBadgeV2;
    let deployer;
    let userOne;
    let userTwo;
    let randomAddress = "0xbac03987459fe5a0528d15a5fce946dcae71f003";
    let baseURI = "https://arcadians.dev.outplay.games/v2/arcadians/";
    let badgeTypes = ["sparkbearer", "shardspeaker", "guidestar", "fatesmith"];

    before("Deploying the contracts", async () => {
        [deployer, userOne, userTwo] = await ethers.getSigners();

        const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));
        const { registry, implementation, salt } = exisitingConfig[network.config.chainId].ERC6551;

        ERC6551Registry = registry;
        ERC6551AccountImplementation = implementation;
        ERC6551Salt = salt; // 0 is a Official TBA salt

        ERC6551ManagerFactory = await ethers.getContractFactory("ERC6551Manager");
        MockNFTFactory = await ethers.getContractFactory("MockNFT");
        ArcadiansBadgeFactory = await ethers.getContractFactory("ArcadiansBadge");

        MockNFT = await upgrades.deployProxy(MockNFTFactory, [], { kind: "uups" });

        ERC6551Manager = await upgrades.deployProxy(
            ERC6551ManagerFactory,
            [ERC6551Registry, ERC6551AccountImplementation, ERC6551Salt],
            { kind: "uups" }
        );

        ArcadiansBadge = await upgrades.deployProxy(
            ArcadiansBadgeFactory,
            ["ArcadiansBadge", "AB", await ERC6551Manager.getAddress()],
            { kind: "uups" }
        );

        await ERC6551Manager.configureNFTContract(await MockNFT.getAddress(), true);
    });

    it("Contract Deployment Check", async () => {
        await expect(await ArcadiansBadge.getAddress()).not.equal(undefined);
        await expect(await MockNFT.getAddress()).not.equal(undefined);
    });

    it("Arcadians NFT contract support added", async () => {
        await expect(await ERC6551Manager.supportedNFTContracts(await MockNFT.getAddress())).to.be
            .true;
    });

    it("Arcadians Badges Access Control Check", async () => {
        const MANAGER_ROLE = await ArcadiansBadge.MANAGER_ROLE();
        const MINTER_ROLE = await ArcadiansBadge.MINTER_ROLE();
        const BURNER_ROLE = await ArcadiansBadge.BURNER_ROLE();

        await expect(await ArcadiansBadge.hasRole(MANAGER_ROLE, await deployer.getAddress())).to.be
            .true;
        await expect(await ArcadiansBadge.hasRole(MINTER_ROLE, await deployer.getAddress())).to.be
            .true;
        await expect(await ArcadiansBadge.hasRole(BURNER_ROLE, await deployer.getAddress())).to.be
            .true;
    });

    it("Check grant role flow", async () => {
        const MANAGER_ROLE = await ArcadiansBadge.MANAGER_ROLE();
        await ArcadiansBadge.grantRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ArcadiansBadge.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.true;
    });

    it("Check revoke role flow", async () => {
        const MANAGER_ROLE = await ArcadiansBadge.MANAGER_ROLE();
        await ArcadiansBadge.revokeRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ArcadiansBadge.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.false;
    });

    it("Random user should be prevented from calling functions which requires manager role", async () => {
        await expect(ArcadiansBadge.connect(userOne).setBaseURI(baseURI)).to.be.reverted;
        await expect(
            ArcadiansBadge.connect(userOne).configureERC6551Manager(
                await ERC6551Manager.getAddress()
            )
        ).to.be.reverted;
        await expect(ArcadiansBadge.connect(userOne).configureBadgeType(badgeTypes[0], true)).to.be
            .reverted;
        await expect(
            ArcadiansBadge.connect(userOne).mint(await MockNFT.getAddress(), 1, badgeTypes[0])
        ).to.be.reverted;
        await expect(ArcadiansBadge.connect(userOne).burn(1, badgeTypes[0])).to.be.reverted;
    });

    it("Set invalid Base URI should revert", async () => {
        await expect(ArcadiansBadge.setBaseURI("")).to.be.reverted;
    });

    it("Set Base URI", async () => {
        await expect(await ArcadiansBadge.setBaseURI(baseURI)).not.to.be.reverted;
    });

    it("Check base URI exists", async () => {
        await expect(await ArcadiansBadge.baseURI()).equal(baseURI);
    });

    it("Mint Mock NFT", async () => {
        await MockNFT.safeMint(userOne);
        await expect(await MockNFT.balanceOf(userOne)).to.equal(1);

        await MockNFT.safeMint(userTwo);
        await expect(await MockNFT.balanceOf(userTwo)).to.equal(1);
    });

    it("Check Mock NFT tokenURI", async () => {
        await expect(await MockNFT.tokenURI(1)).to.equal(baseURI + "1");
    });

    it("Revert when a non supported badge is minted", async () => {
        await expect(ArcadiansBadge.mint(await MockNFT.getAddress(), 1, badgeTypes[0])).to.be
            .reverted;
    });

    it("Configure badge type", async () => {
        await expect(ArcadiansBadge.configureBadgeType(badgeTypes[0], true)).not.to.be.reverted;
        await expect(ArcadiansBadge.configureBadgeType(badgeTypes[1], true)).not.to.be.reverted;
        await expect(ArcadiansBadge.configureBadgeType(badgeTypes[2], true)).not.to.be.reverted;
        await expect(ArcadiansBadge.configureBadgeType(badgeTypes[3], true)).not.to.be.reverted;
    });

    it("Check for badge type configuration", async () => {
        await expect(await ArcadiansBadge.supportedBadgeTypes(badgeTypes[0])).to.be.true;
        await expect(await ArcadiansBadge.supportedBadgeTypes(badgeTypes[1])).to.be.true;
        await expect(await ArcadiansBadge.supportedBadgeTypes(badgeTypes[2])).to.be.true;
        await expect(await ArcadiansBadge.supportedBadgeTypes(badgeTypes[3])).to.be.true;
    });

    it("Mint Arcadians badge to NFT token bound account", async () => {
        await expect(await ArcadiansBadge.mint(await MockNFT.getAddress(), 1, badgeTypes[0])).not.to
            .be.reverted;
    });

    it("Check Arcadians Badge NFT tokenURI", async () => {
        await expect(await ArcadiansBadge.tokenURI(1)).to.equal(baseURI + badgeTypes[0]);
    });

    it("Dubplicate Arcadians badge cannot be minted to NFT token bound account", async () => {
        await expect(ArcadiansBadge.mint(await MockNFT.getAddress(), 1, badgeTypes[0])).to.be
            .reverted;
    });

    it("Prevent minting Arcadians badges to non supported NFT contracts", async () => {
        await expect(ArcadiansBadge.mint(randomAddress, 1, badgeTypes[0])).to.be.reverted;
    });

    it("Check arcadian SBT balanaces", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        await expect(await ArcadiansBadge.balanceOf(tokenBoundAccount)).to.equal(1);
        await expect(await ArcadiansBadge.userBadges(tokenBoundAccount, badgeTypes[0])).to.be.true;
    });

    it("Burn SBT token from token bound account", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        await expect(await ArcadiansBadge.mint(await MockNFT.getAddress(), 1, badgeTypes[1])).not.to
            .be.reverted;
        await expect(await ArcadiansBadge.balanceOf(tokenBoundAccount)).to.equal(2);
        await expect(await ArcadiansBadge.userBadges(tokenBoundAccount, badgeTypes[1])).to.be.true;

        await expect(await ArcadiansBadge.burn(2, badgeTypes[1])).not.to.be.reverted;
        await expect(await ArcadiansBadge.balanceOf(tokenBoundAccount)).to.equal(1);
        await expect(await ArcadiansBadge.userBadges(tokenBoundAccount, badgeTypes[1])).to.be.false;
    });

    it("Revert when a non supported badge is burned", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        await expect(ArcadiansBadge.configureBadgeType("test_badge_type", true)).not.to.be.reverted;
        await expect(await ArcadiansBadge.mint(await MockNFT.getAddress(), 1, "test_badge_type"))
            .not.to.be.reverted;
        await expect(await ArcadiansBadge.balanceOf(tokenBoundAccount)).to.equal(2);
        await expect(ArcadiansBadge.configureBadgeType("test_badge_type", false)).not.to.be
            .reverted;
        await expect(ArcadiansBadge.burn(2, "test_badge_type")).to.be.reverted;
    });

    it("Configure Invalid ERC6551 Manager contract which will revert other actions", async () => {
        await expect(await ArcadiansBadge.configureERC6551Manager(randomAddress)).not.to.be
            .reverted;
        await expect(ArcadiansBadge.mint(await MockNFT.getAddress(), 1, badgeTypes[2])).to.be
            .reverted;
    });

    it("Configure ERC6551 Manager contract", async () => {
        await expect(
            await ArcadiansBadge.configureERC6551Manager(await ERC6551Manager.getAddress())
        ).not.to.be.reverted;
    });

    it("Cannot configure zero address for ERC6551 Manager contract", async () => {
        await expect(ArcadiansBadge.configureERC6551Manager(ethers.ZeroAddress)).to.be.reverted;
    });

    it("Contract Upgradability version check (Version 1)", async () => {
        await expect(await ArcadiansBadge.version()).to.equal(1);
    });

    it("Contract Upgradability version check (Version 2)", async () => {
        ArcadiansBadgeFactoryV2 = await ethers.getContractFactory("ArcadiansBadgeV2");
        ArcadiansBadgeV2 = await upgrades.upgradeProxy(
            await ArcadiansBadge.getAddress(),
            ArcadiansBadgeFactoryV2
        );
        await expect(await ArcadiansBadgeV2.version()).to.equal(2);
    });

    it("Check for same proxy contract address after upgrades", async () => {
        await expect(await ArcadiansBadgeV2.getAddress()).to.equal(
            await ArcadiansBadge.getAddress()
        );
    });

    it("Arcadians Badges Access Control Check for Version 2", async () => {
        const MANAGER_ROLE = await ArcadiansBadgeV2.MANAGER_ROLE();
        const MINTER_ROLE = await ArcadiansBadgeV2.MINTER_ROLE();
        const BURNER_ROLE = await ArcadiansBadgeV2.BURNER_ROLE();

        await expect(await ArcadiansBadgeV2.hasRole(MANAGER_ROLE, await deployer.getAddress())).to
            .be.true;
        await expect(await ArcadiansBadgeV2.hasRole(MINTER_ROLE, await deployer.getAddress())).to.be
            .true;
        await expect(await ArcadiansBadgeV2.hasRole(BURNER_ROLE, await deployer.getAddress())).to.be
            .true;
    });

    it("Check for badge type configuration for Version 2", async () => {
        await expect(await ArcadiansBadgeV2.supportedBadgeTypes(badgeTypes[0])).to.be.true;
        await expect(await ArcadiansBadgeV2.supportedBadgeTypes(badgeTypes[1])).to.be.true;
        await expect(await ArcadiansBadgeV2.supportedBadgeTypes(badgeTypes[2])).to.be.true;
        await expect(await ArcadiansBadgeV2.supportedBadgeTypes(badgeTypes[3])).to.be.true;
    });

    it("Prevent account from transferring the badges", async () => {
        await expect(await ArcadiansBadgeV2.connect(userTwo).mintEOA(badgeTypes[0])).not.to.be
            .reverted;
        await expect(await ArcadiansBadgeV2.balanceOf(userTwo)).to.equal(1);

        await expect(
            ArcadiansBadgeV2.connect(userTwo).safeTransferFrom(
                await userTwo.getAddress(),
                await userOne.getAddress(),
                100
            )
        ).to.be.reverted;
    });
});
