// We require the Buidler Runtime Environment explicitly here. This is optional
// but useful for running the script in a standalone fashion through `node <script>`.
// When running the script with `buidler run <script>` you'll find the Buidler
// Runtime Environment's members available in the global scope.
import { ethers } from "@nomiclabs/buidler";
import { BigNumberish, Contract, ContractFactory } from "ethers";

async function main(): Promise<void> {
  // Buidler always runs the compile task when running scripts through it.
  // If this runs in a standalone fashion you may want to call compile manually
  // to make sure everything is compiled
  // await run("compile");

  // We get the contract to deploy
  //TODO oracle and token to env.var
  const activities: string[] = ["biking", "cycling"];
  const oracle: string = "0x514910771af9ca656af840dff83e8264ecf986ca";
  const token: string = "0x6b175474e89094c44da98b954eedeac495271d0f";
  const SinglePlayerCommit: ContractFactory = await ethers.getContractFactory("SinglePlayerCommit");
  const singlePlayerCommit: Contract = await SinglePlayerCommit.deploy(activities, oracle, token);
  await singlePlayerCommit.deployed();

  console.log("SinglePlayerCommit deployed to: ", singlePlayerCommit.address);
}

// We recommend this pattern to be able to use async/await everywhere
// and properly handle errors.
main()
  .then(() => process.exit(0))
  .catch((error: Error) => {
    console.error(error);
    process.exit(1);
  });
