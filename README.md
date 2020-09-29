##  CommitPool Single Player Smart Contract repository

CommitPool helps people meet their personal goals by holding themselves accountable. CommitPool users stake money to credibly commit to meeting their goals, and lose their stake when they don’t.

Our MVP focuses on a single goal type for individuals, hence the Single Player mode.

## Getting started

Currently Ganache and Node 14 are not playing well together. To get started:

1. Use node 12 (using nvm is recommended)
2. ```npm install```
3. ```npm run-script build```
4. ```npm test``` (to verify the build)

## Features

Single Player mode features:

- [x] Creation of Commitment
- [ ] Management of Activities
- [ ] Management of Measures
- [x] Execution of commitment settlement

#### Creation of Commitment

A commitment consists of an ```activity```, a ```measure``` for given activity, a ```start time```, and ```stake```. We will set the ```end date``` 7 days after the startdate.

#### Management of Activities

An activity consists of a ```name```, a ```measure``` to express activity metrics, an array of accepted ```ranges```, and the ```oracle``` address. Activities can be enabled by setting it to ```allowed```.

For the Single Player mode ```biking``` is the only available activity, as declared in ```scripts/deploy.ts```

#### Management of Measures

A measure has a ```name``` and can be enabled by setting it to ```allowed```.

For the Single Player mode ```km``` is the only available measure, as declared in ```scripts/deploy.ts```

#### Execution of commitment settlement

The contract can be called to process the commitment based on the address of the committer. A check on time and completion determines whether the stake is returned to the committer.

## Architecture

![Architecture diagram of CommitPool](/documentation/architecture.png "Architecture diagram")

## Stack

This repository is a fork from [Paul Berg's Solidity Template](https://github.com/PaulRBerg/solidity-template)

## Get in touch

[commitpool.com](www.commitpool.com)

<commitpool@gmail.com>

Subscribe to our [Substack](https://commit.substack.com/)
