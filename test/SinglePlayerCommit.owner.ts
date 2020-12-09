import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function ownerCanManageContract(): void {
  context("Owner", function () {
    let owner: Signer;
    let contractWithOwner: SinglePlayerCommit;
    let ownerAddress: string;
    const _overrides = {
      gasLimit: 1000000,
    };
    const userId = "testUser";

    before(async function () {
      [owner] = await ethers.getSigners();
      contractWithOwner = await this.singlePlayerCommit.connect(owner);
      ownerAddress = await owner.getAddress();
    });

    it("can withdraw slashed balance", async function () {
      //Start balances
      const _ownerBalance: BigNumber = await owner.getBalance();
      const _ownerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.committerBalances(ownerAddress);
      const _slashedBalance: BigNumber = await this.singlePlayerCommit.slashedBalance();
      const _committerBalance: BigNumber = await this.singlePlayerCommit.totalCommitterBalance();

      expect(_ownerBalance.lt(utils.parseEther("10000.0"))).to.be.true; //Lower than because of deployment
      expect(_ownerDaiBalanceInContract.eq(utils.parseEther("0.0"))).to.be.true;
      expect(_committerBalance.eq(utils.parseEther("0.0"))).to.be.true;
      expect(_slashedBalance.eq(utils.parseEther("0.0"))).to.be.true;

      //Transaction to deposit and commit
      const _activity: BytesLike = await this.singlePlayerCommit.activityKeyList(0);
      const _goalValue: number = 50;
      const _startTime: number = Date.now();
      const _amountToStake: BigNumber = utils.parseEther("50.0");
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");

      await this.token.mock.transferFrom.returns(true);
      await expect(
        contractWithOwner.depositAndCommit(
          _activity,
          _goalValue,
          _startTime,
          _amountToStake,
          _amountToDeposit,
          userId,
          _overrides,
        ),
      ).to.emit(this.singlePlayerCommit, "NewCommitment");

      let _updatedOwnerBalance: BigNumber = await owner.getBalance();
      let _updatedOwnerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.committerBalances(
        ownerAddress,
      );
      let _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.totalCommitterBalance();
      let _updatedSlashedBalance = await this.singlePlayerCommit.slashedBalance();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;
      expect(_updatedSlashedBalance.eq(utils.parseEther("0.0"))).to.be.true;

      //Process commitment (not met => slashing)
      await this.token.mock.balanceOf.withArgs(contractWithOwner.address).returns(utils.parseEther("1000"));
      await expect(contractWithOwner.processCommitmentUser(_overrides)).to.emit(
        this.singlePlayerCommit,
        "CommitmentEnded",
      );

      _updatedSlashedBalance = await this.singlePlayerCommit.slashedBalance();
      expect(_updatedSlashedBalance.eq(_amountToStake)).to.be.true;

      //Transaction to withdraw slashed funds
      await this.token.mock.transfer.returns(true);
      await contractWithOwner.ownerWithdraw(_updatedSlashedBalance, _overrides);

      //Validate balances
      _updatedOwnerBalance= await owner.getBalance();
      _updatedOwnerDaiBalanceInContract= await this.singlePlayerCommit.committerBalances(
        ownerAddress,
      ); 
      _updatedCommitterBalance= await this.singlePlayerCommit.totalCommitterBalance();
      _updatedSlashedBalance = await this.singlePlayerCommit.slashedBalance();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(_amountToDeposit.sub(_amountToStake))).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit.sub(_amountToStake))).to.be.true;
      expect(_updatedSlashedBalance.eq(utils.parseEther("0.0"))).to.be.true;

      //Transaction to clean up balance
      await this.token.mock.transfer.returns(true);
      await expect(contractWithOwner.withdraw(_updatedOwnerDaiBalanceInContract, _overrides))
        .to.emit(this.singlePlayerCommit, "Withdrawal")
        .withArgs(await owner.getAddress(), _updatedOwnerDaiBalanceInContract);
    });

    it("can update activity oracle", async function() {
      const _activityKey: BytesLike = await this.singlePlayerCommit.activityKeyList(0);  
      const randomAddress = "0xd115bffabbdd893a6f7cea402e7338643ced44a6";    
      let activity = await this.singlePlayerCommit.activities(_activityKey);

      await expect(contractWithOwner.updateActivityOracle(_activityKey, utils.getAddress(randomAddress), _overrides)).to.emit(this.singlePlayerCommit, "ActivityUpdated");
      
      activity = await this.singlePlayerCommit.activities(_activityKey);
      expect(activity.name).to.equal('biking');
      expect(utils.getAddress(activity.oracle)).to.equal(utils.getAddress(randomAddress));
      expect(activity.allowed).to.be.true;
      expect(activity.exists).to.be.true;    
    })


    it("can update activity allowed", async function() {
      const _activityKey: BytesLike = await this.singlePlayerCommit.activityKeyList(0);  
      let activity = await this.singlePlayerCommit.activities(_activityKey);
      expect(activity.allowed).to.be.true;

      await expect(contractWithOwner.updateActivityAllowed(_activityKey, false, _overrides)).to.emit(this.singlePlayerCommit, "ActivityUpdated");
      
      activity = await this.singlePlayerCommit.activities(_activityKey);
      expect(activity.allowed).to.be.false;    

      await expect(contractWithOwner.updateActivityAllowed(_activityKey, true, _overrides)).to.emit(this.singlePlayerCommit, "ActivityUpdated");
      
      activity = await this.singlePlayerCommit.activities(_activityKey);
      expect(activity.allowed).to.be.true;  
    })

    //TODO test deletion. First implement fixture for easy state manipulation
    it.skip("can disable activity", async function() {
      const _activityKey: BytesLike = await this.singlePlayerCommit.activityKeyList(0);  
      const activity = await this.singlePlayerCommit.activities(_activityKey);
      expect(activity.allowed).to.be.true;

      await expect(contractWithOwner.deleteActivity(_activityKey, false, _overrides)).to.emit(this.singlePlayerCommit, "ActivityUpdated"); 
      await expect(contractWithOwner.activities(_activityKey, _overrides)).to.be.reverted;
      
    })
  });
}
