var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineTokenWallet = artifacts.require("./EasyMineTokenWallet.sol");

var bigInt = require("big-integer");
var rpcUtils = require('./TestrpcUtils.js');

contract('EasyMineTokenWallet', accounts => {

  it('balances should be ok', () => {
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineTokenWallet.deployed().then(tokenWallet => {
        return easyMineToken.balanceOf(tokenWallet.address)
          .then(balance => {
            assert.equal(bigInt(balance.toString()).equals(bigInt("3000000e18")), true);
            return tokenWallet.owner();
          })
          .then(owner => easyMineToken.balanceOf(owner))
          .then(balance => assert.equal(balance, 0));
      });
    });
  });

  it('max possible withdrawal is 0', () => {
    return EasyMineTokenWallet.deployed().then(tokenWallet => tokenWallet.maxPossibleWithdrawal())
      .then(maxWithdrawal => assert.equal(maxWithdrawal, 0));
  });

  it('max withdrawal is still 0 after 179 days', () => {
    rpcUtils.increaseTimeDays(179);
    rpcUtils.mineBlock();
    return EasyMineTokenWallet.deployed().then(tokenWallet => tokenWallet.maxPossibleWithdrawal())
      .then(maxWithdrawal => assert.equal(maxWithdrawal, 0));
  });

  it('max withdrawal is 30k after 3 more days', () => {
    rpcUtils.increaseTimeDays(3);
    rpcUtils.mineBlock();
    return EasyMineTokenWallet.deployed().then(tokenWallet => tokenWallet.maxPossibleWithdrawal())
      .then(maxWithdrawal => assert.equal(bigInt(maxWithdrawal.toString()).equals(bigInt("30000e18")), true));
  });

  it('withdrawal is possible', () => {
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineTokenWallet.deployed().then(tokenWallet => {
        return tokenWallet.withdraw(bigInt("29000e18").toString())
          .then(_ => tokenWallet.withdrawalAddress())
          .then(withdrawalAddress => easyMineToken.balanceOf(withdrawalAddress))
          .then(bal => assert.equal(bigInt(bal.toString()).equals(bigInt("29000e18")), true))
          .then(_ => tokenWallet.maxPossibleWithdrawal())
          .then(maxWithdrawal => assert.equal(bigInt(maxWithdrawal.toString()).equals(bigInt("1000e18")), true));
      });
    });
  });

  it('max withdrawal is updated after one more day', () => {
    rpcUtils.increaseTimeDays(1);
    rpcUtils.mineBlock();
    return EasyMineTokenWallet.deployed().then(tokenWallet => tokenWallet.maxPossibleWithdrawal())
      .then(maxWithdrawal => assert.equal(bigInt(maxWithdrawal.toString()).equals(bigInt("16000e18")), true));
  });

});
