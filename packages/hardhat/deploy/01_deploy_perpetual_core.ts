import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";
import { ethers } from "hardhat";

const deployPerpetualCoreContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const perpetualConfiguratorContract = await ethers.getContract("PerpetualConfigurator");

  console.log("Perpetual Configurator Contract Address: ", perpetualConfiguratorContract.address);

  const perpetualConfigurator = await deploy("PerpetualCore", {
    from: deployer,
    args: [perpetualConfiguratorContract.address],
    log: true,
    autoMine: true,
    waitConfirmations: 2,
  });

  console.log("Perpetual Core Contract Address: ", perpetualConfigurator.address);
};

export default deployPerpetualCoreContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployPerpetualCoreContract.tags = ["PerptualCore"];
