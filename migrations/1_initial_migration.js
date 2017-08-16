var Migrations = artifacts.require("./Migrations.sol");

var config = require("./config-test.json");

console.log("Configuration:", config);

module.exports = function(deployer) {
  deployer.deploy(Migrations, {from: config.ownerAddress, gasPrice: config.gasPrice});
};
