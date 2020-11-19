##  CommitPool Single Player Smart Contract repository


[CommitPool](http://commitpool.com/) helps people meet their personal goals by holding themselves accountable. CommitPool users stake money to credibly commit to meeting their goals, and lose their stake when they don’t.

Our MVP focuses on a single goal type for individuals, hence the Single Player mode.

## Getting started

Currently Ganache and Node 14 are not playing well together. To get started:

1. Use node 12 (using nvm is recommended)
2. ```npm install```
3. ```npm run-script build```
4. ```npm test``` (to verify the build)

#### Deploying to local node
Buidler

1. Use node 12 (using nvm is recommended)
2. ```npx buidler node```
3. In second terminal```npx buidler run --network localhost scripts/deploy.ts  ```

Ganache

1. Use node 12 (using nvm is recommended)
2. Start Ganache on port 8545
3. In second terminal```npx buidler run --network localhost scripts/deploy.ts  ```


#### Interacting with the contract
After deploying to a local node
1. ```npx buidler console --network localhost     ```
2. ```const CommitPool = await ethers.getContractFactory("SinglePlayerCommit")```
3. ```const commitPool = await CommitPool.attach("<<CONTRACT ADDRESS FROM DEPLOYMENT>>")```

Example for interacting:
```await commitPool.withdraw(1000)```
## Features

#### Creation of Commitment

A commitment consists of an ```activity```, a ```goalValue``` for given activity, a ```startTime```, and ```stake```. We will automagically set the ```endTime``` 7 days after the startdate.

#### Management of Activities

An activity consists of a ```name``` and the ```oracle``` address. Activities can be enabled by setting it to ```allowed```.

#### Execution of commitment settlement

The contract can be called to process the commitment based on the address of the committer. A check on time and completion determines whether the stake is returned to the committer.

## Architecture

![Architecture diagram of CommitPool](/documentation/architecture.png "Architecture diagram")

## Stack

This repository is a fork from [Paul Berg's Solidity Template](https://github.com/PaulRBerg/solidity-template)

## Get in touch

[commitpool.com](http://commitpool.com/)

<commitpool@gmail.com>

Subscribe to our [Substack](https://commit.substack.com/)
