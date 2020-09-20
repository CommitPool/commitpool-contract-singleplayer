import { expect } from "chai";
import { BytesLike } from "ethers/lib/utils";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function shouldDeployWithInitialParameters(): void {

  it("has the 'biking' activity and it is allowed", async function () {
    const activityKey: BytesLike = await this.singlePlayerCommit.activityList(0);
    const _activityName: string = await this.singlePlayerCommit.getActivityName(activityKey);

    const _activity = await this.singlePlayerCommit.allowedActivities(activityKey);

    expect(_activityName).to.equal('biking');
    expect(_activity['name']).to.equal(_activityName);
    // expect(_activity['measures'][0]).to.equal('km');
    // expect(_activity['ranges']).to.equal([2,1024]);
    expect(_activity['oracle']).to.be.properAddress;
    expect(_activity['allowed']).to.be.true;
    expect('getActivityName').to.be.calledOnContract(this.singlePlayerCommit);
  });

  //TODO Now expecting VM Runtime 'invalid opcode' error. 
  // Should/can this be prevented in contract while using dynamic arrays?
  it("has no other activities", async function () {
    let error;
    try{
      await this.singlePlayerCommit.activityList(1)
    } catch(err) {
      error = err;
    } finally {
      expect('activityList').to.be.calledOnContract(this.singlePlayerCommit);
      expect(error.results[error.hashes[0]]['error']).to.equal('invalid opcode');
    }
  });

  it("has the 'km' measure and it is allowed", async function () {
    const measureKey: BytesLike = await this.singlePlayerCommit.measureList(0);
    const activityMeasure: string[] = await this.singlePlayerCommit.allowedMeasures(measureKey); 

    expect(activityMeasure[0]).to.equal('km');
    expect(activityMeasure[1]).to.be.true;

  });

  it("has no other measures", async function () {
    let error;
    try{
      await this.singlePlayerCommit.measureList(1)
    } catch(err) {
      error = err;
    } finally {
      expect('measureList').to.be.calledOnContract(this.singlePlayerCommit);
      expect(error.results[error.hashes[0]]['error']).to.equal('invalid opcode');
    }
  });

}