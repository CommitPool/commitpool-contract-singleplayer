import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function ownerCanManageContract(): void {
  context("Owner", function () {
    let owner: Signer;
    let contractWithOwner: SinglePlayerCommit;
    let ownerAddress: string;
    const currentDate = new Date()
    const startDate = Math.floor(currentDate.valueOf() / 1000);
    const endDate = Math.floor(addDays(currentDate, 7).valueOf() / 1000);
    const defaultParams = {
      activityKey: "",
      goal: 0,
      startTime: startDate,
      endTime: endDate,
      amountToDeposit: utils.parseEther("100.0"),
      amountToStake: utils.parseEther("50.0"),
      userId: "testUser"
    }
    const _overrides = {
      gasLimit: 1000000,
    };

    beforeEach(async function () {
      [owner] = await ethers.getSigners();
      contractWithOwner = this.singlePlayerCommit.connect(owner);
      ownerAddress = await owner.getAddress();

      //Default commitment parameters
      defaultParams.activityKey = await contractWithOwner.activityKeyList(0);
      defaultParams.goal = 50;
      defaultParams.startTime  = startDate;
      defaultParams.endTime = endDate;
      defaultParams.amountToDeposit = utils.parseEther("100.0")
      defaultParams.amountToStake = utils.parseEther("50.0")
    });

    it("can withdraw slashed balance", async function () {
      //Start balances
      const _ownerBalance: BigNumber = await owner.getBalance();
      const _ownerDaiBalanceInContract: BigNumber = await contractWithOwner.committerBalances(ownerAddress);
      const _slashedBalance: BigNumber = await contractWithOwner.slashedBalance();
      const _committerBalance: BigNumber = await contractWithOwner.totalCommitterBalance();

      expect(_ownerBalance.lt(utils.parseEther("10000.0"))).to.be.true; //Lower than because of deployment
      expect(_ownerDaiBalanceInContract.eq(utils.parseEther("0.0"))).to.be.true;
      expect(_committerBalance.eq(utils.parseEther("0.0"))).to.be.true;
      expect(_slashedBalance.eq(utils.parseEther("0.0"))).to.be.true;

      //Transaction to deposit and commit
      const { activityKey, goal, startTime, endTime, amountToDeposit, amountToStake, userId } = defaultParams;

      await this.token.mock.transferFrom.returns(true);
      await expect(
        contractWithOwner.depositAndCommit(
          activityKey,
          goal,
          startTime, 
          endTime,
          amountToStake,
          amountToDeposit,
          userId,
          _overrides,
        ),
      ).to.emit(contractWithOwner, "NewCommitment");

      let _updatedOwnerBalance: BigNumber = await owner.getBalance();
      let _updatedOwnerDaiBalanceInContract: BigNumber = await contractWithOwner.committerBalances(
        ownerAddress,
      );
      let _updatedCommitterBalance: BigNumber = await contractWithOwner.totalCommitterBalance();
      let _updatedSlashedBalance = await contractWithOwner.slashedBalance();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(amountToDeposit)).to.be.true;
      expect(_updatedSlashedBalance.eq(utils.parseEther("0.0"))).to.be.true;

      //Process commitment (not met => slashing)
      await this.token.mock.balanceOf.withArgs(contractWithOwner.address).returns(utils.parseEther("1000"));
      await expect(contractWithOwner.processCommitmentUser(_overrides)).to.emit(
        contractWithOwner,
        "CommitmentEnded",
      );

      _updatedSlashedBalance = await contractWithOwner.slashedBalance();
      expect(_updatedSlashedBalance.eq(amountToStake)).to.be.true;

      //Transaction to withdraw slashed funds
      await this.token.mock.transfer.returns(true);
      await contractWithOwner.ownerWithdraw(_updatedSlashedBalance, _overrides);

      //Validate balances
      _updatedOwnerBalance= await owner.getBalance();
      _updatedOwnerDaiBalanceInContract= await contractWithOwner.committerBalances(
        ownerAddress,
      ); 
      _updatedCommitterBalance= await contractWithOwner.totalCommitterBalance();
      _updatedSlashedBalance = await contractWithOwner.slashedBalance();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(amountToDeposit.sub(amountToStake))).to.be.true;
      expect(_updatedCommitterBalance.eq(amountToDeposit.sub(amountToStake))).to.be.true;
      expect(_updatedSlashedBalance.eq(utils.parseEther("0.0"))).to.be.true;
    });

    it("can update activity oracle", async function() {
      const { activityKey } = defaultParams;  
      const randomAddress = "0xd115bffabbdd893a6f7cea402e7338643ced44a6";    
      let activity = await contractWithOwner.activities(activityKey);

      await expect(contractWithOwner.updateActivityOracle(activityKey, utils.getAddress(randomAddress), _overrides)).to.emit(contractWithOwner, "ActivityUpdated");
      
      activity = await contractWithOwner.activities(activityKey);
      expect(activity.name).to.equal('biking');
      expect(utils.getAddress(activity.oracle)).to.equal(utils.getAddress(randomAddress));
      expect(activity.allowed).to.be.true;
      expect(activity.exists).to.be.true;    
    })

    it("can update activity allowed", async function() {
      const { activityKey } = defaultParams;  
      let activity = await contractWithOwner.activities(activityKey);
      expect(activity.allowed).to.be.true;

      await expect(contractWithOwner.updateActivityAllowed(activityKey, false, _overrides)).to.emit(contractWithOwner, "ActivityUpdated");
      
      activity = await contractWithOwner.activities(activityKey);
      expect(activity.allowed).to.be.false;    

      await expect(contractWithOwner.updateActivityAllowed(activityKey, true, _overrides)).to.emit(contractWithOwner, "ActivityUpdated");
      
      activity = await contractWithOwner.activities(activityKey);
      expect(activity.allowed).to.be.true;  
    })

    it("can disable activity", async function() {
      const { activityKey } = defaultParams;  
      let activity = await contractWithOwner.activities(activityKey);
      expect(activity.allowed).to.be.true;

      await expect(contractWithOwner.disableActivity(activityKey, _overrides)).to.emit(contractWithOwner, "ActivityUpdated"); 
      
      activity = await contractWithOwner.activities(activityKey);
      expect(activity.exists).to.be.false;
      
    })
  });
}

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}
