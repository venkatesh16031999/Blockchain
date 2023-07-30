const contracts = {
  31337: [
    {
      chainId: "31337",
      name: "localhost",
      contracts: {
        PerpetualConfigurator: {
          address: "0x96E303b6D807c0824E83f954784e2d6f3614f167",
          abi: [
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_baseMarketTokenAddress",
                  type: "address",
                },
                {
                  internalType: "uint16",
                  name: "_baseFee",
                  type: "uint16",
                },
              ],
              stateMutability: "nonpayable",
              type: "constructor",
            },
            {
              inputs: [],
              name: "InsufficientFunds",
              type: "error",
            },
            {
              inputs: [],
              name: "InvalidPercentage",
              type: "error",
            },
            {
              inputs: [],
              name: "LevrageNotSupported",
              type: "error",
            },
            {
              inputs: [],
              name: "UnsupportedMarket",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "ZeroAddress",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_token",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "_priceFeed",
                  type: "address",
                },
              ],
              name: "addMarket",
              outputs: [],
              stateMutability: "nonpayable",
              type: "function",
            },
            {
              inputs: [],
              name: "baseMarketTokenAddress",
              outputs: [
                {
                  internalType: "contract IERC20Token",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_token",
                  type: "address",
                },
              ],
              name: "getTokenPriceFeed",
              outputs: [
                {
                  internalType: "address",
                  name: "priceFeed",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "isMarketSupported",
              outputs: [
                {
                  internalType: "bool",
                  name: "",
                  type: "bool",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "tokenPriceFeeds",
              outputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
          ],
        },
        PerpetualCore: {
          address: "0xd3b893cd083f07Fe371c1a87393576e7B01C52C6",
          abi: [
            {
              inputs: [
                {
                  internalType: "contract PerpetualConfigurator",
                  name: "_configuratorAddress",
                  type: "address",
                },
              ],
              stateMutability: "nonpayable",
              type: "constructor",
            },
            {
              inputs: [],
              name: "InsufficientFunds",
              type: "error",
            },
            {
              inputs: [],
              name: "InvalidPercentage",
              type: "error",
            },
            {
              inputs: [],
              name: "LevrageNotSupported",
              type: "error",
            },
            {
              inputs: [],
              name: "UnsupportedMarket",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "",
                  type: "address",
                },
              ],
              name: "ZeroAddress",
              type: "error",
            },
            {
              inputs: [
                {
                  internalType: "address",
                  name: "_userAddress",
                  type: "address",
                },
                {
                  internalType: "address",
                  name: "_collateralToken",
                  type: "address",
                },
                {
                  internalType: "uint256",
                  name: "_postionSize",
                  type: "uint256",
                },
              ],
              name: "increasePosition",
              outputs: [
                {
                  internalType: "uint256",
                  name: "",
                  type: "uint256",
                },
              ],
              stateMutability: "view",
              type: "function",
            },
          ],
        },
      },
    },
  ],
} as const;

export default contracts;
