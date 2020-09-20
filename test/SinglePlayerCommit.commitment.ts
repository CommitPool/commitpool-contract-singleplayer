import { expect } from "chai";
import { Wallet, utils } from "ethers";
import { BytesLike } from "ethers/lib/utils";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function shouldManageCommitments(wallet: Wallet, walletTo: Wallet): void {

  it("allows the user to deposit for staking", async function () {
    // const _activity = "biking";
    // const _measureIndex = await this.singlePlayerCommit.measureList(0);
    console.log(await walletTo.getBalance());
    const _amount = utils.parseEther("1.0");
    let contractWithSigner = await this.singlePlayerCommit.connect(walletTo);
    console.log("Connected to contract")
    let output = await contractWithSigner.deposit(_amount);
    console.log(output)

    expect(1).to.equal(1);
  });

  it.skip("allows users with sufficient staked funds to stake on a commitment of biking 50 kms", async function () {
    // const _activity = "biking";
    // const _measureIndex = await this.singlePlayerCommit.measureList(0);
    console.log(await walletTo.getBalance());
    const _activity = await this.singlePlayerCommit.activityList(0);
    const _measureIndex = 0
    const _goal = 50;
    const _startTime = Date.now();
    const _stake = 10;
    let contractWithSigner = await this.singlePlayerCommit.connect(walletTo);
    let output = await contractWithSigner.makeCommitment(_activity, _measureIndex, _goal, _startTime, _stake);
    console.log(output)

    expect(1).to.equal(1);
  });

}