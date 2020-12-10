import { expect } from "chai";
import { BigNumber } from "ethers";
// import { ethers, waffle } from "hardhat";

export function hasHandyHelperFunctions(): void {
  context("Helpers", function () {
    it.skip("can add 7 days to startdate", async function () {
    this.contractWithAdmin = this.singlePlayerCommit.connect(this.signers.admin);

    const _startDateTimestamp: number = 1607394277138;
    const _startDate = new Date(_startDateTimestamp);
    console.log(_startDate);
    const _endDateTimeStamp: BigNumber = await this.singlePlayerCommit
      .addDays(_startDateTimestamp, 7);
    const _endDate = new Date(_endDateTimeStamp);


    //Validate
    expect(_startDate.toDateString()).to.equal("Thu Dec 10 2020");
    expect(_endDate.toDateString()).to.equal("Thu Dec 17 2020");
  });
})

}
