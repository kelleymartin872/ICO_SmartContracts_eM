var SyncRequest = require('sync-request');

module.exports = {
  rpcReq: function(method, params) {
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
  },
  mineBlock: function() {
    this.rpcReq('evm_mine', []);
  },
  mineBlocks: function(n) {
    for (i = 0; i < n; i++) {
      this.mineBlock();
    }
  },
  increaseTime: function(bySeconds) {
    this.rpcReq('evm_increaseTime', [bySeconds]);
  },
  increaseTimeDays: function(numDays) {
    this.increaseTime(86400 * numDays);
  }
};
