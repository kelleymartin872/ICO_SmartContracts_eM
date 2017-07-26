var EasyMineTokenWallet = artifacts.require("./EasyMineTokenWallet.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");
var EasyMinePreIco = artifacts.require("./EasyMinePreIco.sol");
var EasyMineToken = artifacts.require("./EasyMineToken.sol");

var config = require("./config.json");

console.log("Configuration:", config);

/* Contracts owner address */
var ownerAddress = config.ownerAddress; //"0x8A80acd856d0D9E4E37ba5f75Bf8C2d15d26aE1C";

/* Wallet to transfer ICO funds to */
var walletAddress = config.walletAddress; //"0x2A3362bDF864915C2eb996cEE868a841586F4aD4";

/* Bounty wallet address */
var bountyWalletAddress = config.bountyWalletAddress; //"0xca5DA912c9638856C69eb3a00eBea073142B0315";

module.exports = function(deployer) {
  deployer.deploy(EasyMineIco, walletAddress, {from: ownerAddress}).then(function() {
    return deployer.deploy(EasyMinePreIco, {from: ownerAddress});
  }).then(function() {
    return deployer.deploy(EasyMineTokenWallet, {from: ownerAddress});
  }).then(function() {
    return deployer.deploy(EasyMineToken, EasyMineIco.address, EasyMinePreIco.address, EasyMineTokenWallet.address, bountyWalletAddress, {from: ownerAddress});
  }).then(function() {
    return EasyMineIco.deployed();
  }).then(function(icoInstance) {
    return icoInstance.setup(EasyMineToken.address, EasyMinePreIco.address, {from: ownerAddress});
  }).then(function(result) {
    console.log("ICO contract set up in tx: " + result.tx);
    return EasyMinePreIco.deployed();
  }).then(function(preIcoInstance) {
    return preIcoInstance.setup(EasyMineToken.address, EasyMineIco.address, {from: ownerAddress});
  }).then(function(result) {
    console.log("Pre ICO contract set up in tx: " + result.tx);
    return EasyMineTokenWallet.deployed();
  }).then(function(tokenWalletInstance) {
    return tokenWalletInstance.setup(EasyMineToken.address, {from: ownerAddress});
  }).then(function(result) {
    console.log("Token wallet contract set up in tx: " + result.tx);
    console.log("ICO contracts successfully set up");
  });
};
