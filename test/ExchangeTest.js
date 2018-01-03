var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineTokenWallet = artifacts.require("./EasyMineTokenWallet.sol");
var EasyMineExchange = artifacts.require("./EasyMineExchange.sol");

var BigNumber = require("bignumber.js");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('Exchange', accounts => {

  let owner = accounts[0];
  let wallet = accounts[1];
  let user1 = accounts[9];

  let walletAddr = "0x15b5ca95a31fcaee1aa298c877e065dc0d19fe3f";

  it('setup exchange contract', () => {
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineTokenWallet.deployed().then(tokenWallet => {
        return EasyMineExchange.deployed().then(easyMineExchange => {
          return tokenWallet.setup(easyMineToken.address, easyMineExchange.address, {from: config.ownerAddress})
            .then(_ => {
              rpcUtils.increaseTimeDays(182);
              rpcUtils.mineBlock();
              return tokenWallet.maxPossibleWithdrawal();
            }).then(maxWithdrawal => {
              return tokenWallet.withdraw(maxWithdrawal);
            }).then(_ => {
              return easyMineToken.balanceOf(easyMineExchange.address);
            })
            .then(exchangeBalance => {
              assert.equal(exchangeBalance.toString(), "3e+22");
              return easyMineExchange.setWallet(walletAddr, {from: config.ownerAddress});
            });
        });
      });
    });
  });

  it('exchange ETH for EMT', () => {
    let initialWalletBalance = web3.eth.getBalance(walletAddr);
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineExchange.deployed().then(easyMineExchange => {
        return easyMineExchange.setExchangeRate(web3.toWei("0.0008", "ether"), {from: config.ownerAddress}) // setting exchange rate to 0.0008
          .then(_ => {
            easyMineExchange.exchange({from: user1, value: web3.toWei("0.0024", "ether")}) // sending 0.0024 ETH
          })
          .then(_ => {
            return easyMineToken.balanceOf(user1);
          }).then(user1Balance => {
            assert.equal(user1Balance, web3.toWei("3", "ether")); // user should receive 3 EMT
            let endWalletBalance = web3.eth.getBalance(walletAddr);
            assert.equal(endWalletBalance.toString(), initialWalletBalance.plus(web3.toWei("0.0024", "ether")).toString());
          });
      });
    });
  });

  it('fail if there is insufficient EMT on the exchange ', () => {
    let initialWalletBalance = web3.eth.getBalance(walletAddr);
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineExchange.deployed().then(easyMineExchange => {
        return easyMineExchange.exchange({from: user1, value: web3.toWei("600000", "ether")})
          .then(_ => {
            assert.equal(true, false); // tx should not succeed
          }).catch(e => {
            if (e.name == "AssertionError") throw e;
          });
      });
    });
  });

  it('owner can transfer tokens', () => {
    let tokenReceiver = "0x54962C8e7f96452E71247eD62E09973875028Af7";
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineExchange.deployed().then(easyMineExchange => {
        return easyMineExchange.transferERC20Token(easyMineToken.address, tokenReceiver, 500, {from: config.ownerAddress})
          .then(_ => {
            return easyMineToken.balanceOf(tokenReceiver);
          })
          .then(receiverBalance => {
            assert.equal(receiverBalance, 500);
          });
      });
    });
  });

});
