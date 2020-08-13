import chai from "chai";
import { MockProvider, deployContract, deployMockContract, solidity } from "ethereum-waffle";

import SPCommitArtifact from "../artifacts/SinglePlayerCommit.json";
import daiArtifact from "./resources/DAI.json";
import chainLinkArtifact from "./resources/ChainLink.json";

import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import { BigNumberish } from "ethers";
import { shouldDeployWithInitialParameters } from "./SinglePlayerCommit.behavior";

chai.use(solidity);

setTimeout(async function () {
  const provider = new MockProvider();
  const [wallet] = provider.getWallets();

  describe("SinglePlayerCommit contract", function () {
    const activity: string = "biking";
    const measures: string[] = ["km"];
    const ranges: BigNumberish[][] = [[2, 1024]];

    before(async function () {
      console.log("Setting up mock objects");
      const mockChainLink = await deployMockContract(wallet, chainLinkArtifact);
      const mockDAI = await deployMockContract(wallet, daiArtifact);

      console.log("Deploying SPCommit with an activity, measures, and ranges");
      this.singlePlayerCommit = (await deployContract(wallet, SPCommitArtifact, [
        activity,
        measures,
        ranges,
        mockChainLink.address,
        mockDAI.address,
      ])) as SinglePlayerCommit;
    });

    describe("deployment was succesful", function () {
      shouldDeployWithInitialParameters(activity, measures);
    });
  });

  run();
}, 1000);
