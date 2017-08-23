var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");

var BigNumber = require("bignumber.js");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO', accounts => {

  let owner = accounts[0];
  let sys = accounts[1];
  let icoBidder = accounts[7];
  let anotherIcoBidder = accounts[8];

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
      const expectedTokenCount = new BigNumber("14285714285714285714285");
      var initialEMBalance = web3.eth.getBalance(config.walletAddress);
      return easyMineIco.sendTransaction({from: icoBidder, value: web3.toWei("10", "ether"), gas: 2000000})
        .then(_ => easyMineIco.priceThresholds(0))
        .then(firstThreshold => {
          assert.isTrue(firstThreshold[2].equals(expectedTokenCount));
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
          assert.isTrue(totalTokensSold.equals(expectedTokenCount));
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(icoBidder))
        .then(tokenBalance => {
          assert.isTrue(tokenBalance.equals(expectedTokenCount), "Wrong amount EMT for icoBidder");
          var currentEMBalance = web3.eth.getBalance(config.walletAddress);
          assert.isTrue(currentEMBalance.equals(new BigNumber("10e18").add(initialEMBalance)), "Wrong amount of ETH");
        });
    });
  });

  it('second ico bid can be made', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialEMBalance = web3.eth.getBalance(config.walletAddress);
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.isTrue(totalTokensSold.equals(new BigNumber("25387500e18")), "Wrong total sold");
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.isTrue(tokenBalance.equals(new BigNumber("25373214285714285714285715")), "Wrong amount EMT for anotherIcoBidder");
          var currentEMBalance = web3.eth.getBalance(config.walletAddress);
          assert.isTrue(currentEMBalance.equals(new BigNumber("20000e18").add(initialEMBalance)), "Wrong amount of ETH");
        });
    });
  });

  it('ico is finished and change returned', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialBalance = web3.eth.getBalance(anotherIcoBidder);
      var initialEMBalance = web3.eth.getBalance(config.walletAddress);
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000, gasPrice: 0})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.isTrue(totalTokensSold.equals(new BigNumber("27000000e18")), "ICO Tokens sold when shouldn't");
          return easyMineIco.stage();
        })
        .then(stage => {
          assert.equal(stage, 4);
          var currentBalance = web3.eth.getBalance(anotherIcoBidder);
          assert.isTrue(currentBalance.equals(initialBalance.minus(new BigNumber("1290e18"))), "ETH wasn't returned");
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.isTrue(tokenBalance.equals(new BigNumber("26985714285714285714285715")), "Wrong amount EMT for anotherIcoBidder");
          var currentEMBalance = web3.eth.getBalance(config.walletAddress);
          assert.isTrue(currentEMBalance.equals(new BigNumber("1290e18").add(initialEMBalance)), "Wrong amount of ETH");
        });
    });
  });

});
