import { HardhatRuntimeEnvironment } from "hardhat/types";

module.exports = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre;

  const { deploy } = deployments;
  const { deployer } = await getNamedAccounts();

  const contract = await deploy("StakingRewards", {
    from: deployer,
    args: ["<owner_address>", "<reward_distributor>", "<reward_token>", "<staking_token>", "<duration_in_days>"],
    log: true,
  });

  console.log("Contract Address: ", contract.address);
};

module.exports.tags = ["StakingRewards"];
