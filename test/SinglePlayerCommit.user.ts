import { expect } from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function userCanManageCommitments(): void {
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

    it("deposit 100 DAI for staking", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance).to.equal(utils.parseEther("10000.0"));
      const _userDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("0.0"));

      //Committer balance on contract
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      //Transaction to deposit
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(this.singlePlayerCommit, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Validate balances
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedUserBalance.lt(_userBalance));
      expect(_updatedUserDaiBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;
    });

    it("withdraw 100 DAI from deposited funds", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance.lt(utils.parseEther("10000.0"))).to.be.true;
      const _userDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("100.0"));

      //Committer balance on contract
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("100.0"));

      //Transaction
      const _amountToWithdraw: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transfer.returns(true);
      await expect(contractWithUser.withdraw(_amountToWithdraw, _overrides))
        .to.emit(this.singlePlayerCommit, "Withdrawal")
        .withArgs(await user.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);

      //Validate
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract.isZero()).to.be.true;
      expect(_updatedCommitterBalance.isZero()).to.be.true;
    });

    it("not make a commitment without deposited funds", async function () {
      //Transaction
      const _activity: string = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - insufficient token balance");
    });

    it("not make a commitment with invalid parameters", async function () {
      //Transaction to deposit funds
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(this.singlePlayerCommit, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Default parameters
      let _activity: BytesLike = await this.singlePlayerCommit.activityList(0);
      let _measureIndex: number = 0;
      let _goal: number = 50;
      let _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      //Activity
      _activity = '0xb16dfc4a050ca7e77c1c5f443dc473a2f03ac722e25f721ab6333875f44984f2';

      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - activity doesn't exist or isn't allowed");
      _activity = await this.singlePlayerCommit.activityList(0);

      //Measure
      _measureIndex = 1;

      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - measure index out of bounds");
      _measureIndex = 0;

      //Goal
      _goal = 1;

      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - goal is too low");

      _goal = 9999;

      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - goal is too high");

      _goal = 50;

      //Start time
      //TODO Not reverting on time before current
      _startTime = new Date('1 Jan 2016 12:34:56 GMT').valueOf();

      // await expect(
      //   contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      // ).to.be.revertedWith("SPC::makeCommitment - commitment cannot start in the past");

      //Transaction to clean up balance
      const _amountToWithdraw: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transfer.returns(true);
      await expect(contractWithUser.withdraw(_amountToWithdraw, _overrides))
        .to.emit(this.singlePlayerCommit, "Withdrawal")
        .withArgs(await user.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);
    });

    it("deposit 100 DAI and make a commitment of biking 50 kms against 50 DAI stake", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      const _userDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("0.0"));

      //Committer balance on contract
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(this.singlePlayerCommit, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Transaction
      const _activity: string = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");
      const _expectedEndTime = addDays(_startTime, 7);

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.emit(this.singlePlayerCommit, "NewCommitment");

      //Validate
      const commitment = await this.singlePlayerCommit.commitments(user.getAddress());
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract).to.equal(utils.parseEther("100.0"));
      expect(_updatedCommitterBalance).to.equal(utils.parseEther("100.0"));

      expect(commitment.committer).to.be.properAddress;
      expect(await this.singlePlayerCommit.getActivityName(commitment.activity)).to.equal("biking");
      expect(await this.singlePlayerCommit.getMeasureName(commitment.measure)).to.equal("km");
      expect(commitment.goalValue.toNumber()).to.equal(_goal);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.start).to.equal(_startTime);
      expect(commitment.end).to.not.be.undefined; //milliseconds, timing make equal difficult
    });

    it("not make more than one commitment", async function () {
      const _address = await user.getAddress();
      const commitment = await this.singlePlayerCommit.commitments(_address);
      expect(commitment.exists).to.be.true;

      //Transaction
      const _activity: BytesLike = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - msg.sender already has a commitment");
    });

    it("not resolve a commitment before end date", async function () {
      let commitment;
      const _address = await user.getAddress();
      commitment = await this.singlePlayerCommit.commitments(_address);
      expect(commitment.exists).to.be.true;

      await expect(contractWithUser.processCommitment(_address, _overrides)).to.be.revertedWith(
        "SPC::processCommitment - commitment is still active",
      );

      commitment = await this.singlePlayerCommit.commitments(user.getAddress());
      expect(commitment.exists).to.be.true;
    });

    //TODO Configure start/endtime and resolve commitment
    it.skip("resolve a commitment after end date", async function () {
      const _address = await user.getAddress();
      const commitment = await this.singlePlayerCommit.commitments(user.getAddress());
      expect(commitment.exists).to.be.true;
      await expect(contractWithUser.processCommitment(_address, _overrides)).to.emit(
        this.singlePlayerCommit,
        "CommitmentEnded",
      );
      expect(commitment.exists).to.be.false;
    });

    //TODO Currently failing on active commitment; need fixture or cleanup
    it.skip("make a deposit 100DAI and commitment of biking 50 kms against 50 DAI stake in a single call", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      const _userDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("100.0"));

      //Committer balance on contract
      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(utils.parseEther("100.0"));

      //Transaction
      const _activity: BytesLike = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      const _expectedEndTime = addDays(_startTime, 7);

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.depositAndCommit(
          _activity,
          _measureIndex,
          _goal,
          _startTime,
          _amountToStake,
          _amountToDeposit,
          _overrides,
        ),
      ).to.emit(this.singlePlayerCommit, "NewCommitment")
      .withArgs(await user.getAddress(), _activity, _measureIndex, _startTime, _expectedEndTime,_amountToStake);

      // expect("transferFrom").to.be.calledOnContract(this.token);
      // expect("deposit").to.be.calledOnContract(this.singlePlayerCommit);
      // expect("makeCommitment").to.be.calledOnContract(this.singlePlayerCommit);

      //Validate
      const commitment = await this.singlePlayerCommit.commitments(user.getAddress());
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract).to.equal(utils.parseEther("100.0"));
      expect(_updatedCommitterBalance).to.equal(utils.parseEther("100.0"));

      expect(commitment.committer).to.be.properAddress;
      expect(await this.singlePlayerCommit.getActivityName(commitment.activity)).to.equal("biking");
      expect(await this.singlePlayerCommit.getMeasureName(commitment.measure)).to.equal("km");
      expect(commitment.goalValue.toNumber()).to.equal(_goal);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.start).to.equal(_startTime);
    });
  });

}

function addDays(date: number, days: number) {
  const result: Date = new Date(date);
  result.setDate(result.getDate() + days);
  return result.valueOf();
}