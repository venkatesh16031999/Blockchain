import { HardhatRuntimeEnvironment } from "hardhat/types";
import { DeployFunction } from "hardhat-deploy/types";

const deployDexContract: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy } = hre.deployments;

  const token1 = await deploy("ERC20Token", {
    from: deployer,
    args: ["ERC20_Token_1", "TK1"],
    log: true,
    autoMine: true,
    waitConfirmations: 2,
  });

  const token2 = await deploy("ERC20Token", {
    from: deployer,
    args: ["ERC20_Token_2", "TK2"],
    log: true,
    autoMine: true,
    waitConfirmations: 2,
  });

  const dexContract = await deploy("Dex", {
    from: deployer,
    args: [token1.address, token2.address],
    log: true,
    autoMine: true,
    waitConfirmations: 2,
  });

  console.log("ERC20 Token One Address: ", token1.address);
  console.log("ERC20 Token Two Address: ", token2.address);
  console.log("Dex Contract Address: ", dexContract.address);
};

export default deployDexContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags YourContract
deployDexContract.tags = ["Dex"];
