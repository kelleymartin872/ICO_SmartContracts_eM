var config = require('./migrations/config.json');

module.exports = {
  networks: {
    development: {
      host: "localhost",
      port: 8545,
      network_id: "*", // Match any network id
      gas: config.gasLimit,
      from: config.ownerAddress
    }
  }
};
