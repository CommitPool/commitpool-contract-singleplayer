##  CommitPool Single Player Smart Contract repository

CommitPool helps people meet their personal goals by holding themselves accountable. CommitPool users stake money to credibly commit to meeting their goals, and lose their stake when they don’t.

Our MVP focuses on a single goal type for individuals, hence the Single Player mode.

#### Getting started

Currently Ganache and Node 14 are not playing well together. To get started:

1. Use node 12 (using nvm is recommended)
2. ```npm install```
3. ```npm run-script build```
4. ```npm test``` (to verify the build)

#### Features

Single Player mode features:

- [x] Creation of commitments
- [ ] Management of commitment activities
- [ ] Management of activity measures
- [ ] Execution of commitment settlement
- [ ] 

##### Creation of Commitment

A commitment consists of an activity, a measure for given activity, a starting time, and stake. We will set the end date 7 days after the startdate.

##### Management of commitment activities

##### Management of activity measures

##### Execution of commitment settlement

#### Architecture

![Architecture diagram of CommitPool](/documentation/architecture.png "Architecture diagram" =250x)

#### Stack

This repository is a fork from [Paul Berg's Solidity Template](https://github.com/PaulRBerg/solidity-template)

#### Get in touch

<commitpool@gmail.com>

Subscribe to our [Substack](https://commit.substack.com/)



