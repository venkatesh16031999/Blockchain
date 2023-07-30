import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployPerpetualConfiguratorContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const PerpetualConfigurator = await deploy("PerpetualConfigurator", {
    from: deployer,
    args: ["0xdAC17F958D2ee523a2206206994597C13D831ec7", 50],
    log: true,
    autoMine: true,
    waitConfirmations: 2,
  });

  const perpetualConfiguratorContract = await ethers.getContractAt(
    "PerpetualConfigurator",
    PerpetualConfigurator.address,
  );

  await perpetualConfiguratorContract.addMarket(
    "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984",
    "0x553303d460EE0afB37EdFf9bE42922D8FF63220e",
  );

  console.log("Perpetual Configurator Contract Address: ", perpetualConfiguratorContract.address);
};

export default deployPerpetualConfiguratorContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployPerpetualConfiguratorContract.tags = ["PerptualConfigurator"];
