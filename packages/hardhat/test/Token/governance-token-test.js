const { expect } = require("chai");
const { ethers } = require("hardhat");
const { mine } = require("@nomicfoundation/hardhat-network-helpers");
const { getTokenDeployableBytecodeAndSalt } = require("../test-helper");

describe("Governance ERC20 Testcases", function () {
    const chainIdSrc = 1;
    const chainIdDst = 2;
    const cap = "2000";
    const amount = "2000";
    let owner; 
    let userOne; 
    let userTwo; 
    let lzEndpointSrcMock;
    let lzEndpointDstMock;
    let OFTSrc; 
    let OFTDst;
    let TokenFactory;
    let pastTimestamp;

    before(async function () {
        [owner, userOne, userTwo] = await ethers.getSigners();

        const TokenFactoryFactory = await ethers.getContractFactory("TokenFactory");
        LZEndpointMock = await ethers.getContractFactory("LZEndpointMock");

        let tokenFactoryTx = await TokenFactoryFactory.deploy(await owner.getAddress());
        let lzEndpointSrcMockTx = await LZEndpointMock.deploy(chainIdSrc);
        let lzEndpointDstMockTx = await LZEndpointMock.deploy(chainIdDst);

        TokenFactory = await tokenFactoryTx.waitForDeployment();
        lzEndpointSrcMock = await lzEndpointSrcMockTx.waitForDeployment();
        lzEndpointDstMock = await lzEndpointDstMockTx.waitForDeployment();
    })

    it("Base ERC20 Token Deployment", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");
        const amountInWei = ethers.parseUnits(amount, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [await owner.getAddress(), amountInWei, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 1);

        const computedAddress = await TokenFactory.computeAddress(deployableSalt);
        await TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData);

        OFTSrc = await ethers.getContractAt("ERC20Token", computedAddress, owner);

        expect(OFTSrc).not.equal(undefined);
        expect(OFTSrc).not.equal(null);
    })

    it("Child ERC20 Token Deployment", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointDstMock.getAddress()];
        initializerArgs = [await owner.getAddress(), 0, await owner.getAddress(), false];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 2);

        const computedAddress = await TokenFactory.computeAddress(deployableSalt);
        await TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData);

        OFTDst = await ethers.getContractAt("ERC20Token", computedAddress, owner);

        expect(OFTDst).not.equal(undefined);
        expect(OFTDst).not.equal(null);
    })

    it("Config trusted remote for the Base ERC20 token", async () => {
        dstPath = ethers.solidityPacked(["address", "address"], [await OFTDst.getAddress(), await OFTSrc.getAddress()]);
        await expect(OFTSrc.setTrustedRemote(chainIdDst, dstPath)).not.to.be.reverted;
    })

    it("Config trusted remote for the Child ERC20 token", async () => {
        srcPath = ethers.solidityPacked(["address", "address"], [await OFTSrc.getAddress(), await OFTDst.getAddress()])
        await expect(OFTDst.setTrustedRemote(chainIdSrc, srcPath)).not.to.be.reverted;
    })

    it("Set LZ bookkeeping endpoints", async () => {
        await expect(lzEndpointSrcMock.setDestLzEndpoint(await OFTDst.getAddress(), await lzEndpointDstMock.getAddress())).not.to.be.reverted;
        await expect(lzEndpointDstMock.setDestLzEndpoint(await OFTSrc.getAddress(), await lzEndpointSrcMock.getAddress())).not.to.be.reverted;
    })

    it("Transfer token from src chain to dst chain", async () => {
        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTSrc.sendFrom(
            await owner.getAddress(),
            chainIdDst,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        )).not.to.be.reverted;
    })

    it("Delegate token to the deployer", async () => {
        // delegate the voting power to the self
        await expect(OFTSrc.delegate(await owner.getAddress())).not.to.be.reverted;
        await expect(OFTDst.delegate(await owner.getAddress())).not.to.be.reverted;
        pastTimestamp = await OFTSrc.clock();
        await mine(1000);
    })

    it("Check deployer token delegation", async () => {
        await expect(await OFTSrc.delegates(await owner.getAddress())).to.equal(await owner.getAddress());
        await expect(await OFTDst.delegates(await owner.getAddress())).to.equal(await owner.getAddress());
    })

    it("Delegate the voting power to other user", async () => {
        // delegate the voting power to other user
        await expect(OFTSrc.delegate(await userOne.getAddress())).not.to.be.reverted;
        await expect(OFTDst.delegate(await userOne.getAddress())).not.to.be.reverted;
    })

    it("Check other user token delegation", async () => {
        await expect(await OFTSrc.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());
        await expect(await OFTDst.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());
    })

    it("Check the number of checkpoints", async () => {
        // check the number of checkpoints / snapshots taken
        await expect(await OFTSrc.numCheckpoints(await owner.getAddress())).to.equal(2);
        await expect(await OFTDst.numCheckpoints(await owner.getAddress())).to.equal(2);
    })

    it("Check the current voting power", async () => {
        await expect(await OFTSrc.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("1000", 18));
        await expect(await OFTDst.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("1000", 18));
    })

    it("Check the voting power after the token transfer", async () => {
        const fund = ethers.parseUnits("500", 18);
        await expect(OFTSrc.transfer(await userTwo.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTDst.transfer(await userTwo.getAddress(), fund)).not.to.be.reverted;

        await expect(await OFTSrc.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("500", 18));
        await expect(await OFTDst.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("500", 18));
    })

    it("Check the voting power after transfering all the tokens", async () => {
        const fund = ethers.parseUnits("500", 18);

        // trasnfer the remaining tokens
        await expect(OFTSrc.transfer(await userTwo.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTDst.transfer(await userTwo.getAddress(), fund)).not.to.be.reverted;
        
        // check the current voting power 
        await expect(await OFTSrc.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("0", 18));
        await expect(await OFTDst.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("0", 18));

        // check the current delegatee
        await expect(await OFTSrc.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());
        await expect(await OFTDst.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());

        // re-transfer the funds again
        await expect(OFTSrc.connect(userTwo).transfer(await owner.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTDst.connect(userTwo).transfer(await owner.getAddress(), fund)).not.to.be.reverted;

        // check the latest voting power 
        await expect(await OFTSrc.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("500", 18));
        await expect(await OFTDst.getVotes(await userOne.getAddress())).to.equal(ethers.parseUnits("500", 18));

        // check the current delegatee
        await expect(await OFTSrc.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());
        await expect(await OFTDst.delegates(await owner.getAddress())).to.equal(await userOne.getAddress());
    })

    it("Check the past voting power of owner", async () => {
        // check the past voting power of the deployer
        await expect(await OFTSrc.getPastVotes(await owner.getAddress(), pastTimestamp)).to.equal(ethers.parseUnits("1000", 18));
        await expect(await OFTDst.getPastVotes(await owner.getAddress(), pastTimestamp)).to.equal(ethers.parseUnits("1000", 18));
    })
})