import { expect } from "chai";
import { BytesLike } from "ethers/lib/utils";

export function shouldDeployWithInitialParameters(activity: string, measures: string[]): void {
  it("has the expected activity", async function () {
    const activityKey: BytesLike = await this.singlePlayerCommit.activityList(0);

    expect(await this.singlePlayerCommit.getActivityName(activityKey)).to.equal(activity);

  });

  it("has the expected measure", async function () {
    const activityKey: BytesLike = await this.singlePlayerCommit.activityList(0);

    expect(await this.singlePlayerCommit.getActivityMeasures(activityKey)).to.deep.equal(measures);
  });

  // TODO Create getActivity Ranges
  it.skip("has the expected activity range", async function () {
    expect(await this.this.singlePlayerCommit.getActivityRanges());
  });

  it("has the expected measure name", async function () {
    const measureKey: BytesLike = await this.singlePlayerCommit.measureList(0);

    expect(await this.singlePlayerCommit.getMeasureName(measureKey)).to.equal(measures[0]);
  });
}


export function shouldAllowUserToMakeCommitment(activity: string, measures: string[]): void {
  it.skip("create commitment", async function () {
    const activityKey: BytesLike = await this.singlePlayerCommit.activityList(0);

    expect(await this.singlePlayerCommit.getActivityName(activityKey)).to.equal(activity);

  })
}


export function shouldSettleCompletedCommitment(activity: string, measures: string[]): void {
  it.skip("payout when completing commitment", async function () {
    const activityKey: BytesLike = await this.singlePlayerCommit.activityList(0);

    expect(await this.singlePlayerCommit.getActivityName(activityKey)).to.equal(activity);

  })
}