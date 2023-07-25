import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const deployDiamondContract: DeployFunction = async (hre: HardhatRuntimeEnvironment) => {
  const { getNamedAccounts, deployments } = hre;

  const { diamond } = deployments;
  const { deployer } = await getNamedAccounts();

  const diamondContract = await diamond.deploy("DiamondProxy", {
    from: deployer,
    owner: deployer,
    facets: ["InitialMessageFacet", "GetMessageFacet", "SetMessageFacet"],
    execute: {
      methodName: "setInitialMessage",
      args: ["Hello world!"],
    },
    log: true,
    waitConfirmations: 2,
  });

  console.log("Diamond contract: ", diamondContract.address);
};

export default deployDiamondContract;

// Tags are useful if you have multiple deploy files and only want to run one of them.
// e.g. yarn deploy --tags Diamond
deployDiamondContract.tags = ["Diamond"];
