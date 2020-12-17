require('dotenv').config();
// Use for verify deploy arguments
module.exports = [
    ["biking", "cycling"],
    process.env.ORACLE_ADDRESS,
    process.env.TOKEN_ADDRESS
  ];