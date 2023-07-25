import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deploy: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { deployments, getNamedAccounts, ethers } = hre;

  const { deployer } = await getNamedAccounts();
  const { deploy, log } = deployments;

  const governanceTokenTransaction = await deploy("GovernanceToken", {
    from: deployer,
    args: ["GovernanceToken", "GT"],
    log: true,
    waitConfirmations: 1,
  });

  log("Governance token contract adress: ", governanceTokenTransaction.address);

  const governanceToken = await ethers.getContract("GovernanceToken", deployer);
  log("Token Name: ", await governanceToken.name());

  log("Token Supply: ", (await governanceToken.totalSupply()).toString());

  log("Voting power before delegation: ", (await governanceToken.getVotes(deployer)).toString());

  const delegateTx = await governanceToken.delegate(deployer);

  await delegateTx.wait(1);

  log("Voting power after delegation: ", (await governanceToken.getVotes(deployer)).toString());
};

module.exports = deploy;
deploy.tags = ["all", "GovernanceToken"];
