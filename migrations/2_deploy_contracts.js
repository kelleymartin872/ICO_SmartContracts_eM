var EasyMineTokenWallet = artifacts.require("./EasyMineTokenWallet.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");
var EasyMineToken = artifacts.require("./EasyMineToken.sol");

var config = require("./config.json");

console.log("Configuration:", config);

module.exports = function(deployer) {
  deployer.deploy(EasyMineIco, config.walletAddress, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit}).then(function() {
    return deployer.deploy(EasyMineTokenWallet, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit});
  }).then(function() {
    return deployer.deploy(EasyMineToken, EasyMineIco.address, config.preIcoAddress, EasyMineTokenWallet.address, config.bountyWalletAddress, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit});
  }).then(function() {
    return EasyMineIco.deployed();
  }).then(function(icoInstance) {
    return icoInstance.setup(EasyMineToken.address, config.sysAddress, config.reservationAddress, config.minStartDelay, config.maxDuration, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit});
  }).then(function(result) {
    console.log("ICO contract set up in tx: " + result.tx);
    return EasyMineTokenWallet.deployed();
  }).then(function(tokenWalletInstance) {
    return tokenWalletInstance.setup(EasyMineToken.address, config.emtWithdrawalAddress, {from: config.ownerAddress, gasPrice: config.gasPrice, gas: config.gasLimit});
  }).then(function(result) {
    console.log("Token wallet contract set up in tx: " + result.tx);
    console.log("ICO contracts successfully set up");
  });
};
