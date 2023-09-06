const { ethers, upgrades, network } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs").promises;
const { TokenboundClient } = require("@tokenbound/sdk");

const formatAddress = (address) => {
    return String(address).toLowerCase();
};

describe("ERC6551 Manager Unit Test Cases", () => {
    let ERC6551Manager;
    let deployer;
    let userOne;
    let MockNFT;
    let randomAddress = "0xbac03987459fe5a0528d15a5fce946dcae71f003";
    let ERC6551Registry;
    let ERC6551AccountImplementation;
    let ERC6551Salt;
    let ERC6551ManagerFactoryV2;
    let ERC6551ManagerV2;

    before(async () => {
        [deployer, userOne, userTwo] = await ethers.getSigners();

        const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));
        const { registry, implementation, salt } = exisitingConfig[network.config.chainId].ERC6551;

        ERC6551Registry = registry;
        ERC6551AccountImplementation = implementation;
        ERC6551Salt = salt; // 0 is a Official TBA salt

        ERC6551ManagerFactory = await ethers.getContractFactory("ERC6551Manager");
        MockNFTFactory = await ethers.getContractFactory("MockNFT");

        MockNFT = await upgrades.deployProxy(MockNFTFactory, [], { kind: "uups" });
        ERC6551Manager = await upgrades.deployProxy(
            ERC6551ManagerFactory,
            [ERC6551Registry, ERC6551AccountImplementation, ERC6551Salt],
            { kind: "uups" }
        );
    });

    it("ERC6551 Manager Contract Deployment Check", async () => {
        expect(await ERC6551Manager.getAddress()).not.equal(undefined);
        expect(await MockNFT.getAddress()).not.equal(undefined);
    });

    it("Add NFT contract support", async () => {
        await expect(await ERC6551Manager.configureNFTContract(await MockNFT.getAddress(), true))
            .not.to.be.reverted;
        await expect(await ERC6551Manager.supportedNFTContracts(await MockNFT.getAddress())).to.be
            .true;
    });

    it("ERC6551 Manager configuration check", async () => {
        await expect(await ERC6551Manager.erc6551Salt()).to.equal(ERC6551Salt);
        await expect(formatAddress(await ERC6551Manager.erc6551RegistryAddress())).to.equal(
            formatAddress(ERC6551Registry)
        );
        await expect(formatAddress(await ERC6551Manager.erc6551ImplementationAddress())).to.equal(
            formatAddress(ERC6551AccountImplementation)
        );
    });

    it("ERC6551 Manager Access Control Check", async () => {
        const MANAGER_ROLE = await ERC6551Manager.MANAGER_ROLE();

        const manager = await ERC6551Manager.getRoleMember(MANAGER_ROLE, 0);

        await expect(manager).to.equal(await deployer.getAddress());
    });

    it("Check grant role flow", async () => {
        const MANAGER_ROLE = await ERC6551Manager.MANAGER_ROLE();
        await ERC6551Manager.grantRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ERC6551Manager.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.true;
    });

    it("Check revoke role flow", async () => {
        const MANAGER_ROLE = await ERC6551Manager.MANAGER_ROLE();
        await ERC6551Manager.revokeRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ERC6551Manager.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.false;
    });

    it("Random user should be prevented from calling the functions which requires manager role", async () => {
        await expect(ERC6551Manager.connect(userOne).configureNFTContract(ethers.ZeroAddress, true))
            .to.be.reverted;
        await expect(ERC6551Manager.connect(userOne).setupERC6551Registry(ethers.ZeroAddress)).to.be
            .reverted;
        await expect(ERC6551Manager.connect(userOne).setupERC6551Implementation(ethers.ZeroAddress))
            .to.be.reverted;
        await expect(ERC6551Manager.connect(userOne).setupERC6551Salt(ERC6551Salt)).to.be.reverted;
    });

    it("Prevent configuring non-compatibile NFT contract", async () => {
        await expect(ERC6551Manager.configureNFTContract(randomAddress, true)).to.be.reverted;
    });

    it("Configure ERC6551 implementation address", async () => {
        await expect(ERC6551Manager.setupERC6551Implementation(ethers.ZeroAddress)).to.be.reverted;
        await ERC6551Manager.setupERC6551Implementation(randomAddress);
        await expect(formatAddress(await ERC6551Manager.erc6551ImplementationAddress())).to.equal(
            formatAddress(randomAddress)
        );
        await ERC6551Manager.setupERC6551Implementation(ERC6551AccountImplementation);
        await expect(formatAddress(await ERC6551Manager.erc6551ImplementationAddress())).to.equal(
            formatAddress(ERC6551AccountImplementation)
        );
    });

    it("Configure ERC6551 registry address", async () => {
        await expect(ERC6551Manager.setupERC6551Registry(ethers.ZeroAddress)).to.be.reverted;
        await ERC6551Manager.setupERC6551Registry(randomAddress);
        await expect(formatAddress(await ERC6551Manager.erc6551RegistryAddress())).to.equal(
            formatAddress(randomAddress)
        );
        await ERC6551Manager.setupERC6551Registry(ERC6551Registry);
        await expect(formatAddress(await ERC6551Manager.erc6551RegistryAddress())).to.equal(
            formatAddress(ERC6551Registry)
        );
    });

    it("Configure ERC6551 salt", async () => {
        await ERC6551Manager.setupERC6551Salt(1);
        await expect(await ERC6551Manager.erc6551Salt()).to.equal(1);
        await ERC6551Manager.setupERC6551Salt(ERC6551Salt);
        await expect(await ERC6551Manager.erc6551Salt()).to.equal(ERC6551Salt);
    });

    it("Mint Mock NFT", async () => {
        await MockNFT.safeMint(userOne);
        await expect(await MockNFT.balanceOf(userOne)).to.equal(1);

        await MockNFT.safeMint(userTwo);
        await expect(await MockNFT.balanceOf(userTwo)).to.equal(1);
    });

    it("Check Mock NFT tokenURI", async () => {
        await expect(await MockNFT.tokenURI(1)).to.equal(
            "https://arcadians.dev.outplay.games/v2/arcadians/1"
        );
    });

    it("Check token bound account for NFT", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        expect(tokenBoundAccount).not.to.equal(undefined);
    });

    it("Deploy token bound account for a NFT", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );

        const tokenboundClient = new TokenboundClient({
            signer: deployer,
            chainId: network.config.chainId,
        });

        const deployedTokenBoundAccount = await tokenboundClient.createAccount({
            tokenContract: await MockNFT.getAddress(),
            tokenId: "1",
        });

        expect(tokenBoundAccount).to.equal(deployedTokenBoundAccount);
    });

    // It is not working in local network.
    // it("Check NFT token bound account validity", async (done) => {
    //     const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(await MockNFT.getAddress(), 1);

    //     const tokenboundClient = new TokenboundClient({ signer: deployer, chainId: network.config.chainId });

    //     console.log(tokenBoundAccount);

    //     const isAccountDeployed = await tokenboundClient.checkAccountDeployment({
    //         accountAddress: tokenBoundAccount,
    //     })

    //     console.log(isAccountDeployed)
    // })

    it("Contract Upgradability version check (Version 1)", async () => {
        await expect(await ERC6551Manager.version()).to.equal(1);
    });

    it("Contract Upgradability version check (Version 2)", async () => {
        ERC6551ManagerFactoryV2 = await ethers.getContractFactory("ERC6551ManagerV2");
        ERC6551ManagerV2 = await upgrades.upgradeProxy(
            await ERC6551Manager.getAddress(),
            ERC6551ManagerFactoryV2
        );
        await expect(await ERC6551ManagerV2.version()).to.equal(2);
    });

    it("Check for same proxy contract address after upgrades", async () => {
        await expect(await ERC6551ManagerV2.getAddress()).to.equal(
            await ERC6551Manager.getAddress()
        );
    });

    it("ERC6551ManagerV2 configuration check for Version 2", async () => {
        await expect(await ERC6551ManagerV2.erc6551Salt()).to.equal(ERC6551Salt);
        await expect(formatAddress(await ERC6551ManagerV2.erc6551RegistryAddress())).to.equal(
            formatAddress(ERC6551Registry)
        );
        await expect(formatAddress(await ERC6551ManagerV2.erc6551ImplementationAddress())).to.equal(
            formatAddress(ERC6551AccountImplementation)
        );
    });

    it("ERC6551ManagerV2 Access Control Check for Version 2", async () => {
        const MANAGER_ROLE = await ERC6551ManagerV2.MANAGER_ROLE();

        const manager = await ERC6551ManagerV2.getRoleMember(MANAGER_ROLE, 0);

        expect(manager).to.equal(await deployer.getAddress());
    });
});
