//Setup
import chai from "chai";
import { ethers } from "@nomiclabs/buidler";
import { BigNumberish, Signer, ContractFactory } from "ethers";
import { deployMockContract, MockContract, solidity } from "ethereum-waffle";

//Artifacts
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import daiArtifact from "./resources/DAI.json";
import chainLinkArtifact from "./resources/ChainLink.json";

//Test suites
import { shouldDeployWithInitialParameters } from "./SinglePlayerCommit.deploy";
import { shouldManageCommitments } from "./SinglePlayerCommit.commitment";

chai.use(solidity);

setTimeout(async function () {
  describe("SinglePlayerCommit contract", async function () {
    let accounts: Signer[];
    let owner: Signer;
    const activity: string = "biking";
    const measures: string[] = ["km"];
    const ranges: BigNumberish[][] = [[2, 1024]];

    before(async function () {
      console.log("Getting accounts");
      accounts = await ethers.getSigners();
      owner = accounts[0];
      console.log("Owner set to ", await owner.getAddress());

      console.log("Setting up mock objects for ChainLink and DAI");
      this.oracle = await deployMockContract(owner, chainLinkArtifact) as MockContract;
      this.token = await deployMockContract(owner, daiArtifact) as MockContract;

      console.log("Deploying SPCommit with %s, %s, and %s", activity, measures, ranges[0]);
      const SinglePlayerCommit: ContractFactory = await ethers.getContractFactory("SinglePlayerCommit");

      this.singlePlayerCommit = (await SinglePlayerCommit.deploy(
        activity,
        measures,
        ranges,
        this.oracle.address,
        this.token.address,
      )) as SinglePlayerCommit;
      await this.singlePlayerCommit.deployed();

      console.log("SinglePlayerCommit contract deployed to ", this.singlePlayerCommit.address);

    });

    describe("Deployment was succesful if contract", function () {
      shouldDeployWithInitialParameters();
    });

    describe("Commitments can be managed", function () {
      shouldManageCommitments();
    });
  });

  run();
}, 1000);
