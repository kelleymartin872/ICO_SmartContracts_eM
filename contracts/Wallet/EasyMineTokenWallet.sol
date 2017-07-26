pragma solidity ^0.4.10;

import "../Token/Token.sol";

contract EasyMineTokenWallet {

  uint256 constant public VESTING_PERIOD = 180 days;
  uint256 constant public DAILY_FUNDS_RELEASE = 15000 * 10**18; // 0.5% * 3M tokens = 15k tokens a day

  address public owner;
  Token public easyMineToken;
  uint256 public startTime;
  uint256 public totalWithdrawn;

  modifier isOwner() {
    if (msg.sender != owner) {
      revert();
    }
    _;
  }

  function EasyMineTokenWallet() {
    owner = msg.sender;
  }

  function setup(address _easyMineToken)
    public
    isOwner
  {
    if (_easyMineToken == 0) {
      revert();
    }
    easyMineToken = Token(_easyMineToken);
    startTime = now;
  }

  function withdraw(uint256 requestedAmount)
    public
    isOwner
  {
    uint256 limit = maxPossibleWithdrawal();
    uint256 withdrawalAmount = requestedAmount;
    if (requestedAmount > limit) {
      withdrawalAmount = limit;
    }

    if (withdrawalAmount > 0) {
      easyMineToken.transfer(owner, withdrawalAmount);
      totalWithdrawn += withdrawalAmount;
    }
  }

  function maxPossibleWithdrawal()
    public
    constant
    returns (uint256)
  {
    if (startTime + VESTING_PERIOD < now) {
      return 0;
    } else {
      uint256 daysPassed = (now - startTime + VESTING_PERIOD) / 86400;
      return DAILY_FUNDS_RELEASE * daysPassed - totalWithdrawn;
    }
  }

}
