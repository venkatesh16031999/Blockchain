import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts } = hre;

  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const timeLockDeployTx = await deploy("TimeLock", {
    from: deployer,
    args: [3600, [], []],
    log: true,
    waitConfirmations: 1,
  });

  log("Timelock contract adress: ", timeLockDeployTx.address);
};

module.exports = deploy;
deploy.tags = ["all", "TimeLock"];
