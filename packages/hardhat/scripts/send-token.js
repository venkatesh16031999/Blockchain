const { ethers, JsonRpcProvider } = require('ethers');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

let contractABI = [
    'function sendFrom(address _from, uint16 _dstChainId, bytes calldata _toAddress, uint _amount, address payable _refundAddress, address _zroPaymentAddress, bytes calldata _adapterParams) public payable',
    'function estimateSendFee(uint16 _dstChainId, bytes calldata _toAddress, uint _amount, bool _useZro, bytes calldata _adapterParams) public view returns (uint nativeFee, uint zroFee)'
];

const getGasLimitMax = (gasEstimation) => {
    const gasEstimationBuffer = 1.2;
    return BigInt(Math.round(Number(gasEstimation) * gasEstimationBuffer));
}

const getMaxFeePerGas = async (provider) => {
    return (await provider.getFeeData()).maxFeePerGas;
}

const erc20TokenAddress = "0xF615CE4645C46B92147fD3dB51a51E1823B19AF0";

// ================================================================================================ //

// Source chain config for mumbai
const SRC_CHAIN_NAME = "mumbai";
const CONTRACT_ADDRESS = erc20TokenAddress;

// // Source chain config for goerli
// const SRC_CHAIN_NAME = "goerli";
// const CONTRACT_ADDRESS = erc20TokenAddress;

// // Source chain config for sepolia
// const SRC_CHAIN_NAME = "sepolia";
// const CONTRACT_ADDRESS = erc20TokenAddress;

// // Source chain config for fuji
// const SRC_CHAIN_NAME = "fuji";
// const CONTRACT_ADDRESS = erc20TokenAddress;

// ================================================================================================ //

// // Destination chain config for mumbai
// const DST_CHAIN_NAME = "mumbai";
// const DST_CHAIN_ID = 10109;

// // Destination chain config for goerli
// const DST_CHAIN_NAME = "goerli";
// const DST_CHAIN_ID = 10121;

// Destination chain config for sepolia
const DST_CHAIN_NAME = "sepolia";
const DST_CHAIN_ID = 10161;

// // Destination chain config for fuji
// const DST_CHAIN_NAME = "fuji";
// const DST_CHAIN_ID = 10106;

// ================================================================================================ //

// Transaction config
const FROM_ADDRESS = "0xaD733B7055eCAebFb3B38626f0148c5d12158F03";
const TO_ADDRESS = "0xaD733B7055eCAebFb3B38626f0148c5d12158F03";
const AMOUNT = "250000000";

(async () => {
    try {
        let API_KEY;
        switch (SRC_CHAIN_NAME) {
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

        let contract = new ethers.Contract(CONTRACT_ADDRESS, contractABI, wallet);

        const fund = ethers.parseUnits(AMOUNT, 18);

        let nativeFee = (await contract.estimateSendFee(DST_CHAIN_ID, TO_ADDRESS, fund, false, "0x")).nativeFee;

        const gasEstimation = await contract.sendFrom.estimateGas(
            FROM_ADDRESS,
            DST_CHAIN_ID,
            ethers.solidityPacked(["address"], [TO_ADDRESS]),
            fund,
            FROM_ADDRESS,
            ethers.ZeroAddress,
            '0x',
            {
                value: nativeFee
            }
        );
        const gasLimitMax = getGasLimitMax(gasEstimation);
        const maxFeePerGas = await getMaxFeePerGas(provider);

        const transaction = await contract.sendFrom(
            FROM_ADDRESS,
            DST_CHAIN_ID,
            ethers.solidityPacked(["address"], [TO_ADDRESS]),
            fund,
            FROM_ADDRESS,
            ethers.ZeroAddress,
            '0x',
            {
                gasLimit: gasLimitMax,
                gasPrice: maxFeePerGas,
                value: nativeFee
            }
        );

        console.log(`${AMOUNT} of ARCD tokens transfered from ${SRC_CHAIN_NAME} to ${DST_CHAIN_NAME} => hash: ${transaction.hash} and nonce: ${transaction.nonce}`);
    } catch (error) {
        console.error(error);
    }
})();

