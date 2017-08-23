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


  it('initial balance of ICO',() => {
    return EasyMineToken.deployed().then(token => {
      return EasyMineIco.deployed().then(ico =>{
        return token.balanceOf(ico.address)
        .then(balance => {
          assert.equal(bigInt(balance.toString()).toString(),bigInt("27000000e18").toString(),"Wrong initial balance of ICO");
        });
      });
    });
  });

  it('making a reservation', () => {
    var amount = bigInt("1e18");
    return EasyMineToken.deployed().then(token => {
      return token.balanceOf(config.reservationAddress)
      .then( initialBalance => {
        var expectedBalance = bigInt(initialBalance.toString()).add(amount);
        return EasyMineIco.deployed().then(easyMineIco => {
          return easyMineIco.totalTokensSold()
            .then(total => {
              var expectedTokensSold = bigInt(total.toString()).add(amount);
              return easyMineIco.reserveTokens(amount.toString(), {from: sys})
              .then(_ => easyMineIco.totalTokensSold())
              .then(totalTokensSold => {
                assert.equal(bigInt(totalTokensSold.toString()).toString(), expectedTokensSold.toString(), "Wrong total sold");
                return token.balanceOf(config.reservationAddress)
                .then(tokenBalance => {
                  assert.equal(bigInt(tokenBalance.toString()).toString(), expectedBalance.toString(), "Wrong amount EMT for reservationAddress");
                  return token.balanceOf(easyMineIco.address)
                  .then(icoBalance => {
                    assert.equal(bigInt(icoBalance.toString()).toString(), bigInt("26999999e18").toString(), "Wrong amount EMT on ICO address");
                  });
                });
              });
            });
        });
      });
    });
  });

  it('making a final reservation', () => {
    var amount = bigInt("30000000e18");
    var expected = bigInt("27000000e18");

    return EasyMineToken.deployed().then(token => {
      return EasyMineIco.deployed().then(easyMineIco => {
        return easyMineIco.reserveTokens(amount.toString(), {from: sys})
        .then(_ => easyMineIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).toString(), expected.toString(), "Wrong total sold");
          return token.balanceOf(easyMineIco.address)
          .then(icoBalance => {
            assert.equal(bigInt(icoBalance.toString()).toString(), bigInt("0").toString(), "Wrong amount EMT left on ICO");
            return token.balanceOf(config.reservationAddress)
            .then(tokenBalance => {
              assert.equal(bigInt(tokenBalance.toString()).toString(), expected.toString(), "Wrong amount EMT for reservationAddress");
            });
          });
        });
      });
    });
  });
});
