const contracts = {
  31337: [
    {
      chainId: "31337",
      name: "localhost",
      contracts: {
        Sample: {
          address: "0xfB12F7170FF298CDed84C793dAb9aBBEcc01E798",
          abi: [
            {
              inputs: [],
              name: "hello_world",
              outputs: [
                {
                  internalType: "string",
                  name: "",
                  type: "string",
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
