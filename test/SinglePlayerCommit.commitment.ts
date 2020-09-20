import { ethers } from "@nomiclabs/buidler";
import { expect } from "chai";
import { MockProvider } from "ethereum-waffle";
import { Wallet, utils } from "ethers";
import { BytesLike } from "ethers/lib/utils";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function shouldManageCommitments(provider: MockProvider): void {
  const [contractWallet, userWallet] = provider.getWallets();

  context('user can', function () {
    it("deposit funds for staking", async function () {
      const contract = this.singlePlayerCommit;

      const contractWithUser = await contract.connect(userWallet);
      console.log("Connected to contract with wallet: " + userWallet.address)

      const _amountToDeposit = utils.parseEther("1.0");
      const _overrides = {
        gasLimit: 100000,
      };

      //TODO Error: revert Mock on the method is not initialized
      expect(await contractWithUser.deposit(_amountToDeposit, _overrides)).to.equal(true);
      console.log('deposited funds')

      const _committerBalance = await contract.committerBalance.call();
      console.log(_committerBalance);

      expect(_committerBalance).to.equal(_amountToDeposit)
      expect('_deposit').to.be.calledOnContract(contract);
      expect('_changeCommitterBalance').to.be.calledOnContract(contract);
    });

    it.skip('withdraw deposited funds', async function () {
      expect(1).to.equal(1);
    });

    it.skip("make a commitment of biking 50 kms against stake with deposited funds", async function () {
      // const _activity = "biking";
      // const _measureIndex = await this.singlePlayerCommit.measureList(0);
      const contractWithSigner = await this.singlePlayerCommit.connect(userWallet);

      console.log(await userWallet.getBalance());
      const _activity = await this.singlePlayerCommit.activityList(0);
      const _measureIndex = 0
      const _goal = 50;
      const _startTime = Date.now();
      const _stake = 10;
      await contractWithSigner.makeCommitment(_activity, _measureIndex, _goal, _startTime, _stake);

      expect(1).to.equal(1);
    });
  });


}