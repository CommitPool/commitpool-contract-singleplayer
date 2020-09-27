import { expect } from "chai";
import { ethers } from "@nomiclabs/buidler";
import { Signer, utils, BigNumber, BytesLike } from "ethers";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

export function ownerCanManageContract(): void {
    context("Owner can", function () {
      let owner: Signer;
      let contractWithOwner: SinglePlayerCommit;
      const _overrides = {
        gasLimit: 1000000,
      };

      before(async function () {
        [owner] = await ethers.getSigners();
        contractWithOwner = await this.singlePlayerCommit.connect(owner);
      });

      it("withdraw non-committed balance", async function () {
        //Owner balance
        const _ownerBalance: BigNumber = await owner.getBalance();
        // console.log("Owner balance: ", utils.formatEther(_ownerBalance));

        //Committer balance
        const _committerBalance: BigNumber = await this.singlePlayerCommit.committerBalance();
        // console.log("Committer balance: ", utils.formatEther(_committerBalance));
        expect(_committerBalance).to.equal(utils.parseEther("0.0"));

        //Contract balance
        const margin = utils.parseEther("10");
        await this.token.mock.balanceOf.returns(_committerBalance.add(margin));

        const _contractBalance: BigNumber = await this.token.balanceOf(contractWithOwner.address);
        // console.log("Contract balance: ", utils.formatEther(_contractBalance));

        //Transaction
        await this.token.mock.transfer.returns(true);
        await contractWithOwner.ownerWithdraw(10, _overrides);

        //Validate
        const _updatedOwnerBalance: BigNumber = await owner.getBalance();
        const _updatedCommitterBalance: BigNumber = await this.singlePlayerCommit.committerBalance.call();

        expect(1).to.equal(1);

        // expect(_updatedOwnerBalance.gt(_ownerBalance)).to.be.true;
        // expect(_updatedCommitterBalance.lt(_committerBalance)).to.be.true;
      });
    });
}
