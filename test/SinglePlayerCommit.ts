import chai from "chai";
import { MockProvider, deployContract, deployMockContract, solidity } from "ethereum-waffle";

import SPCommitArtifact from "../artifacts/SinglePlayerCommit.json";
import daiArtifact from "./resources/DAI.json";
import chainLinkArtifact from "./resources/ChainLink.json";

import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import { BigNumberish } from "ethers";
import { shouldDeployWithInitialParameters } from "./SinglePlayerCommit.deploy";
import { shouldManageCommitments } from './SinglePlayerCommit.commitment';

chai.use(solidity);

setTimeout(async function () {
  describe("SinglePlayerCommit contract", function () {
    const provider: MockProvider = new MockProvider()
    const [wallet, walletTo] = provider.getWallets();
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

    describe("Deployment was succesful if contract", function () {
      shouldDeployWithInitialParameters();
    });

    describe("Commitments can be managed", function () {
      shouldManageCommitments(provider);
    });
  });

  run();
}, 1000);
