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
      expect(_userBalance).to.equal(utils.parseEther("10000000000000000.0"));
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
      expect("transferFrom").to.be.calledOnContract(this.token);

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
      expect(_userBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
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
      expect("transfer").to.be.calledOnContract(this.token);

      //Validate
      const _updatedUserBalance: BigNumber = await user.getBalance();
      const _updatedUserDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(user.getAddress());
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedUserBalance.lt(_userBalance)).to.be.true;
      expect(_updatedUserDaiBalanceInContract.isZero()).to.be.true;
      expect(_updatedCommitterBalance.isZero()).to.be.true;
    });

    //TODO Check 7 days in future
    it("deposit 100 DAI and make a commitment of biking 50 kms against 50 DAI stake with deposited funds", async function () {
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
      expect("transferFrom").to.be.calledOnContract(this.token);

      //Transaction
      const _activity: BytesLike = await this.singlePlayerCommit.activityList(0);
      const _measureIndex: number = 0;
      const _goal: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");

      // const _endTime = new Date().setDate(_startTime + 7)
      // console.log(_endTime)
      // expect(commitment.start).to.equal(utils.bigNumberify())

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.makeCommitment(_activity, _measureIndex, _goal, _startTime, _amountToStake, _overrides),
      ).to.emit(this.singlePlayerCommit, "NewCommitment");
      // .withArgs(await user.getAddress(), _activity, _measureIndex, _startTime, ,_amountToStake);

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

    //TODO Resolve commitment and configure start/endtime
    it.skip("can resolve a commitment after end date", async function() {
      const _address = await user.getAddress()
      const commitment = await this.singlePlayerCommit.commitments(user.getAddress());
      expect(commitment.exists).to.be.true;
      await expect(
        contractWithUser.processCommitment(_address),
      ).to.emit(this.singlePlayerCommit, "CommitmentEnded"); 
      expect(commitment.exists).to.be.false;
    })

    //TODO
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

      // const _endTime = new Date().setDate(_startTime + 7)
      // console.log(_endTime)
      // expect(commitment.start).to.equal(utils.bigNumberify())

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithUser.depositAndCommit(_activity, _measureIndex, _goal, _startTime, _amountToStake, _amountToDeposit,_overrides),
      ).to.emit(this.singlePlayerCommit, "NewCommitment");
      // .withArgs(await user.getAddress(), _activity, _measureIndex, _startTime, ,_amountToStake);
      expect("transferFrom").to.be.calledOnContract(this.token);
      expect("deposit").to.be.calledOnContract(this.singlePlayerCommit);
      expect("makeCommitment").to.be.calledOnContract(this.singlePlayerCommit);

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
