require("@nomicfoundation/hardhat-toolbox")
require("./tasks")
require("dotenv").config()
require("@openzeppelin/hardhat-upgrades");
require("hardhat-deploy");
require("hardhat-contract-sizer");
require("@nomiclabs/hardhat-solhint");

const COMPILER_SETTINGS = {
    optimizer: {
        enabled: true,
        runs: 200,
    },
    metadata: {
        bytecodeHash: "none",
    },
}

const POLYGON_MAINNET_RPC_URL = process.env.POLYGON_MAINNET_RPC_URL;
const MUMBAI_RPC_URL = process.env.MUMBAI_RPC_URL;
const GOERLI_RPC_URL = process.env.GOERLI_RPC_URL;

const PRIVATE_KEY = process.env.PRIVATE_KEY;
const FORKING_BLOCK_NUMBER = parseInt(process.env.FORKING_BLOCK_NUMBER) || 0;
const POLYGONSCAN_API_KEY = process.env.POLYGONSCAN_API_KEY;
const REPORT_GAS = process.env.REPORT_GAS || false;

module.exports = {
    solidity: {
        compilers: [
            {
                version: "0.8.18",
                COMPILER_SETTINGS,
            },
        ],
    },
    networks: {
        hardhat: {
            chainId: 31337,
            forking: {
                url: GOERLI_RPC_URL,
                accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
                blockNumber: FORKING_BLOCK_NUMBER
            }
        },
        localhost: {
            chainId: 31337,
        },
        polygon: {
            url: POLYGON_MAINNET_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 137,
        },
        mumbai: {
            url: MUMBAI_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 80001,
        },
        goerli: {
            url: GOERLI_RPC_URL,
            accounts: PRIVATE_KEY ? [PRIVATE_KEY] : [],
            chainId: 5
        }
    },
    defaultNetwork: "hardhat",
    etherscan: {
        apiKey: {
            polygon: POLYGONSCAN_API_KEY,
            polygonMumbai: POLYGONSCAN_API_KEY,
        },
    },
    gasReporter: {
        enabled: REPORT_GAS,
        currency: "USD",
        outputFile: "gas-report.txt",
        noColors: true,
        // coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    },
    contractSizer: {
        runOnCompile: true,
    },
    paths: {
        sources: "./contracts",
        tests: "./test",
        cache: "./build/cache",
        artifacts: "./build/artifacts",
    },
    namedAccounts: {
        deployer: {
            default: 0,
            31337: 0, 
            80001: 0,
            5: 0,
        },
    },
    mocha: {
        timeout: 300000, // 300 seconds max for running tests
    },
}
