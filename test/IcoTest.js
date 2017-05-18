var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");
var EasyMinePreIco = artifacts.require("./EasyMinePreIco.sol");

var bigInt = require("big-integer");
var SyncRequest = require('sync-request');

function rpcReq(method, params) {
  SyncRequest(
    'POST',
    'http://127.0.0.1:8545',
    {
      json: {
        'jsonrpc': '2.0',
        'method': method,
        'params': params,
        'id': 'asd'
      }
    }
  );
}

function mineBlock() {
  rpcReq('evm_mine', []);
}

function mineBlocks(n) {
  for (i = 0; i < n; i++) {
    mineBlock();
  }
}

function increaseTime(bySeconds) {
  rpcReq('evm_increaseTime', [bySeconds]);
}

contract('ICO', accounts => {

  let owner = accounts[0];
  let icoBidder = accounts[1];
  let preIcoBidder = accounts[2];
  let anotherIcoBidder = accounts[3];

  let startBlock = web3.eth.blockNumber + 3100;

  it('not allow to bid', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.bid(0, {from: icoBidder})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('non-owner tries to schedule auction start', () => {
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
      return easyMineIco.scheduleStart(2000, {from: owner})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('pre ico bid doesn\'t yet work', () => {
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.buyTokens({from: preIcoBidder, value: web3.toWei(30, "ether")})
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
          return easyMineIco.endBlock();
        })
        .then(endBlock => assert.equal(endBlock, startBlock + 198000));
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

  it('cannot bid non-started pre ico', () => {
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.buyTokens({from: preIcoBidder, value: web3.toWei(30, "ether")})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('non-owner cannot start pre ico', () => {
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.start({from: icoBidder})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('owner successfully starts pre ico', () => {
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.start({from: owner})
        .then(_ => easyMinePreIco.stage())
        .then(stage => assert.equal(stage, 2));
    });
  });

  it('pre ico bid can be made', () => {
    var easyMineIco = null;
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.buyTokens({from: preIcoBidder, value: web3.toWei(30, "ether")})
        .then(_ => easyMinePreIco.totalTokensSold())
        .then(totalTokensSold => {
          assert.equal(bigInt(totalTokensSold.toString()).equals(bigInt("1500e18")), true);
          return EasyMineIco.deployed();
        })
        .then(ico => {
          easyMineIco = ico;
          return easyMineIco.totalReceived();
        })
        .then(totalReceived => {
          assert.equal(bigInt(totalReceived.toString()).equals(bigInt("30e18")), true);
          return easyMineIco.bids(preIcoBidder);
        })
        .then(bid => {
          assert.equal(bigInt(bid.toString()).equals(bigInt("30e18")), true);
          return EasyMineToken.deployed();
        })
        .then(token => token.balanceOf(preIcoBidder))
        .then(tokenBalance => assert.equal(bigInt(tokenBalance.toString()).equals(bigInt("1500e18")), true));
    });
  });

  it('action should be started at start block', () => {
    var blocksLeft = startBlock - web3.eth.blockNumber;
    mineBlocks(blocksLeft + 1);
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.updateStage()
        .then(_ => easyMineIco.stage())
        .then(stage => assert.equal(stage, 3));
    });
  });

  it('pre ico bid can no longer be made', () => {
    return EasyMinePreIco.deployed().then(easyMinePreIco => {
      return easyMinePreIco.buyTokens({from: preIcoBidder, value: web3.toWei(30, "ether")})
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('ico bid can be made', () => {
    var startBlock = null;

    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.bid(0, {from: icoBidder, value: web3.toWei("499000", "ether")}) // 399k ether
        .then(_ => easyMineIco.bids(icoBidder))
        .then(bid => {
          assert.equal(bigInt(bid.toString()).equals(bigInt("499000e18")), true);
          return easyMineIco.totalReceived();
        })
        .then(totalReceived => {
          assert.equal(bigInt(totalReceived.toString()).equals(bigInt("499030e18")), true);
          return easyMineIco.startBlock();
        })
        .then(sb => {
          startBlock = sb;
          return easyMineIco.endBlock();
        })
        .then(endBlock => assert.equal(bigInt(endBlock).equals(bigInt(startBlock).plus(181517)), true));
    });
  });

  it('ico is finished and change returned', () => {
    var startBlock = null;

    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.bid(0, {from: anotherIcoBidder, value: web3.toWei("100000", "ether")}) // 100k ether
        .then(_ => easyMineIco.bids(anotherIcoBidder))
        .then(bid => {
          assert.equal(bigInt(bid.toString()).equals(bigInt("970e18")), true);
          return easyMineIco.totalReceived();
        })
        .then(totalReceived => {
          assert.equal(bigInt(totalReceived.toString()).equals(bigInt("500000e18")), true);
          return easyMineIco.stage();
        })
        .then(stage => {
          assert.equal(stage, 4);
          return easyMineIco.startBlock();
        })
        .then(sb => {
          startBlock = sb;
          return easyMineIco.finalPrice();
        })
        .then(finalPrice => {
          var blocksPassed = web3.eth.blockNumber - startBlock;
          var expectedPrice = bigInt("0.2e18").minus(bigInt(blocksPassed).multiply("0.000001e18"));
          assert.equal(bigInt(finalPrice).equals(expectedPrice), true);
        });
    });
  });

  it('cannot yet claim tokens', () => {
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.claimTokens(0, {from: icoBidder}) // 100k ether
        .then(_ => {
          assert.equal(true, false); // tx should not succeed
        }).catch(e => {
          if (e.name == "AssertionError") throw e;
        });
    });
  });

  it('can claim tokens', () => {
    increaseTime(864000); // 10 days
    mineBlock();
    return EasyMineIco.deployed().then(easyMineIco => {
      return easyMineIco.claimTokens(0, {from: icoBidder}) // 100k ether
        .then(_ => EasyMineToken.deployed())
        .then(token => token.balanceOf(icoBidder))
        .then(balance => console.log("balance=" + balance.toString()));
    });
  });

});

