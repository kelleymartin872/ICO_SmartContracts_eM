var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineExchange = artifacts.require("./EasyMineExchange.sol");

var config = require("./config.json");

module.exports = function(deployer) {
  deployer.deploy(EasyMineExchange, EasyMineToken.address, config.walletAddress, 1, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit}).then(function() {
    console.log("Exchange contract successfully deployed");
  });
};
