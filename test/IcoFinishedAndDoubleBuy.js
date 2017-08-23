var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");

var bigInt = require("big-integer");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO Finished and Double Buy :: ', accounts => {

  let owner = accounts[0];
  let sys = accounts[1];
  let icoBidder = accounts[7];

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

  it('first ico bid can be made', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      const expectedTokenCount = bigInt("14285714285714285714285");
      var initialEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
      return easyMineIco.sendTransaction({from: icoBidder, value: web3.toWei("10", "ether"), gas: 2000000})
        .then(_ => easyMineIco.priceThresholds(0))
        .then(firstThreshold => {
          assert.equal(bigInt(firstThreshold[2].toString()).toString(), expectedTokenCount.toString());
          return easyMineIco.priceThresholds(1);
        })
        .then(secondThreshold => {
          assert.equal(secondThreshold[2], 0);
          return easyMineIco.priceThresholds(2);
        })
        .then(thirdThreshold => {
          assert.equal(thirdThreshold[2], 0);
          return easyMineIco.totalTokensSold();
        })
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).toString(), expectedTokenCount.toString());
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(icoBidder))
        .then(tokenBalance => {
          assert.equal(bigInt(tokenBalance.toString()).toString(), expectedTokenCount.toString(), "Wrong amount EMT for icoBidder");
          var currentEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
          assert.equal(currentEMBalance.toString(), bigInt("10e18").add(initialEMBalance).toString(), "Wrong amount of ETH");
        });
    });
  });


  it('ico is finished and all funds returned', () => {
    return EasyMineToken.deployed().then(token => {
      var blocksLeft = endBlock - web3.eth.blockNumber;
      rpcUtils.mineBlocks(blocksLeft + 2);
      return EasyMineIco.deployed().then(easyMineIco => {
        var initialBalance = web3.eth.getBalance(icoBidder);
        var initialEMBalance = web3.eth.getBalance(config.walletAddress).toString();
        return easyMineIco.sendTransaction({from: icoBidder, value: web3.toWei("20000", "ether"), gas: 2000000, gasPrice: 0})
          .then(trans => assert.isTrue(false,"Shouldn't be processed! "+trans))
          .catch( _ => easyMineIco.totalTokensSold())
          .then(totalTokensSold => {
            assert.equal(bigInt(totalTokensSold.toString()).toString(),bigInt("14285714285714285714285").toString(), "ICO Tokens sold when shouldn't");
            return easyMineIco.stage();
          })
          .then(stage => {
            assert.equal(stage.toString(), "3","Should be still 3 because no update");
            var currentBalance = web3.eth.getBalance(icoBidder).toString();
            assert.equal(currentBalance, initialBalance.toString(), "ETH wasn't returned");
            return EasyMineToken.deployed();
          })
          .then(token => token.balanceOf(icoBidder))
          .then(tokenBalance => {
            assert.equal(bigInt(tokenBalance.toString()).toString(), bigInt("14285714285714285714285").toString(), "Wrong amount EMT for icoBidder");
            var currentEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
            assert.equal(currentEMBalance.toString(), bigInt(initialEMBalance).toString(), "Wrong amount of ETH");
          });
      });
    });
  });


});
