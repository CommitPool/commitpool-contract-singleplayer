//Setup
import { ethers } from "@nomiclabs/buidler";
import { BigNumberish, Signer, ContractFactory} from "ethers";

//Artifacts
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import daiArtifact from "./resources/DAI.json";
import chainLinkArtifact from "./resources/ChainLink.json";

//Test suites
import { shouldDeployWithInitialParameters } from "./SinglePlayerCommit.deploy";
import { userCanManageCommitments } from "./SinglePlayerCommit.user";
import { ownerCanManageContract } from "./SinglePlayerCommit.owner";

import bre from "@nomiclabs/buidler";
const waffle = bre.waffle;

setTimeout(async function () {
  describe("SinglePlayerCommit contract", async function () {
    let accounts: Signer[];
    let owner: Signer;

    const activity: string = "biking";
    const measures: string[] = ["km"];
    const ranges: BigNumberish[][] = [[2, 1024]];

    before(async function () {
      console.log("Setting up environment [provider, signers, mock contracts]")
      // ethers.provider = new MockProvider();
      accounts = await ethers.getSigners();
      owner = accounts[0];
      this.oracle = await waffle.deployMockContract(owner, chainLinkArtifact);
      this.token = await waffle.deployMockContract(owner, daiArtifact);

      console.log("Deploying SinglePlayerCommit with %s, %s, and %s", activity, measures, ranges[0]);
      const SinglePlayerCommit: ContractFactory = await ethers.getContractFactory("SinglePlayerCommit");

      this.singlePlayerCommit = (await SinglePlayerCommit.deploy(
        activity,
        measures,
        ranges,
        this.oracle.address,
        this.token.address,
      )) as SinglePlayerCommit;
      await this.singlePlayerCommit.deployed();

      console.log("SinglePlayerCommit deployed to ", this.singlePlayerCommit.address);

    });

    describe("Deployment was succesful if contract", function () {
      shouldDeployWithInitialParameters();
    });

    describe("Contract interactions", function () {
      ownerCanManageContract();
      userCanManageCommitments();
    });
  });

  run();
}, 1000);
