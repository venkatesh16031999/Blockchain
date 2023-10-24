const fs = require("fs").promises;
const { ethers, JsonRpcProvider } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let contractABI = [
    'function setTrustedRemoteAddress(uint16 _remoteChainId, bytes calldata _remoteAddress) external'
];

const getGasLimitMax = (gasEstimation) => {
    const gasEstimationBuffer = 1.2;
    return BigInt(Math.round(Number(gasEstimation) * gasEstimationBuffer));
}

const getMaxFeePerGas = async (provider) => {
    return (await provider.getFeeData()).maxFeePerGas;
}

const registerRemote = async (chainName, contractAddress, connectedChains) => {
    try {
        let API_KEY;
        switch (chainName) {
            case "polygon":
                API_KEY = process.env.POLYGON_RPC_URL;
                break;
            case "ethereum":
                API_KEY = process.env.ETHEREUM_RPC_URL;
                break;
            case "avalanche":
                API_KEY = process.env.AVALANCHE_RPC_URL;
                break;
            case "mumbai":
                API_KEY = process.env.MUMBAI_RPC_URL;
                break;
            case "sepolia":
                API_KEY = process.env.SEPOLIA_RPC_URL;
                break;
            case "goerli":
                API_KEY = process.env.GOERLI_RPC_URL;
                break;
            case "fuji":
                API_KEY = process.env.FUJI_RPC_URL;
                break;
            default:
                throw new Error("Unsupport network");
        }

        let provider = new JsonRpcProvider(API_KEY);
        let privateKey = process.env.PRIVATE_KEY;
        let wallet = new ethers.Wallet(privateKey, provider);

        let contract = new ethers.Contract(contractAddress, contractABI, wallet);

        for await (let connectedChainInfo of connectedChains) {
            if (connectedChainInfo.skip) continue;
            const gasEstimation = await contract.setTrustedRemoteAddress.estimateGas(connectedChainInfo.lzChainId, connectedChainInfo.address);
            const gasLimitMax = getGasLimitMax(gasEstimation);
            const maxFeePerGas = await getMaxFeePerGas(provider);

            const transaction = await contract.setTrustedRemoteAddress(connectedChainInfo.lzChainId, connectedChainInfo.address, { 
                gasLimit: gasLimitMax, 
                gasPrice: maxFeePerGas 
            });

            console.log(`Trusted remote (${connectedChainInfo.name}) added for ${chainName} => hash: ${transaction.hash} and nonce: ${transaction.nonce}`);
        }
    } catch (error) {
        console.error(error);
    }
}

(async () => {
    const exisitingConfig = JSON.parse(await fs.readFile("../config/erc20-token-bridge-register-config.json", "utf8"));

    for await (const [chainName, chainInfo] of Object.entries(exisitingConfig)) {
        if (chainInfo.skip) continue;
        await registerRemote(chainName, chainInfo.address, chainInfo.connectedChains);
    }
})();

