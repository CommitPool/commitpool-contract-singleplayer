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

    beforeEach(async function () {
      [owner, user] = await ethers.getSigners();
      contractWithUser = this.singlePlayerCommit.connect(user);
      userAddress = await user.getAddress();
    });

    it("can deposit and withdraw 100 DAI", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      
      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();
      expect(_userBalance).to.equal(utils.parseEther("10000.0"));
      expect(_userDaiBalanceInContract).to.equal(utils.parseEther("0.0"));
      expect(_committerBalance).to.equal(utils.parseEther("0.0"));

      //Transaction to deposit
      const _amountToTransfer: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);

      await expect(contractWithUser.deposit(_amountToTransfer, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(userAddress, _amountToTransfer);
      // expect("transferFrom").to.be.calledOnContract(this.token);
      
      //Transaction to withdraw

      await this.token.mock.transfer.returns(true);
      await expect(contractWithUser.withdraw(_amountToTransfer, _overrides))
        .to.emit(contractWithUser, "Withdrawal")
        .withArgs(userAddress, _amountToTransfer);

      //Validate balances
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      expect(_updatedUserBalance.lt(_userBalance));
      expect(_updatedUserDaiBalanceInContract.eq(_userDaiBalanceInContract));
      expect(_updatedCommitterBalance.eq(_committerBalance));
    });

    it("Can make one -and only one- commitment", async function () {
      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);

      //Transaction
      const _activity: BytesLike = await contractWithUser.activityKeyList(0);
      const _goal: number = 50;
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await expect(
        contractWithUser.makeCommitment(_activity, _goal, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides)
      ).to.emit(contractWithUser, "NewCommitment")

      const commitment = await contractWithUser.commitments(userAddress);
      expect(commitment.exists).to.be.true;

      await expect(
        contractWithUser.makeCommitment(_activity, _goal, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - msg.sender already has a commitment");
    });

    it("cannot make a commitment without deposited funds", async function () {
      //Transaction
      const _activity: string = await contractWithUser.activityKeyList(0);
      const _goalValue: number = 50;
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
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
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      //Random fault Activity key
      _activity = '0xb16dfc4a050ca7e77c1c5f443dc473a2f03ac722e25f721ab6333875f44984f2';

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - activity doesn't exist or isn't allowed");
      _activity = await contractWithUser.activityKeyList(0);

       //Goal
      _goalValue = 1;

      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.be.revertedWith("SPC::makeCommitment - goal is too low");

      _goalValue = 50;

      await this.token.mock.transfer.returns(true);
      // expect("transfer").to.be.calledOnContract(this.token);
    });

    it("can deposit 100 DAI and make a commitment of biking 50 kms against 50 DAI stake", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);

      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();

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
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _goalValue, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.emit(contractWithUser, "NewCommitment");

      //Validate
      const commitment = await contractWithUser.commitments(userAddress);
      const activityName = await contractWithUser.getActivityName(commitment.activityKey);
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      const timestamp = await ethers.provider.getBlockNumber()
      .then((blockNumber) => ethers.provider.getBlock(blockNumber))
      .then((block) => block.timestamp);

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract.lt(_userDaiBalanceInContract));
      expect(_updatedCommitterBalance.lt(_committerBalance));

      expect(commitment.committer).to.be.properAddress;
      expect(activityName).to.equal("biking");
      expect(commitment.goalValue.toNumber()).to.equal(_goalValue);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.startTime.eq(timestamp));
      expect(commitment.endTime.eq(addDays(timestamp, _amountOfDays)));
      expect(commitment.met).to.be.false; 
      expect(commitment.exists).to.be.true;
      expect(commitment.userId).to.not.be.undefined; //TODO can be more specific?
    });

    it("slashes funds when resolving an unmet commitment", async function () {
      const _slashedBalance: BigNumber = await contractWithUser.slashedBalance();
      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithUser.deposit(_amountToDeposit, _overrides))
        .to.emit(contractWithUser, "Deposit")
        .withArgs(await user.getAddress(), _amountToDeposit);

      //Transaction
      const _activity: BytesLike = await contractWithUser.activityKeyList(0);
      const _goal: number = 50;
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      await expect(
        contractWithUser.makeCommitment(_activity, _goal, _daysToStart, _amountOfDays, _amountToStake, userId, _overrides),
      ).to.emit(contractWithUser, "NewCommitment")

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
      expect(_updatedUserBalance.eq(_amountToDeposit.sub(_amountToStake)));
      expect(_updatedSlashedBalance.gt(_slashedBalance)).to.be.true;
    });

    //TODO Configure start/endtime and resolve commitment
    it.skip("can resolve a commitment after end date", async function () {
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

    it("make a deposit 100DAI and commitment of biking 50 kms against 50 DAI stake in a single call", async function () {
      //User balance in wallet [ETH] and contract [DAI]
      const _userBalance: BigNumber = await user.getBalance();
      const _userDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);

      //Committer balance on contract
      const _committerBalance: BigNumber = await contractWithUser.totalCommitterBalance();

      //Transaction
      const _activity: string = await contractWithUser.activityKeyList(0);
      const _goalValue: number = 50;
      const _daysToStart: number = 0;
      const _amountOfDays: number = 7;
      const _amountToStake: BigNumber = utils.parseEther("50.0");
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      const _expectedEndTime = addDays(_daysToStart, 7);

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.depositAndCommit(
          _activity,
          _goalValue,
          _daysToStart,
          _amountOfDays,
          _amountToStake,
          _amountToDeposit,
          userId,
          _overrides,
        ),
      ).to.emit(contractWithUser, "NewCommitment");

      // expect("transferFrom").to.be.calledOnContract(this.token);
      // expect("deposit").to.be.calledOnContract(this.singlePlayerCommit);
      // expect("makeCommitment").to.be.calledOnContract(this.singlePlayerCommit);

      //Validate
      const commitment = await contractWithUser.commitments(userAddress);
      const activityName = await contractWithUser.getActivityName(commitment.activityKey);
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await contractWithUser.committerBalances(userAddress);
      const _updatedCommitterBalance: BigNumber = await contractWithUser.totalCommitterBalance();
      const timestamp = await ethers.provider.getBlockNumber()
      .then((blockNumber) => ethers.provider.getBlock(blockNumber))
      .then((block) => block.timestamp);

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract.lt(_userDaiBalanceInContract));
      expect(_updatedCommitterBalance.lt(_committerBalance));

      expect(commitment.committer).to.be.properAddress;
      expect(activityName).to.equal("biking");
      expect(commitment.goalValue.toNumber()).to.equal(_goalValue);
      expect(commitment.stake).to.equal(_amountToStake);
      expect(commitment.startTime.eq(timestamp));
      expect(commitment.endTime.eq(addDays(timestamp, _amountOfDays)));
      expect(commitment.met).to.be.false; 
      expect(commitment.exists).to.be.true;
      expect(commitment.userId).to.not.be.undefined; //TODO can be more specific?
    });
  });

}

function addDays(date: number, days: number) {
  const result: Date = new Date(date);
  result.setDate(result.getDate() + days);
  return result.valueOf();
}