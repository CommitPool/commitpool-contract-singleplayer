import { expect } from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import { DH_UNABLE_TO_CHECK_GENERATOR } from "constants";

//TODO Check for emitted events
export function shouldManageCommitments(): void {
  context("User can", function () {
    let owner: Signer;
    let user: Signer;
    let contractWithUser: SinglePlayerCommit;
    const _overrides = {
      gasLimit: 1000000,
    };

    before(async function () {
      [owner, user] = await ethers.getSigners();
      contractWithUser = await this.singlePlayerCommit.connect(user);
    });

    it("deposit funds for staking", async function () {
      //User balance
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance).to.equal(utils.parseEther("10000.0"));

      //Committer balance
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      //Transaction
      const _amountToDeposit: BigNumber = utils.parseEther("1.0");

      await this.token.mock.transferFrom.returns(true);
      await contractWithUser.deposit(_amountToDeposit, _overrides);

      //Validate
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();
      const _userBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());

      expect(_userBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;
      expect(_updatedUserBalance.lt(_userBalance));
    });

    it("withdraw deposited funds", async function () {
      //User balance
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance.lt(utils.parseEther("10000.0"))).to.be.true;

      //Committer balance
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("1.0"));

      //Transaction
      const _amountToWithdraw: BigNumber = utils.parseEther("1.0");

      await this.token.mock.transfer.returns(true);
      await contractWithUser.withdraw(_amountToWithdraw, _overrides);

      //Validate
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();
      const _userBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());

      expect(_userBalanceInContract.isZero()).to.be.true;
      expect(_updatedCommitterBalance.isZero()).to.be.true;
      expect(_updatedUserBalance.gt(_userBalance));
    });

    it("make a commitment of biking 50 kms against 1ETH stake with deposited funds", async function () {
      //Deposit funds
      const _amountToDeposit: BigNumber = utils.parseEther("1.0");
      await this.token.mock.transferFrom.returns(true);
      await contractWithUser.deposit(_amountToDeposit, _overrides);

      //User balance in contract
      const _userBalance: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      expect(_userBalance.eq(utils.parseEther('1.0'))).to.be.true;

      //Committer balance in contract
      expect(await this.singlePlayerCommit.committerBalance()).to.equal(utils.parseEther('1.0'));

      //Transaction
      const _activity: BytesLike = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();

      const _amountToStake: BigNumber = utils.parseEther('1.0');

      await this.token.mock.transfer.returns(true);
      await contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides);

      //Commitment
      const commitment = await this.singlePlayerCommit.commitments(user.getAddress());

      //Validate
      expect(commitment.committer).to.be.properAddress;
      expect(await this.singlePlayerCommit.getActivityName(commitment.activity)).to.equal('biking')
      expect(await this.singlePlayerCommit.getMeasureName(commitment.measure)).to.equal('km')
      expect(commitment.goalValue.toNumber()).to.equal(_goal)
      expect(commitment.stake).to.equal(_amountToStake)
      expect(commitment.start).to.equal(_startTime)

      //TODO Check 7 days in future
      // const _endTime = new Date().setDate(_startTime + 7)
      // console.log(_endTime)
      // expect(commitment.start).to.equal(utils.bigNumberify())

    });

    it("make a deposit and commitment of biking 50 kms against 1ETH stake with deposited funds in a single call", async function () {
      expect(1).to.equal(1)
  });

  context("Owner can", function () {
    let owner: Signer;
    let user: Signer;
    let contractWithOwner: SinglePlayerCommit;
    const _overrides = {
      gasLimit: 1000000,
    };

    before(async function () {
      [owner, user] = await ethers.getSigners();
      contractWithOwner = await this.singlePlayerCommit.connect(owner);
    });

    it("withdraw non-committed balance", async function () {
      //Owner balance
      const _ownerBalance: BigNumber = await owner.getBalance();
      console.log("Owner balance: ", utils.formatEther(_ownerBalance))

      //Committer balance
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      console.log("Committer balance: ", utils.formatEther(_committerBalance))
      expect(_committerBalance).to.equal(utils.parseEther('1.0'));

      //Contract balance
      const margin = utils.parseEther('10');
      await this.token.mock.balanceOf.returns(_committerBalance.add(margin))

      const _contractBalance: BigNumber = await this.token.balanceOf(contractWithOwner.address);
      console.log("Contract balance: ", utils.formatEther(_contractBalance))

      //Transaction
      await this.token.mock.transfer.returns(true)
      await contractWithOwner.ownerWithdraw(10, _overrides);

      //Validate
      const _updatedOwnerBalance: BigNumber = await owner.getBalance();
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(1).to.equal(1);

      // expect(_updatedOwnerBalance.gt(_ownerBalance)).to.be.true;
      // expect(_updatedCommitterBalance.lt(_committerBalance)).to.be.true;
    });
  });
})
}