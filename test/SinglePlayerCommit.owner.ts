import { expect } from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";
import { Address } from "cluster";

export function ownerCanManageContract(): void {
  context("Owner can", function () {
    let owner: Signer;
    let contractWithOwner: SinglePlayerCommit;
    let contractAddress;
    let ownerAddress: string;
    const _overrides = {
      gasLimit: 1000000,
    };

    before(async function () {
      [owner] = await ethers.getSigners();
      contractWithOwner = await this.singlePlayerCommit.connect(owner);
      ownerAddress = await owner.getAddress()
    });

    it("withdraw non-committer balance", async function () {
      //Owner balance in wallet [ETH] and contract [DAI]
      const _ownerBalance: BigNumber = await owner.getBalance();
      expect(_ownerBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      const _ownerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(ownerAddress);
      expect(_ownerDaiBalanceInContract).to.equal(utils.parseEther("0.0"));

      //Committer balance on SinglePlayerCommit contract 100 DAI
      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithOwner.deposit(_amountToDeposit, _overrides))
        .to.emit(this.singlePlayerCommit, "Deposit")
        .withArgs(await owner.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(_amountToDeposit);

      //Committer balance on DAI contract 1000 DAI
      await this.token.mock.balanceOf.withArgs(contractWithOwner.address).returns(utils.parseEther("1000"));

      //Transaction
      let _amountToWithdraw: BigNumber = utils.parseEther("800.0");

      await this.token.mock.transfer.returns(true);
      await contractWithOwner.ownerWithdraw(_amountToWithdraw, _overrides)

      // expect("balanceOf").to.be.calledOnContract(this.token);
      // expect("transfer").to.be.calledOnContract(this.token);

      //Validate
      const _updatedOwnerBalance: BigNumber = await owner.getBalance();
      const _updatedOwnerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(ownerAddress);
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;

      //Transaction to clean up balance
      _amountToWithdraw = utils.parseEther("100.0");

      await this.token.mock.transfer.returns(true);
      await expect(contractWithOwner.withdraw(_amountToWithdraw, _overrides))
        .to.emit(this.singlePlayerCommit, "Withdrawal")
        .withArgs(await owner.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);
    });


    it("not withdraw balance that belongs to a committer", async function () {
      //Owner balance in wallet [ETH] and contract [DAI]
      const _ownerBalance: BigNumber = await owner.getBalance();
      expect(_ownerBalance.lt(utils.parseEther("10000000000000000.0"))).to.be.true;
      const _ownerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(ownerAddress);
      expect(_ownerDaiBalanceInContract).to.equal(utils.parseEther("0.0"));

      //Committer balance on SinglePlayerCommit contract 100 DAI
      // Deposit funds in contract
      const _amountToDeposit: BigNumber = utils.parseEther("100.0");
      await this.token.mock.transferFrom.returns(true);
      await expect(contractWithOwner.deposit(_amountToDeposit, _overrides))
        .to.emit(this.singlePlayerCommit, "Deposit")
        .withArgs(await owner.getAddress(), _amountToDeposit);
      // expect("transferFrom").to.be.calledOnContract(this.token);

      const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
      expect(_committerBalance).to.equal(_amountToDeposit);

      //Committer balance on DAI contract 1000 DAI
      await this.token.mock.balanceOf.withArgs(contractWithOwner.address).returns(utils.parseEther("1000"));

      //Transaction
      let _amountToWithdraw: BigNumber = utils.parseEther("1200.0");

      await this.token.mock.transfer.returns(true);
      await expect(
        contractWithOwner.ownerWithdraw(_amountToWithdraw, _overrides),
      ).to.be.revertedWith("SPC::ownerWithdraw - not enough available balance")

      // expect("balanceOf").to.be.calledOnContract(this.token);

      //Validate
      const _updatedOwnerBalance: BigNumber = await owner.getBalance();
      const _updatedOwnerDaiBalanceInContract: BigNumber = await this.singlePlayerCommit.balances(ownerAddress);
      const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

      expect(_updatedOwnerBalance.lt(_ownerBalance)).to.be.true;
      expect(_updatedOwnerDaiBalanceInContract.eq(_amountToDeposit)).to.be.true;
      expect(_updatedCommitterBalance.eq(_amountToDeposit)).to.be.true;

      //Transaction to clean up balance
      _amountToWithdraw = utils.parseEther("100.0");

      await this.token.mock.transfer.returns(true);
      await expect(contractWithOwner.withdraw(_amountToWithdraw, _overrides))
        .to.emit(this.singlePlayerCommit, "Withdrawal")
        .withArgs(await owner.getAddress(), _amountToWithdraw);
      // expect("transfer").to.be.calledOnContract(this.token);
    });
  });
}
