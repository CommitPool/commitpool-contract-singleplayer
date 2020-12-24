const SinglePlayerCommit = artifacts.require("SinglePlayerCommit");

module.exports = function(deployer) {
  // Deploy the Migrations contract as our only task
  const activities = ["Ride", "Run"];
  const oracle = "0x32dd20157E6b443843d0b99874997AcCeeAA0E60";
  const token = "0x70d1f773a9f81c852087b77f6ae6d3032b02d2ab";
  deployer.deploy(SinglePlayerCommit, activities, oracle, token);
};