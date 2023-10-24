const { expect } = require("chai");
const { ethers } = require("hardhat");
const { getTokenDeployableBytecodeAndSalt } = require("../test-helper");

describe("Omnichain ERC20 Testcases", function () {
    const chainIdSrc = 1;
    const chainIdDst = 2;
    const cap = "1000000";
    const amount = "1000000";
    const globalSupply = ethers.parseUnits("1000000", 18);

    let owner; 
    let userOne; 
    let userTwo; 
    let lzEndpointSrcMock;
    let lzEndpointDstMock;
    let OFTSrc; 
    let OFTDst;
    let LZEndpointMock;
    let TokenFactory;
    let dstPath;
    let srcPath;

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

    it("Base ERC20 Token Deployment should fail when invalid args are used", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");
        const amountInWei = ethers.parseUnits(amount, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [await owner.getAddress(), amountInWei + ethers.toBigInt(100), await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 1);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [capInWei, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [await owner.getAddress(), 0, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 2);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [0, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [await owner.getAddress(), amountInWei, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 3);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [capInWei, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [ethers.ZeroAddress, amountInWei, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 4);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [capInWei, ethers.ZeroAddress];
        initializerArgs = [await owner.getAddress(), amountInWei, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 5);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;
    })

    it("Child ERC20 Token Deployment should fail when invalid args are used", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");
        const amountInWei = ethers.parseUnits(amount, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointDstMock.getAddress()];
        initializerArgs = [await owner.getAddress(), amountInWei, await owner.getAddress(), false];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 6);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [0, await lzEndpointDstMock.getAddress()];
        initializerArgs = [await owner.getAddress(), 0, await owner.getAddress(), false,];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 7);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [capInWei, ethers.ZeroAddress];
        initializerArgs = [await owner.getAddress(), 0, await owner.getAddress(), false];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 8);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;

        constructorArgs = [capInWei, await lzEndpointDstMock.getAddress()];
        initializerArgs = [ethers.ZeroAddress, 0, await owner.getAddress(), false];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 9);
        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;
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
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 10);

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
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 11);

        const computedAddress = await TokenFactory.computeAddress(deployableSalt);
        await TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData);

        OFTDst = await ethers.getContractAt("ERC20Token", computedAddress, owner);

        expect(OFTDst).not.equal(undefined);
        expect(OFTDst).not.equal(null);
    })

    it("Base ERC20 Token cannot be deployed again on the same salt", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");
        const amountInWei = ethers.parseUnits(amount, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointSrcMock.getAddress()];
        initializerArgs = [await owner.getAddress(), amountInWei, await owner.getAddress(), true];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 10);

        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;
    })

    it("Child ERC20 Token cannot be deployed again on the same salt", async () => {
        const capInWei = ethers.parseUnits(cap, "ether");

        let constructorArgs = [];
        let initializerArgs = [];
        let deployableBytecode;
        let deployableSalt;

        constructorArgs = [capInWei, await lzEndpointDstMock.getAddress()];
        initializerArgs = [await owner.getAddress(), 0, await owner.getAddress(), false];
        [deployableSalt, deployableBytecode, initializeData] = await getTokenDeployableBytecodeAndSalt(constructorArgs, initializerArgs, 11);

        await expect(TokenFactory.determinsiticDeploy(0, deployableSalt, deployableBytecode, initializeData)).to.be.reverted;
    })

    it("Base ERC20 Token initializer function should be restricted to call after deployment", async () => {
        const amountInWei = ethers.parseUnits(amount, "ether");
        await expect(OFTSrc.initialize(await owner.getAddress(), amountInWei, await owner.getAddress(), true)).to.be.reverted;
    })

    it("Child ERC20 Token initializer function should be restricted to call after deployment", async () => {
        await expect(OFTSrc.initialize(await owner.getAddress(), 0, await owner.getAddress(), false)).to.be.reverted;
    })

    it("Base ERC20 Token owner should be the deployer", async () => {
        await expect(await OFTSrc.owner()).to.equal(await owner.getAddress());
    })

    it("Child ERC20 Token owner should be the deployer", async () => {
        await expect(await OFTSrc.owner()).to.equal(await owner.getAddress());
    })

    it("Check token base chain property", async () => {
        await expect(await OFTSrc.isBaseChain()).to.equal(true);
        await expect(await OFTDst.isBaseChain()).to.equal(false);
    })

    it("Set LZ bookkeeping endpoints", async () => {
        await expect(lzEndpointSrcMock.setDestLzEndpoint(await OFTDst.getAddress(), await lzEndpointDstMock.getAddress())).not.to.be.reverted;
        await expect(lzEndpointDstMock.setDestLzEndpoint(await OFTSrc.getAddress(), await lzEndpointSrcMock.getAddress())).not.to.be.reverted;
    })

    it("Config trusted remote for the Base ERC20 token", async () => {
        dstPath = ethers.solidityPacked(["address", "address"], [await OFTDst.getAddress(), await OFTSrc.getAddress()]);
        await expect(OFTSrc.setTrustedRemote(chainIdDst, dstPath)).not.to.be.reverted;
    })

    it("Config trusted remote for the Child ERC20 token", async () => {
        srcPath = ethers.solidityPacked(["address", "address"], [await OFTSrc.getAddress(), await OFTDst.getAddress()])
        await expect(OFTDst.setTrustedRemote(chainIdSrc, srcPath)).not.to.be.reverted;
    })

    it("Owner balance check before transfer of tokens from src to dst chain", async () => {
        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(globalSupply);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(0);
    })

    it("Check circulating supply of tokens before token transfer from src to dst chain", async () => {
        await expect(await OFTSrc.circulatingSupply()).to.be.equal(globalSupply);
        await expect(await OFTDst.circulatingSupply()).to.be.equal(0);
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

    it("Owner balance check after transfer of tokens from src to dst chain", async () => {
        const fund = ethers.parseUnits("1000", 18);
        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(globalSupply - fund);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(fund);
    })

    it("Check circulating supply of tokens after token transfer from src to dst chain", async () => {
        const fund = ethers.parseUnits("1000", 18);
        await expect(await OFTSrc.circulatingSupply()).to.be.equal(globalSupply - fund);
        await expect(await OFTDst.circulatingSupply()).to.be.equal(fund);
    })

    it("Transfer token from dst chain to src chain", async () => {
        const fund = ethers.parseUnits("100", 18);
        let nativeFee = (await OFTDst.estimateSendFee(chainIdSrc, await owner.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTDst.sendFrom(
            await owner.getAddress(),
            chainIdSrc,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        )).not.to.be.reverted;
    })

    it("Owner balance check after transfer of tokens from dst to src chain", async () => {
        const srcToDstFund = ethers.parseUnits("1000", 18);
        const dstToSrcFund = ethers.parseUnits("100", 18);
        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(globalSupply - (srcToDstFund - dstToSrcFund));
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(srcToDstFund - dstToSrcFund);
    })

    it("Check circulating supply of tokens after token transfer from dst to src chain", async () => {
        const srcToDstFund = ethers.parseUnits("1000", 18);
        const dstToSrcFund = ethers.parseUnits("100", 18);
        await expect(await OFTSrc.circulatingSupply()).to.be.equal(globalSupply - (srcToDstFund - dstToSrcFund));
        await expect(await OFTDst.circulatingSupply()).to.be.equal(srcToDstFund - dstToSrcFund);
    })

    it("Transfer insufficient token from dst chain to src chain should fail", async () => {
        const fund = ethers.parseUnits("100000000000000", 18);
        let nativeFee = (await OFTDst.estimateSendFee(chainIdSrc, await owner.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTDst.sendFrom(
            await owner.getAddress(),
            chainIdSrc,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        )).to.be.reverted;
    })

    it("Transfer tokens between same chain", async () => {
        const fund = ethers.parseUnits("100", 18);
        await expect(OFTDst.transfer(await userOne.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTSrc.transfer(await userOne.getAddress(), fund)).not.to.be.reverted;

        await expect(await OFTSrc.balanceOf(await userOne.getAddress())).to.be.equal(fund);
        await expect(await OFTDst.balanceOf(await userOne.getAddress())).to.be.equal(fund);
    })

    it("Token can be only pauased by owner of the contract", async () => {
        await expect(OFTDst.connect(userOne).pauseSendTokens(true)).to.be.reverted;
        await expect(OFTSrc.connect(userOne).pauseSendTokens(true)).to.be.reverted;
    })

    it("Pause the src and dst tokens", async () => {
        await expect(OFTDst.pauseSendTokens(true)).not.to.be.reverted;
        await expect(OFTSrc.pauseSendTokens(true)).not.to.be.reverted;
    })

    it("Transfer token from dst chain to src chain should fail when paused", async () => {
        const fund = ethers.parseUnits("100", 18);
        let nativeFee = (await OFTDst.estimateSendFee(chainIdSrc, await owner.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTDst.sendFrom(
            await owner.getAddress(),
            chainIdSrc,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        )).to.be.reverted;
    })

    it("Transfer token from src chain to dst chain should fail when paused", async () => {
        const fund = ethers.parseUnits("100", 18);
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
        )).to.be.reverted;
    })

    it("Transfer tokens between same chain should work even when the contract is paused", async () => {
        const fund = ethers.parseUnits("100", 18);
        await expect(OFTDst.transfer(await userOne.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTSrc.transfer(await userOne.getAddress(), fund)).not.to.be.reverted;
    })

    it("Token can be only unpaused by owner of the contract", async () => {
        await expect(OFTDst.connect(userOne).pauseSendTokens(false)).to.be.reverted;
        await expect(OFTSrc.connect(userOne).pauseSendTokens(false)).to.be.reverted;
    })

    it("Unpause the src and dst tokens", async () => {
        await expect(OFTDst.pauseSendTokens(false)).not.to.be.reverted;
        await expect(OFTSrc.pauseSendTokens(false)).not.to.be.reverted;
    })

    it("Transfer token from dst chain to src chain should after unpause", async () => {
        const fund = ethers.parseUnits("200", 18);
        let nativeFee = (await OFTDst.estimateSendFee(chainIdSrc, await owner.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTDst.sendFrom(
            await owner.getAddress(),
            chainIdSrc,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        )).not.to.be.reverted;
    })

    it("Transfer token from src chain to dst chain should after unpause", async () => {
        const fund = ethers.parseUnits("200", 18);
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

    it("Transfer tokens with approval in cross chain manner", async () => {
        const fund = ethers.parseUnits("200", 18);
        await expect(OFTDst.approve(await userOne.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTSrc.approve(await userOne.getAddress(), fund)).not.to.be.reverted;

        await expect(await OFTDst.allowance(await owner.getAddress(), await userOne.getAddress())).to.equal(fund);
        await expect(await OFTSrc.allowance(await owner.getAddress(), await userOne.getAddress())).to.equal(fund);

        await expect(await OFTSrc.balanceOf(await userTwo.getAddress())).to.be.equal(0);
        await expect(await OFTDst.balanceOf(await userTwo.getAddress())).to.be.equal(0);

        let nativeFeeSrc = (await OFTSrc.estimateSendFee(chainIdDst, await userTwo.getAddress(), fund, false, "0x")).nativeFee;
        let nativeFeeDst = (await OFTDst.estimateSendFee(chainIdSrc, await userTwo.getAddress(), fund, false, "0x")).nativeFee;

        await expect(OFTSrc.connect(userOne).sendFrom(
            await owner.getAddress(),
            chainIdDst,
            ethers.solidityPacked(["address"], [await userTwo.getAddress()]),
            fund,
            await userOne.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFeeSrc }
        )).not.to.be.reverted;

        await expect(OFTDst.connect(userOne).sendFrom(
            await owner.getAddress(),
            chainIdSrc,
            ethers.solidityPacked(["address"], [await userTwo.getAddress()]),
            fund,
            await userOne.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFeeDst }
        )).not.to.be.reverted;

        await expect(await OFTDst.allowance(await owner.getAddress(), await userOne.getAddress())).to.equal(0);
        await expect(await OFTSrc.allowance(await owner.getAddress(), await userOne.getAddress())).to.equal(0);

        await expect(await OFTSrc.balanceOf(await userTwo.getAddress())).to.be.equal(fund);
        await expect(await OFTDst.balanceOf(await userTwo.getAddress())).to.be.equal(fund);
    })

    it("Transfer tokens with approval within same chain", async () => {
        let ownerBalanceInSrc = await OFTSrc.balanceOf(await owner.getAddress());
        let ownerBalanceInDst = await OFTDst.balanceOf(await owner.getAddress());

        const fund = ethers.parseUnits("200", 18);
        await expect(OFTDst.connect(userTwo).approve(await owner.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTSrc.connect(userTwo).approve(await owner.getAddress(), fund)).not.to.be.reverted;

        await expect(await OFTDst.allowance(await userTwo.getAddress(), await owner.getAddress())).to.equal(fund);
        await expect(await OFTSrc.allowance(await userTwo.getAddress(), await owner.getAddress())).to.equal(fund);

        await expect(await OFTSrc.balanceOf(await userTwo.getAddress())).to.be.equal(fund);
        await expect(await OFTDst.balanceOf(await userTwo.getAddress())).to.be.equal(fund);

        await expect(OFTDst.transferFrom(await userTwo.getAddress(), await owner.getAddress(), fund)).not.to.be.reverted;
        await expect(OFTSrc.transferFrom(await userTwo.getAddress(), await owner.getAddress(), fund)).not.to.be.reverted;

        await expect(await OFTDst.allowance(await userTwo.getAddress(), await owner.getAddress())).to.equal(0);
        await expect(await OFTSrc.allowance(await userTwo.getAddress(), await owner.getAddress())).to.equal(0);

        await expect(await OFTSrc.balanceOf(await userTwo.getAddress())).to.be.equal(0);
        await expect(await OFTDst.balanceOf(await userTwo.getAddress())).to.be.equal(0);

        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInSrc + fund);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst + fund);
    })

    it("Cannot burn more than the token balance", async () => {
        let ownerBalanceInSrc = await OFTSrc.balanceOf(await owner.getAddress());
        let ownerBalanceInDst = await OFTDst.balanceOf(await owner.getAddress());

        const extra = ethers.parseUnits("100", 18);
        await expect(OFTSrc.burn(ownerBalanceInSrc + extra)).to.be.reverted;
        await expect(OFTDst.burn(ownerBalanceInDst + extra)).to.be.reverted;
    })

    it("Burn tokens in base and child chain", async () => {
        let ownerBalanceInSrc = await OFTSrc.balanceOf(await owner.getAddress());
        let ownerBalanceInDst = await OFTDst.balanceOf(await owner.getAddress());

        const fundToBeBurned = ethers.parseUnits("100", 18);
        await expect(OFTDst.burn(fundToBeBurned)).not.to.be.reverted;
        await expect(OFTSrc.burn(fundToBeBurned)).not.to.be.reverted;

        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInSrc - fundToBeBurned);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst - fundToBeBurned);
    })

    it("Simulate asset transfer failure in cross chain", async () => {
        const ownerBalanceInSrc = await OFTSrc.balanceOf(await owner.getAddress());
        const ownerBalanceInDst = await OFTDst.balanceOf(await owner.getAddress());

        // block receiving msgs on the dst lzEndpoint to simulate ua reverts which stores a payload
        await lzEndpointDstMock.blockNextMsg();

        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, '0x')).nativeFee

        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInSrc)
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst)

        await expect(
            OFTSrc.sendFrom(
                await owner.getAddress(),
                chainIdDst,
                ethers.solidityPacked(["address"], [await owner.getAddress()]),
                fund,
                await owner.getAddress(),
                ethers.ZeroAddress,
                '0x',
                { value: nativeFee }
            )
        ).not.to.be.reverted;

        await expect(await OFTSrc.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInSrc - fund);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst);
    })

    it("Check for the failed payload", async () => {
        await expect(await lzEndpointDstMock.hasStoredPayload(chainIdSrc, srcPath)).to.equal(true);
    })

    it("Check for the operation payload queue", async function () {
        await expect(await lzEndpointDstMock.getLengthOfQueue(chainIdSrc, srcPath)).to.equal(0);

        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, '0x')).nativeFee;

        // now that a msg has been stored, subsequent ones will not revert, but will get added to the queue
        await expect(
            OFTSrc.sendFrom(
                await owner.getAddress(),
                chainIdDst,
                ethers.solidityPacked(["address"], [await owner.getAddress()]),
                fund,
                await owner.getAddress(),
                ethers.ZeroAddress,
                '0x',
                { value: nativeFee }
            )
        ).not.to.be.reverted;

        await expect(await lzEndpointDstMock.getLengthOfQueue(chainIdSrc, srcPath)).to.equal(1);
    })

    it("retryPayload - delivers a stuck msg", async function () {
        const ownerBalanceInDst = await OFTDst.balanceOf(await owner.getAddress());

        const fund = ethers.parseUnits("1000", 18);
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst);

        const abiCoder = ethers.AbiCoder.defaultAbiCoder();

        const payload = abiCoder.encode(["uint16", "bytes", "uint256"], [0, await owner.getAddress(), fund])
        await expect(lzEndpointDstMock.retryPayload(chainIdSrc, srcPath, payload)).not.to.be.reverted;

        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(ownerBalanceInDst + fund);
    })

    it("forceResumeReceive() - removes msg", async function () {
        // block receiving msgs on the dst lzEndpoint to simulate ua reverts which stores a payload
        await lzEndpointDstMock.blockNextMsg();

        await expect(await lzEndpointDstMock.hasStoredPayload(chainIdSrc, srcPath)).to.equal(false);

        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, '0x')).nativeFee;

        await expect(
            OFTSrc.sendFrom(
                await owner.getAddress(),
                chainIdDst,
                ethers.solidityPacked(["address"], [await owner.getAddress()]),
                fund,
                await owner.getAddress(),
                ethers.ZeroAddress,
                '0x',
                { value: nativeFee }
            )
        ).not.to.be.reverted;

        await expect(await lzEndpointDstMock.hasStoredPayload(chainIdSrc, srcPath)).to.equal(true);

        // forceResumeReceive deletes the stuck msg
        await expect(OFTDst.forceResumeReceive(chainIdSrc, srcPath)).not.to.be.reverted;

        // stored payload gone
        await expect(await lzEndpointDstMock.hasStoredPayload(chainIdSrc, srcPath)).to.equal(false)
    })

    it("forceResumeReceive() - removes msg, delivers all msgs in the queue", async function () {
        // block receiving msgs on the dst lzEndpoint to simulate ua reverts which stores a payload
        await lzEndpointDstMock.blockNextMsg();

        const transactions = 3;
        const msgsInQueue = transactions - 1;

        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, '0x')).nativeFee;

        for (let i = 0; i < transactions; i++) {
            // first iteration stores a payload, the following get added to queue
            await OFTSrc.sendFrom(
                await owner.getAddress(),
                chainIdDst,
                ethers.solidityPacked(["address"], [await owner.getAddress()]),
                fund,
                await owner.getAddress(),
                ethers.ZeroAddress,
                '0x',
                { value: nativeFee }
            )
        }

        // msg queue is full
        // first transaction will block the operation
        // other transaction goes to queue, so 
        await expect(await lzEndpointDstMock.getLengthOfQueue(chainIdSrc, srcPath)).to.equal(msgsInQueue);

        // forceResumeReceive deletes the stuck msg
        await expect(OFTDst.forceResumeReceive(chainIdSrc, srcPath)).not.to.be.reverted;

        // msg queue is empty
        await expect(await lzEndpointDstMock.getLengthOfQueue(chainIdSrc, srcPath)).to.equal(0);
    })

    it("forceResumeReceive() - emptied queue is actually emptied and doesnt get double counted", async function () {
        // block receiving msgs on the dst lzEndpoint to simulate ua reverts which stores a payload
        await lzEndpointDstMock.blockNextMsg();

        const transactions = 3;
        const msgsInQueue = transactions - 1;

        const fund = ethers.parseUnits("1000", 18);
        let nativeFee = (await OFTSrc.estimateSendFee(chainIdDst, await owner.getAddress(), fund, false, '0x')).nativeFee;

        for (let i = 0; i < transactions; i++) {
            // first iteration stores a payload, the following get added to queue
            await OFTSrc.sendFrom(
                await owner.getAddress(),
                chainIdDst,
                ethers.solidityPacked(["address"], [await owner.getAddress()]),
                fund,
                await owner.getAddress(),
                ethers.ZeroAddress,
                '0x',
                { value: nativeFee }
            )
        }

        // msg queue is full
        await expect(await lzEndpointDstMock.getLengthOfQueue(chainIdSrc, srcPath)).to.equal(msgsInQueue);

        // forceResumeReceive deletes the stuck msg
        await expect(OFTDst.forceResumeReceive(chainIdSrc, srcPath)).not.to.be.reverted;

        const balance = await OFTDst.balanceOf(await owner.getAddress());

        // store a new payload which blocks the further transactions
        await lzEndpointDstMock.blockNextMsg()

        await OFTSrc.sendFrom(
            await owner.getAddress(),
            chainIdDst,
            ethers.solidityPacked(["address"], [await owner.getAddress()]),
            fund,
            await owner.getAddress(),
            ethers.ZeroAddress,
            '0x',
            { value: nativeFee }
        );

        // forceResumeReceive deletes msgs but since there's nothing in the queue
        await expect(OFTDst.forceResumeReceive(chainIdSrc, srcPath)).not.to.be.reverted;

        // balance after transfer remains the same
        await expect(await OFTDst.balanceOf(await owner.getAddress())).to.be.equal(balance);
    })
})