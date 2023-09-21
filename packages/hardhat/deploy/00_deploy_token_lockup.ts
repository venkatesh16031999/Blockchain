import { HardhatRuntimeEnvironment } from "hardhat/types";

module.exports = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = await deploy("TokenLockup", {
    from: deployer,
    args: ["<token_address>", "<name>", "<symbol>", "<min_timelock_amount>", "<max_release_delay>"],
    log: true,
  });

  console.log("Contract Address: ", contract.address);
};

module.exports.tags = ["TokenLockup"];
