# 🏗 Scaffold-ETH 2 powered smart contract portfolio

This repository contains all the implementation contracts of various use cases that I have built or experimented with. Navigate to the different branches to check the contract implementation and play with the contracts using Scaffold Eth UI

Note: Few of the contracts implemented here are only for learning purposes and might not be production ready.
For those contracts, all the security best practices may or may not be followed due to time constraints.

### (In progress - Many smart contracts are yet to be added soon)

### DeFi:

1. Perpetual Futures smart contract (USDT Market) - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/defi/perpetual-contract)
2. Simple Decentralized Exchange Contract - [Click Here](https://github.com/venkatesh16031999/DEX-Contract-Eth-Scafold-2/tree/defi/dex-smart-contract)
3. Token Vesting (Cliff and Linear) - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/defi/token-vesting)
4. Staking Rewards (ERC20) - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/defi/staking-rewards)

### Governance:

1. DAO/Governance contract - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/governance/DAO)

### GameFi

1. Game Registry Contract - [Polygonscan](https://polygonscan.com/address/0xef404c4a2365831e97d1a545678d069d4d2e5220)
2. Tournament Contract - [Polygonscan](https://polygonscan.com/address/0xb3f86580ec10a9168c51b98c52991c2a0332bb58)
3. Game Inventory Contract - [Louper.dev](https://louper.dev/diamond/0x40678c11AB8E35Af60C2B597F80157a61dFCa38B?network=polygon)

### Account Abstraction (ERC4337):

1. Account Abstraction Transaction Flow: [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/erc4337/account-abstraction)
2. Smart Contract Wallet and Entry point contracts: [Click Here](https://github.com/venkatesh16031999/Account-Abstraction-Smart-Contracts)

### NFTs/ERC1155/ERC20

1. LayerZero Omnichain ERC20 token with Governance support: [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/ERC20/multichain-layerzero-token)
2. Arcadians Dynamic NFT Collection (ERC721) - [Louper.dev](https://louper.dev/diamond/0x40678c11AB8E35Af60C2B597F80157a61dFCa38B?network=polygon)
3. Equippable Cosmetics and Gears Collection (ERC1155) - [Louper.dev](https://louper.dev/diamond/0x12379B557eB3D05f2c453817C5e53290fc65Ce6e?network=polygon)
4. CryptoChillouts NFT collection (ERC721) - [Polygonscan](https://polygonscan.com/token/0xa200a54daed579fda6f5ed86de93047bd9d595d7)

### Token Bound Account Use Cases (ERC6551): 

1. Arcadians NFT Points with ERC6551 support - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/ERC6551/NFT-Experience-And-Reputation)
2. Arcadian NFT Soul bound badges with ERC6551 support - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/ERC6551/NFT-Experience-And-Reputation)

### Upgradable Contracts:

1. Basic Diamond Proxy Contract (EIP-2535) - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/upgradable/diamond-proxy-contract) 
2. Advanced Diamond Proxy Contracts - Check GameFi section -> Game Inventory Contract & NFT section -> Arcadians NFT Collection and Equippable Cosmetics and Gears Collection

### Low level EVM:

1. Assembly (Using YUL) - [Click Here](https://github.com/venkatesh16031999/Blockchain/tree/EVM/Assembly)

## Requirements to play with the contracts

Before you begin, you need to install the following tools:

- [Node (v18 LTS)](https://nodejs.org/en/download/)
- Yarn ([v1](https://classic.yarnpkg.com/en/docs/install/) or [v2+](https://yarnpkg.com/getting-started/install))
- [Git](https://git-scm.com/downloads)

## Quickstart

To get started with Scaffold-ETH 2, follow the steps below:

1. Clone this repo & install dependencies

```
git clone https://github.com/scaffold-eth/scaffold-eth-2.git
cd scaffold-eth-2
yarn install
```

2. Run a local network in the first terminal:

```
yarn chain
```

This command starts a local Ethereum network using Hardhat. The network runs on your local machine and can be used for testing and development. You can customize the network configuration in `hardhat.config.ts`.

3. On a second terminal, deploy the test contract:

```
yarn deploy
```

This command deploys a test smart contract to the local network. The contract is located in `packages/hardhat/contracts` and can be modified to suit your needs. The `yarn deploy` command uses the deploy script located in `packages/hardhat/deploy` to deploy the contract to the network. You can also customize the deploy script.

4. On a third terminal, start your NextJS app:

```
yarn start
```

Visit your app on: `http://localhost:3000`. You can interact with your smart contract using the contract component or the example ui in the frontend. You can tweak the app config in `packages/nextjs/scaffold.config.ts`.

Run smart contract test with `yarn hardhat:test`

- Edit your smart contract `YourContract.sol` in `packages/hardhat/contracts`
- Edit your frontend in `packages/nextjs/pages`
- Edit your deployment scripts in `packages/hardhat/deploy`
