import { expect } from "chai";
import { BytesLike, solidityKeccak256 } from "ethers/lib/utils";

export function shouldDeployWithInitialParameters(): void {

  it("has the 'biking' and 'cycling' activity and it is allowed", async function () {
    //Check biking
    const _activityName: string = "biking";
    const _firstKey: BytesLike = await this.singlePlayerCommit.activityList(0);

    //TODO Find the way to get the expected Keccak256 output matching the first key in the list
    // const _activityKey: BytesLike = solidityKeccak256(["string"], [_activityName]);
    // console.log("Activitykey: ", _activityKey )

    const _activity = await this.singlePlayerCommit.allowedActivities(_firstKey);
    console.log("Activity returned: ", _activity)

    //Check running
    const _activityName2: string = "running";
    const _secondKey: BytesLike = await this.singlePlayerCommit.activityList(1);

    const _activityKey2: BytesLike = solidityKeccak256(["string"], [_activityName2]);
    console.log("Activitykey: ", _activityKey2 )

    const _activity2 = await this.singlePlayerCommit.allowedActivities(_secondKey);
    console.log("Activity returned: ", _activity2)

    //Validate
    expect(_activity['name']).to.equal(_activityName);
    expect(_activity['oracle']).to.be.properAddress;
    expect(_activity['allowed']).to.be.true;

    expect(_activity2['name']).to.equal(_activityName2);
    expect(_activity2['oracle']).to.be.properAddress;
    expect(_activity2['allowed']).to.be.true;

  });

  it("has no other activities", async function () {
    await expect(
      this.singlePlayerCommit.activityList(2),
    ).to.be.revertedWith("Transaction reverted without a reason")
    
  });

}