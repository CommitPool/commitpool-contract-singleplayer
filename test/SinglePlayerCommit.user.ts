import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function userCanManageCommitments(): void {
  context("User", function () {
    let owner: Signer;
    let user: Signer;
    let userAddress: string;
    let contractWithUser: SinglePlayerCommit;
    const _overrides = {
      gasLimit: 1000000,
    };
    const userId = "testUser";

    before(async function () {
      [owner, user] = await ethers.getSigners();
      contractWithUser = this.singlePlayerCommit.connect(user);
      userAddress = await user.getAddress();
    });

    it("can deposit 100 DAI for staking", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      
      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();
      expect(_userBalance).to.equal(utils.parseEther("10000.0"));
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("0.0"));
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      //Transaction to deposit
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);

      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(userAddress, _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Validate balances
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      console.log(_updatedUserDaiBalanceInContract.toString())
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_updatedUserBalance.lt(_userBalance));
      expect(_updatedUserDaiBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;
    });

    it("can withdraw 100 DAI from deposited funds", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      
      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_userBalance.lt(utils.parseEther("10000.0"))).to.be.true;
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("100.0"));
      expect(_committerBalance).to.equal(utils.parseEther("100.0"));

      //Transaction
      const _amountToWithdraw: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transfer.returns(true);
      await expect(contractWithUser.withdraw(_amountToWithdraw, _overrides))
        .to.emit(contractWithUser, "Withdrawal")
        .withArgs(await user.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);

      //Validate
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract.isZero()).to.be.true;
      expect(_updatedCommitterBalance.isZero()).to.be.true;
    });

    it("cannot make a commitment without deposited funds", async function () {
      //Transaction
      const _activity: string = await contractWithUser.activityKeyList(0);
      const _goalValue: number = 50;
      const _startTime: number = Date.now();
      const _amountOfDays: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _startTime, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - insufficient token balance");
    });

    it("cannot make a commitment with invalid parameters", async function () {
      //Transaction to deposit funds
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Default parameters
      let _activity: BytesLike = await contractWithUser.activityKeyList(0);
      let _goalValue: number = 50;
      let _startTime: number = Date.now().valueOf();
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      //Random fault Activity key
      _activity = '0xb16dfc4a050ca7e77c1c5f443dc473a2f03ac722e25f721ab6333875f44984f2';

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _startTime, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - activity doesn't exist or isn't allowed");
      _activity = await contractWithUser.activityKeyList(0);

       //Goal
      _goalValue = 1;

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _startTime, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - goal is too low");

      _goalValue = 50;

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
        .to.emit(contractWithUser, "Withdrawal")
        .withArgs(await user.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);
    });

    it("can deposit 100 DAI and make a commitment of biking 50 kms against 50 DAI stake", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);

      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_userBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("0.0"));
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      //Transaction
      const _activity: string = await contractWithUser.activityKeyList(0);
      const _goalValue: number = 50;
      const _startTime: number = Date.now();
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _startTime, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.emit(contractWithUser, "NewCommitment");

      //Validate
      const commitment = await contractWithUser.commitments(userAddress);
      const activityName = await contractWithUser.getActivityName(commitment.activityKey);
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract).to.equal(utils.parseEther("100.0"));
      expect(_updatedCommitterBalance).to.equal(utils.parseEther("100.0"));

      expect(commitment.committer).to.be.properAddress;
      expect(activityName).to.equal("biking");
      expect(commitment.goalValue.toNumber()).to.equal(_goalValue);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.startTime).to.equal(_startTime);
      expect(commitment.endTime).to.not.be.undefined; //milliseconds, timing make equal difficult
      expect(commitment.met).to.be.false; 
      expect(commitment.exists).to.be.true;
      expect(commitment.userId).to.not.be.undefined; //TODO can be more specific?
    });

    it("not make more than one commitment", async function () {
      const commitment = await contractWithUser.commitments(userAddress);
      expect(commitment.exists).to.be.true;

      //Transaction
      const _activity: BytesLike = await contractWithUser.activityKeyList(0);
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _goal, _startTime, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - msg.sender already has a commitment");
    });

    it("slashes funds when resolving an unmet commitment", async function () {
      const _userBalance: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _slashedBalance: BigNumber = await contractWithUser.slashedBalance();
      let commitment = await contractWithUser.commitments(userAddress);

      expect(commitment.met).to.be.false;
      expect(commitment.exists).to.be.true;

      await expect(
        contractWithUser.processCommitmentUser(_overrides)).to.emit(
          contractWithUser, 
          "CommitmentEnded");

      commitment = await contractWithUser.commitments(userAddress);
      const _updatedUserBalance: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedSlashedBalance: BigNumber = await contractWithUser.slashedBalance();

      expect(commitment.met).to.be.false;
      expect(commitment.exists).to.be.false;
      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedSlashedBalance.gt(_slashedBalance)).to.be.true;
    });

    //TODO Configure start/endtime and resolve commitment
    it.skip(" can resolve a commitment after end date", async function () {
      let commitment = await contractWithUser.commitments(userAddress);

      expect(commitment.met).to.be.false;
      expect(commitment.exists).to.be.true;

      await expect(contractWithUser.processCommitmentUser(_overrides)).to.emit(
        contractWithUser,
        "CommitmentEnded",
      );

      commitment = await contractWithUser.commitments(userAddress);

      expect(commitment.met).to.be.false;
      expect(commitment.exists).to.be.false;
    });

    //TODO Currently failing on active commitment; need fixture or cleanup
    it.skip("make a deposit 100DAI and commitment of biking 50 kms against 50 DAI stake in a single call", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      expect(_userBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("100.0"));

      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();
      expect(_committerBalance).to.equal(utils.parseEther("100.0"));

      //Transaction
      const _activity: BytesLike = await contractWithUser.activityKeyList(0);
      const _goalValue: number = 50;
      const _startTime: number = Date.now();
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      const _expectedEndTime = addDays(_startTime, 7);

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.depositAndCommit(
          _activity,
          _goalValue,
          _startTime,
          _amountOfDays,
          _amountToStake,
          _amountToDeposit,
          userId,
          _overrides,
        ),
      ).to.emit(contractWithUser, "NewCommitment")
      .withArgs(await user.getAddress(), _activity, _goalValue, _startTime, _expectedEndTime, _amountToStake);

      // expect("transferFrom").to.be.calledOnContract(this.token);
      // expect("deposit").to.be.calledOnContract(this.singlePlayerCommit);
      // expect("makeCommitment").to.be.calledOnContract(this.singlePlayerCommit);

      //Validate
      const commitment = await contractWithUser.commitments(userAddress);
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.committerBalance();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract).to.equal(utils.parseEther("100.0"));
      expect(_updatedCommitterBalance).to.equal(utils.parseEther("100.0"));

      expect(commitment.committer).to.be.properAddress;
      expect(await contractWithUser.getActivityName(commitment.activityKey)).to.equal("biking");
      expect(commitment.goalValue.toNumber()).to.equal(_goalValue);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.startTime).to.equal(_startTime);
    });
  });

}

function addDays(date: number, days: number) {
  const result: Date = new Date(date);
  result.setDate(result.getDate() + days);
  return result.valueOf();
}