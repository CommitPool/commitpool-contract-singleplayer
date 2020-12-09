import { expect } from "chai";
import { ethers, waffle } from "hardhat";
import { BigNumber, BytesLike, utils } from "ethers";

export function shouldDeployWithInitialParameters(): void {
  it("has the 'biking' and 'running' activity and it is allowed", async function () {
    // this.contract = await this.singlePlayerCommit.connect(this.signers.admin);

    const _activityNames: string[] = ["biking", "running"];
    const _activityKeys: BytesLike[] = [];
    const _activities: any = [];

    //Check biking
    await this.singlePlayerCommit
      .activityKeyList(0)
      .then((out: string) => _activityKeys.push(out))
      .catch((error: string) => console.log(error));
    await this.singlePlayerCommit
      .activities(_activityKeys[0])
      .then((out: any) => _activities.push(out))
      .catch((error: string) => console.log(error));

    //TODO Find the way to get the expected Keccak256 output matching the first key in the list
    // const _activityKey: BytesLike = solidityKeccak256(["string"], [_activityName]);
    // console.log("Activitykey: ", _activityKey )

    //Check running
    await this.singlePlayerCommit
      .activityKeyList(1)
      .then((out: string) => _activityKeys.push(out))
      .catch((error: string) => console.log(error));
    await this.singlePlayerCommit
      .activities(_activityKeys[1])
      .then((out: any) => _activities.push(out))
      .catch((error: string) => console.log(error));

    //Validate
    expect(_activities[0]["name"]).to.equal(_activityNames[0]);
    expect(_activities[0]['oracle']).to.be.properAddress;
    expect(_activities[0]["allowed"]).to.be.true;
    expect(_activities[0]["exists"]).to.be.true;

    expect(_activities[1]["name"]).to.equal(_activityNames[1]);
    expect(_activities[1]['oracle']).to.be.properAddress;
    expect(_activities[1]["allowed"]).to.be.true;
    expect(_activities[1]["exists"]).to.be.true;
  });

  it("has no other activities", async function () {
    await expect(this.singlePlayerCommit.activityKeyList(2)).to.be.reverted;
  });

  it("is aware of the ChainLink oracle contract", async function () {
    expect(await this.singlePlayerCommit.getChainlinkToken()).to.be.properAddress;
  });

  it("is aware of the DAI token contract", async function () {
    expect(await this.singlePlayerCommit.token()).to.be.properAddress;
  });

  it("has empty balances", async function () {
    const _tokenBalanceInContract: BigNumber = await this.singlePlayerCommit.totalCommitterBalance();
    const _slashedBalance: BigNumber = await this.singlePlayerCommit.slashedBalance();

    expect(_tokenBalanceInContract.eq(utils.parseEther("0.0"))).to.be.true;
    expect(_slashedBalance.eq(utils.parseEther("0.0"))).to.be.true;
  });
}
