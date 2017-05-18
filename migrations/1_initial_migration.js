var Migrations = artifacts.require("./Migrations.sol");

module.exports = function(deployer) {
  deployer.deploy(Migrations, {from: "0x8A80acd856d0D9E4E37ba5f75Bf8C2d15d26aE1C"});
};
