import { Accounts, Signers } from "./";
import { SinglePlayerCommit } from "../typechain/SinglePlayerCommit";

declare module "mocha" {
  export interface Context {
    accounts: Accounts;
    singlePlayerCommit: SinglePlayerCommit;
    signers: Signers;
  }
}