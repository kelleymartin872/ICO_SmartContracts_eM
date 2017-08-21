var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");

var bigInt = require("big-integer");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO', accounts => {

  let owner = accounts[0];
  let sys = accounts[1];
  let icoBidder = accounts[7];
  let anotherIcoBidder = accounts[6];

  let startBlock = web3.eth.blockNumber + config.minStartDelay+5;

  it('not allow to bid', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.buyTokens({from: icoBidder, value: web3.toWei(10, "ether")})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('non-owner tries to schedule start', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.scheduleStart(startBlock, {from: icoBidder})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('owner tries to schedule auction start too soon', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.scheduleStart(10, {from: owner})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

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

  it('schedule start works only once', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.scheduleStart(startBlock, {from: owner})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
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

  it('second ico bid can be made', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).toString(), bigInt("25387500e18").toString(), "Wrong total sold");
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.equal(bigInt(tokenBalance.toString()).toString(), bigInt("25373214285714285714285715").toString(), "Wrong amount EMT for anotherIcoBidder");
          var currentEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
          assert.equal(currentEMBalance.toString(), bigInt("20000e18").add(initialEMBalance).toString(), "Wrong amount of ETH");
        });
    });
  });

  it('ico is finished and change returned', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialBalance = web3.eth.getBalance(anotherIcoBidder);
      var initialEMBalance = web3.eth.getBalance(config.walletAddress).toString();
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000, gasPrice: 0})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).toString(),bigInt("27000000e18").toString(), "ICO Tokens sold when shouldn't");
          return easyMineIco.stage();
        })
        .then(stage => {
          assert.equal(stage, 4);
          var currentBalance = web3.eth.getBalance(anotherIcoBidder).toString();
          assert.equal(currentBalance, initialBalance.minus(bigInt("1290e18")).toString(), "ETH wasn't returned");
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.equal(bigInt(tokenBalance.toString()).toString(), bigInt("26985714285714285714285715").toString(), "Wrong amount EMT for anotherIcoBidder");
          var currentEMBalance = bigInt(web3.eth.getBalance(config.walletAddress).toString());
          assert.equal(currentEMBalance.toString(), bigInt("1290e18").add(initialEMBalance).toString(), "Wrong amount of ETH");
        });
    });
  });

});
