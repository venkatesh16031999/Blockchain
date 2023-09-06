const { ethers, upgrades, network } = require("hardhat");
const { expect } = require("chai");
const fs = require("fs").promises;

describe("Arcadians Points Unit Test Cases", () => {
    let ArcadiansPoints;
    let MockNFT;
    let randomAddress = "0xbac03987459fe5a0528d15a5fce946dcae71f003";
    let deployer;
    let userOne;
    let ERC6551Manager;
    let ERC6551Registry;
    let ERC6551AccountImplementation;
    let ERC6551Salt;
    let ArcadiansPointsV2;

    before(async () => {
        [deployer, userOne, userTwo] = await ethers.getSigners();

        const exisitingConfig = JSON.parse(await fs.readFile("utils/config.json", "utf8"));
        const { registry, implementation, salt } = exisitingConfig[network.config.chainId].ERC6551;

        ERC6551Registry = registry;
        ERC6551AccountImplementation = implementation;
        ERC6551Salt = salt; // 0 is a Official TBA salt

        ERC6551ManagerFactory = await ethers.getContractFactory("ERC6551Manager");
        MockNFTFactory = await ethers.getContractFactory("MockNFT");
        ArcadiansPointsFactory = await ethers.getContractFactory("ArcadiansPoints");

        MockNFT = await upgrades.deployProxy(MockNFTFactory, [], { kind: "uups" });

        ERC6551Manager = await upgrades.deployProxy(
            ERC6551ManagerFactory,
            [ERC6551Registry, ERC6551AccountImplementation, ERC6551Salt],
            { kind: "uups" }
        );

        ArcadiansPoints = await upgrades.deployProxy(
            ArcadiansPointsFactory,
            ["ArcadiansPoints", "AP", await ERC6551Manager.getAddress()],
            { kind: "uups" }
        );

        await ERC6551Manager.configureNFTContract(await MockNFT.getAddress(), true);
    });

    it("Contract Deployment Check", async () => {
        await expect(await ArcadiansPoints.getAddress()).not.equal(undefined);
        await expect(await MockNFT.getAddress()).not.equal(undefined);
    });

    it("Arcadians NFT contract support added", async () => {
        await expect(await ERC6551Manager.supportedNFTContracts(await MockNFT.getAddress())).to.be
            .true;
    });

    it("Arcadians Points Access Control Check", async () => {
        const MANAGER_ROLE = await ArcadiansPoints.MANAGER_ROLE();
        const MINTER_ROLE = await ArcadiansPoints.MINTER_ROLE();
        const BURNER_ROLE = await ArcadiansPoints.BURNER_ROLE();

        const manager = await ArcadiansPoints.getRoleMember(MANAGER_ROLE, 0);
        const minter = await ArcadiansPoints.getRoleMember(MINTER_ROLE, 0);
        const burner = await ArcadiansPoints.getRoleMember(BURNER_ROLE, 0);

        expect(manager).to.equal(await deployer.getAddress());
        expect(minter).to.equal(await deployer.getAddress());
        expect(burner).to.equal(await deployer.getAddress());
    });

    it("Check grant role flow", async () => {
        const MANAGER_ROLE = await ArcadiansPoints.MANAGER_ROLE();
        await ArcadiansPoints.grantRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ArcadiansPoints.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.true;
    });

    it("Check revoke role flow", async () => {
        const MANAGER_ROLE = await ArcadiansPoints.MANAGER_ROLE();
        await ArcadiansPoints.revokeRole(MANAGER_ROLE, await userOne.getAddress());

        const hasRole = await ArcadiansPoints.hasRole(MANAGER_ROLE, await userOne.getAddress());

        expect(hasRole).to.be.false;
    });

    it("Random user should be prevented from calling functions which requires manager role", async () => {
        await expect(ArcadiansPoints.connect(userOne).mint(await MockNFT.getAddress(), 1, 1)).to.be
            .reverted;
        await expect(ArcadiansPoints.connect(userOne).burn(await MockNFT.getAddress(), 1, 1)).to.be
            .reverted;
        await expect(
            ArcadiansPoints.connect(userOne).configureERC6551Manager(
                await ERC6551Manager.getAddress()
            )
        ).to.be.reverted;
    });

    it("Configure Max NFT points", async () => {
        await expect(await ArcadiansPoints.configureMaxPointsPerNFT(ethers.parseEther("62000"))).not.to.be.reverted;
    })

    it("Should Fail if configuring Max NFT points is less than previous", async () => {
        await expect(ArcadiansPoints.configureMaxPointsPerNFT(ethers.parseEther("61000"))).to.be.reverted;
    })

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

    it("Mint Arcadians point to NFT token bound account", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("100"));

        await expect(await ArcadiansPoints.balanceOf(tokenBoundAccount)).to.equal(
            ethers.parseEther("100")
        );
    });

    it("Cannot mint arcadians point to NFT token bound account beyond the max limit", async () => {
        await expect(ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("63000"))).to.be.reverted;
    })

    it("Prevent minting Arcadians points to non supported NFT contracts", async () => {
        await expect(ArcadiansPoints.mint(randomAddress, 1, ethers.parseEther("100"))).to.be
            .reverted;
    });

    it("Configure Invalid ERC6551 Manager contract which will revert other actions", async () => {
        await expect(await ArcadiansPoints.configureERC6551Manager(randomAddress)).not.to.be
            .reverted;
        await expect(ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("100")))
            .to.be.reverted;
    });

    it("Configure ERC6551 Manager contract", async () => {
        await expect(
            await ArcadiansPoints.configureERC6551Manager(await ERC6551Manager.getAddress())
        ).not.to.be.reverted;
    });

    it("Cannot configure zero address for ERC6551 Manager contract", async () => {
        await expect(ArcadiansPoints.configureERC6551Manager(ethers.ZeroAddress)).to.be.reverted;
    });

    it("Check NFT level: Novice", async () => {
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("100"));

        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(0);
    });

    it("Check NFT level: Sparkbearer", async () => {
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("1000"));

        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(1);
    });

    it("Check NFT level: Shardspeaker", async () => {
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("2400"));

        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(2);
    });

    it("Check NFT level: Guidestar", async () => {
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("7800"));

        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(3);
    });

    it("Check NFT level: Fatesmith", async () => {
        await ArcadiansPoints.mint(await MockNFT.getAddress(), 1, ethers.parseEther("27600"));

        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(4);
    });

    it("Check NFT level name: Fatesmith", async () => {
        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(await ArcadiansPoints.getArcadiansLevelName(NFTLevel)).to.equal("Fatesmith");
    });

    it("Check all NFT level names", async () => {
        await expect(await ArcadiansPoints.getArcadiansLevelName(0)).to.equal("Novice");
        await expect(await ArcadiansPoints.getArcadiansLevelName(1)).to.equal("Sparkbearer");
        await expect(await ArcadiansPoints.getArcadiansLevelName(2)).to.equal("Shardspeaker");
        await expect(await ArcadiansPoints.getArcadiansLevelName(3)).to.equal("Guidestar");
        await expect(await ArcadiansPoints.getArcadiansLevelName(4)).to.equal("Fatesmith");
    });

    it("Burn Arcadians point from NFT token bound account", async () => {
        const tokenBoundAccount = await ERC6551Manager.getTokenBoundAccount(
            await MockNFT.getAddress(),
            1
        );
        await ArcadiansPoints.burn(await MockNFT.getAddress(), 1, ethers.parseEther("100"));

        await expect(await ArcadiansPoints.balanceOf(tokenBoundAccount)).to.equal(
            ethers.parseEther("38900")
        );
    });

    it("Check NFT level downgrade after burning the tokens", async () => {
        const [NFTLevel] = await ArcadiansPoints.getArcadianLevel(await MockNFT.getAddress(), 1);
        await expect(NFTLevel).to.equal(3);
    });

    it("Check non manager wallet cannot mint arcadians points to NFT token bound account", async () => {
        await expect(
            ArcadiansPoints.connect(userOne).mint(
                await MockNFT.getAddress(),
                1,
                ethers.parseEther("100")
            )
        ).to.be.reverted;
    });

    it("Check non manager wallet cannot burn arcadians points from NFT token bound account", async () => {
        await expect(
            ArcadiansPoints.connect(userOne).burn(
                await MockNFT.getAddress(),
                1,
                ethers.parseEther("100")
            )
        ).to.be.reverted;
    });

    it("Contract Upgradability version check (Version 1)", async () => {
        await expect(await ArcadiansPoints.version()).to.equal(1);
    });

    it("Contract Upgradability version check (Version 2)", async () => {
        ArcadiansPointsFactoryV2 = await ethers.getContractFactory("ArcadiansPointsV2");
        ArcadiansPointsV2 = await upgrades.upgradeProxy(
            await ArcadiansPoints.getAddress(),
            ArcadiansPointsFactoryV2
        );
        await expect(await ArcadiansPointsV2.version()).to.equal(2);
    });

    it("Check for same proxy contract address after upgrades", async () => {
        await expect(await ArcadiansPointsV2.getAddress()).to.equal(
            await ArcadiansPoints.getAddress()
        );
    });

    it("Arcadians Points Access Control Check for Version 2", async () => {
        const MANAGER_ROLE = await ArcadiansPointsV2.MANAGER_ROLE();
        const MINTER_ROLE = await ArcadiansPointsV2.MINTER_ROLE();
        const BURNER_ROLE = await ArcadiansPointsV2.BURNER_ROLE();

        const manager = await ArcadiansPointsV2.getRoleMember(MANAGER_ROLE, 0);
        const minter = await ArcadiansPointsV2.getRoleMember(MINTER_ROLE, 0);
        const burner = await ArcadiansPointsV2.getRoleMember(BURNER_ROLE, 0);

        expect(manager).to.equal(await deployer.getAddress());
        expect(minter).to.equal(await deployer.getAddress());
        expect(burner).to.equal(await deployer.getAddress());
    });

    it("Prevent account from transferring the points", async () => {
        await ArcadiansPointsV2.mintEOA(await userTwo.getAddress(), ethers.parseEther("100"));

        const pointsBalance = await ArcadiansPoints.balanceOf(await userTwo.getAddress());
        expect(pointsBalance).to.equal(ethers.parseEther("100"));

        await expect(
            ArcadiansPointsV2.transfer(await userOne.getAddress(), ethers.parseEther("50"))
        ).to.be.reverted;
    });
});
