var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineTokenWallet = artifacts.require("./EasyMineTokenWallet.sol");

var BigNumber = require("bignumber.js");
var rpcUtils = require('./TestrpcUtils.js');

contract('EasyMineTokenWallet', accounts => {

  it('balances should be ok', () => {
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineTokenWallet.deployed().then(tokenWallet => {
        return easyMineToken.balanceOf(tokenWallet.address)
          .then(balance => {
            assert.isTrue(balance.equals(new BigNumber("3000000e18")));
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
      .then(maxWithdrawal => assert.isTrue(maxWithdrawal.equals(new BigNumber("30000e18"))));
  });

  it('withdrawal is possible', () => {
    return EasyMineToken.deployed().then(easyMineToken => {
      return EasyMineTokenWallet.deployed().then(tokenWallet => {
        return tokenWallet.withdraw(new BigNumber("29000e18"))
          .then(_ => tokenWallet.withdrawalAddress())
          .then(withdrawalAddress => easyMineToken.balanceOf(withdrawalAddress))
          .then(bal => assert.isTrue(bal.equals(new BigNumber("29000e18"))))
          .then(_ => tokenWallet.maxPossibleWithdrawal())
          .then(maxWithdrawal => assert.isTrue(maxWithdrawal.equals(new BigNumber("1000e18"))));
      });
    });
  });

  it('max withdrawal is updated after one more day', () => {
    rpcUtils.increaseTimeDays(1);
    rpcUtils.mineBlock();
    return EasyMineTokenWallet.deployed().then(tokenWallet => tokenWallet.maxPossibleWithdrawal())
      .then(maxWithdrawal => assert.isTrue(maxWithdrawal.equals(new BigNumber("16000e18"))));
  });

});
