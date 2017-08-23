var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");

var bigInt = require("big-integer");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO Reservation :: ', accounts => {

  let owner = accounts[0];
  let sys = accounts[1];
  let icoBidder = accounts[7];
  let anotherIcoBidder = accounts[8];

  let startBlock = web3.eth.blockNumber + config.minStartDelay+5;
  let endBlock = startBlock + config.maxDuration;

  it('owner successfully schedules start', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.scheduleStart(startBlock, {from: owner})
        .then(_ => easyMineIco.stage())
        .then(stage => {
          assert.equal(stage, 2);
          return easyMineIco.startBlock();
        })
        .then(sb => {
          assert.equal(sb, startBlock);
        });
    });
  });

  it('action should be started at start block', () => {
    var blocksLeft = startBlock - web3.eth.blockNumber;
    rpcUtils.mineBlocks(blocksLeft + 1);
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.updateStage()
        .then(_ => easyMineIco.stage())
        .then(stage => assert.equal(stage, 3));
    });
  });

  it('action should be closed at end block', () => {
    return EasyMineToken.deployed().then(token => {
      var blocksLeft = endBlock - web3.eth.blockNumber;
      rpcUtils.mineBlocks(blocksLeft + 2);
      return EasyMineIco.deployed().then(easyMineIco => {
        return easyMineIco.updateStage()
          .then(_ => easyMineIco.stage())
          .then(stage => assert.equal(stage.toString(), "4"));
      });
    });
  });

  it('ico is finished and all funds returned', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialBalance = web3.eth.getBalance(anotherIcoBidder);
      var initialEMBalance = web3.eth.getBalance(config.walletAddress).toString();
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000, gasPrice: 0})
        .then(trans => assert.isTrue(false,"Shouldn't be processed! "+trans))
        .catch( _ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).toString(),bigInt("0").toString(), "ICO Tokens sold when shouldn't");
          return easyMineIco.stage();
        })
        .then(stage => {
          assert.equal(stage, 4);
          var currentBalance = web3.eth.getBalance(anotherIcoBidder).toString();
          assert.equal(currentBalance, initialBalance.toString(), "ETH wasn't returned");
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.equal(bigInt(tokenBalance.toString()).toString(), bigInt("0").toString(), "Wrong amount EMT for anotherIcoBidder");
          var currentEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
          assert.equal(currentEMBalance.toString(), bigInt("0").add(initialEMBalance).toString(), "Wrong amount of ETH");
        });
    });
  });


});
