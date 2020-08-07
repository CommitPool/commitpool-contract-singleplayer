import chai, { expect } from "chai";
import { MockProvider, deployContract, solidity } from "ethereum-waffle";

import SPCommitArtifact from "../artifacts/SinglePlayerCommit.json";

import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import { BigNumberish } from "ethers";
import { keccak256, toUtf8Bytes, BytesLike } from "ethers/lib/utils";

chai.use(solidity);

setTimeout(async function () {
  const provider = new MockProvider();
  const [ownerAcctObject, fakeChainlinkObject, fakeDaiObject, committerAcctObject] = provider.getWallets();

  describe("SinglePlayerCommit contract", function () {
    const activity: string = "biking";
    const measures: string[] = ["km"];
    const ranges: BigNumberish[][] = [[2, 1024]];

    beforeEach(async function () {
      console.log("deploying SPCommit with an activity, measures, and ranges");
      this.singlePlayerCommit = (await deployContract(ownerAcctObject, SPCommitArtifact, [
        activity,
        measures,
        ranges,
        fakeChainlinkObject.address, // TOD0: import actual chainlink contract
        fakeDaiObject.address, // TODO: import actual dai contract
      ])) as SinglePlayerCommit;
    });

    describe("Deployment", function () {
      it("Should deploy with the right parameters", async function () {
        // TODO split these into separate tests
        const activityKey: BytesLike = this.singlePlayerCommit.activityList(0);

        expect(await this.singlePlayerCommit.getActivityName(activityKey)).to.equal(activity);

        expect(await this.singlePlayerCommit.getActivityMeasures(activityKey)).to.equal(measures);

        expect(await this.this.singlePlayerCommit.getActivityRanges());

        const measureKey: BytesLike = this.singlePlayerCommit.measureList(0);

        expect(await this.singlePlayerCommit.getMeasureName(measureKey)).to.equal(measures[0]);

        // expect(1).to.eq(1);
      });
    });
  });

  run();
}, 1000);
