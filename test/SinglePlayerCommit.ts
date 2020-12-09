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

    const supportedActivities: string[] = ["biking", "running"];

    before(async function () {
      console.log("Setting up environment [provider, signers, mock contracts]")
      accounts = await ethers.getSigners();
      owner = accounts[0];
      this.oracle = await waffle.deployMockContract(owner, chainLinkArtifact);
      this.token = await waffle.deployMockContract(owner, daiArtifact);

      console.log("Deploying SinglePlayerCommit with %s", supportedActivities);
      const SinglePlayerCommit: ContractFactory = await ethers.getContractFactory("SinglePlayerCommit");

      this.singlePlayerCommit = (await SinglePlayerCommit.deploy(
        supportedActivities,
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
