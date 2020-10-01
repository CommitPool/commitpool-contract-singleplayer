//Setup
import chai from "chai";
import { ethers } from "@nomiclabs/buidler";
import { BigNumberish, Signer, ContractFactory} from "ethers";
import { deployMockContract, MockContract, MockProvider, solidity } from "ethereum-waffle";

//Artifacts
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import daiArtifact from "./resources/DAI.json";
import chainLinkArtifact from "./resources/ChainLink.json";

//Test suites
import { shouldDeployWithInitialParameters } from "./SinglePlayerCommit.deploy";
import { userCanManageCommitments } from "./SinglePlayerCommit.user";
import { ownerCanManageContract } from "./SinglePlayerCommit.owner";

chai.use(solidity);
const bre = require("@nomiclabs/buidler");

setTimeout(async function () {
  describe("SinglePlayerCommit contract", async function () {
    let accounts: Signer[];
    let owner: Signer;

    const activity: string = "biking";
    const measures: string[] = ["km"];
    const ranges: BigNumberish[][] = [[2, 1024]];

    before(async function () {
      console.log("Setting up environment [provider, signers, mock contracts]")
      ethers.provider = new MockProvider();
      accounts = await ethers.getSigners();
      owner = accounts[0];
      this.oracle = await deployMockContract(owner, chainLinkArtifact) as MockContract;
      this.token = await deployMockContract(owner, daiArtifact) as MockContract;

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
