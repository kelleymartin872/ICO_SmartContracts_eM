var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");

var bigInt = require("big-integer");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO', accounts => {

  let owner = accounts[0];
  let sys = accounts[1];
  let icoBidder = accounts[2];
  let anotherIcoBidder = accounts[3];

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

  it('ico bid can be made', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.sendTransaction({from: icoBidder, value: web3.toWei("20000", "ether"), gas: 2000000})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).equals(bigInt("25375000e18")), true);
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(icoBidder))
        .then(tokenBalance => {
          console.log(tokenBalance.toString());
          assert.equal(bigInt(tokenBalance.toString()).equals(bigInt("25375000e18")), true);
          assert.equal(bigInt(web3.eth.getBalance(config.walletAddress).toString()).equals(bigInt("20000e18")), true);
        });
    });
  });

  it('ico is finished and change returned', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      var initialBalance = web3.eth.getBalance(anotherIcoBidder);
      return easyMineIco.sendTransaction({from: anotherIcoBidder, value: web3.toWei("20000", "ether"), gas: 2000000, gasPrice: 0})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).equals(bigInt("27000000e18")), true);
          return easyMineIco.stage();
        })
        .then(stage => {
          assert.equal(stage, 4);
          var currentBalance = web3.eth.getBalance(anotherIcoBidder);
          var balanceDiff = bigInt(initialBalance.toString()).minus(bigInt(currentBalance.toString()));
          assert.equal(balanceDiff.equals(bigInt("1300e18")), true);
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(anotherIcoBidder))
        .then(tokenBalance => {
          assert.equal(bigInt(tokenBalance.toString()).equals(bigInt("1625000e18")), true);
          assert.equal(bigInt(web3.eth.getBalance(config.walletAddress).toString()).equals(bigInt("21300e18")), true);
        });
    });
  });

});
