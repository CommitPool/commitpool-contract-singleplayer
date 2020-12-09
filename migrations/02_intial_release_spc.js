const SinglePlayerCommit = artifacts.require("SinglePlayerCommit");

module.exports = function(deployer) {
  // Deploy the Migrations contract as our only task
  const activities = ["biking", "cycling"];
  const oracle = "0x70d1F773A9f81C852087B77F6Ae6d3032B02D2AB";
  const token = "0xcB1e72786A6eb3b44C2a2429e317c8a2462CFeb1";
  deployer.deploy(SinglePlayerCommit, activities, oracle, token);
};