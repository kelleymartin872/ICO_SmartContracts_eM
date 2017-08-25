
var EasyMineToken = artifacts.require("./EasyMineToken.sol");
var EasyMineIco = artifacts.require("./EasyMineIco.sol");
var IcoProxy = artifacts.require("./IcoProxy.sol");

var BigNumber = require("bignumber.js");
var rpcUtils = require('./TestrpcUtils.js');
var config = require('../migrations/config-test.json');

contract('ICO Proxy', accounts => {

  let owner = accounts[0];
  let proxyBidder = accounts[9];

  let startBlock = web3.eth.blockNumber + config.minStartDelay+5;

  it('bid via proxy contract can be made', () => {
    const expectedTokenCount = new BigNumber("14285714285714285714285");
    var initialEMBalance = web3.eth.getBalance(config.walletAddress);
    return EasyMineIco.deployed().then(easyMineIco => {
      return EasyMineToken.deployed().then(easyMineToken => {
        return IcoProxy.new(easyMineIco.address, easyMineToken.address, {from: owner}).then(proxy => {
          return easyMineIco.scheduleStart(startBlock, {from: owner})
            .then(_ => {
              var blocksLeft = startBlock - web3.eth.blockNumber;
              rpcUtils.mineBlocks(blocksLeft + 1);
              return easyMineIco.updateStage();
            })
            .then(_ => proxy.sendTransaction({from: proxyBidder, value: web3.toWei("10", "ether"), gas: 3000000}))
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
            .then(token => token.balanceOf(proxyBidder))
            .then(tokenBalance => {
              assert.isTrue(tokenBalance.equals(expectedTokenCount), "Wrong amount EMT for icoBidder");
              var currentEMBalance = web3.eth.getBalance(config.walletAddress);
              assert.isTrue(currentEMBalance.equals(new BigNumber("10e18").add(initialEMBalance)), "Wrong amount of ETH");
              return proxy.totalContributed();
            })
            .then(totalContributed => { console.log("total: " + totalContributed.toString()); assert.isTrue(totalContributed.equals(new BigNumber("10e18"))) });
        });
      });
    });
  });

});
