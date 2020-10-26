import { expect } from "chai";
import { BytesLike, solidityKeccak256 } from "ethers/lib/utils";

export function shouldDeployWithInitialParameters(): void {

  it("has the 'biking' and 'running' activity and it is allowed", async function () {
    const _activityNames: string[] = ["biking", "running"];
    const _activityKeys: BytesLike[] = [];
    const _activities = [];

    //Check biking
    _activityKeys.push(await this.singlePlayerCommit.activityList(0));

    //TODO Find the way to get the expected Keccak256 output matching the first key in the list
    // const _activityKey: BytesLike = solidityKeccak256(["string"], [_activityName]);
    // console.log("Activitykey: ", _activityKey )

    _activities.push(await this.singlePlayerCommit.allowedActivities(_activityKeys[0]));
    console.log("Activity returned: ", _activities[0])

    //Check running
    _activityKeys.push(await this.singlePlayerCommit.activityList(1));

    // const _activityKey2: BytesLike = solidityKeccak256(["string"], [_activities[1]]);
    // console.log("Activitykey: ", _activityKey2 )

    _activities.push(await this.singlePlayerCommit.allowedActivities(_activityKeys[1]));
    console.log("Activity returned: ", _activities[1])

    //Validate
    expect(_activities[0]['name']).to.equal(_activityNames[0]);
    expect(_activities[0]['oracle']).to.be.properAddress;
    expect(_activities[0]['allowed']).to.be.true;

    expect(_activities[1]['name']).to.equal(_activityNames[1]);
    expect(_activities[1]['oracle']).to.be.properAddress;
    expect(_activities[1]['allowed']).to.be.true;

  });

  it("has no other activities", async function () {
    await expect(
      this.singlePlayerCommit.activityList(2),
    ).to.be.reverted;
    
  });

}