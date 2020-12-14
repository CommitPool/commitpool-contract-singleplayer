import { expect } from "chai";
import { BigNumber, Contract } from "ethers";
import { ethers, waffle } from "hardhat";

export function hasHandyHelperFunctions(): void {
  context("Helpers", function () {
    it("can add 7 days to date", async function () {

    const _startDateTimestamp: number = 1607601600000 / 1000; //Milisecond timestamp for 2020-12-10T12:00:00.000Z /1000 for seconds calculation

    const _endDateTimeStamp: BigNumber = await this.singlePlayerCommit
      .addDays(_startDateTimestamp, 7);

    console.log("_startDateTimestamp", _startDateTimestamp); //1607601600
    console.log("_endDateTimeStamp", _endDateTimeStamp.toString()); //BigNumber { _hex: '0x5fdb4840', _isBigNumber: true }

    console.log("_startDate", new Date(_startDateTimestamp * 1000)); //2020-12-10T12:00:00.000
    console.log("_endDate", new Date(_endDateTimeStamp.mul(1000).toNumber())); //2020-12-17T12:00:00.000Z
    
    //Validate
    expect(new Date(_startDateTimestamp * 1000).toDateString()).to.equal("Thu Dec 10 2020");
    expect(new Date(_endDateTimeStamp.mul(1000).toNumber()).toDateString()).to.equal("Thu Dec 17 2020");
  });
})

}
