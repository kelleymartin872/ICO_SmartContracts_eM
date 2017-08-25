pragma solidity ^0.4.13;

import "../Token/Token.sol";

contract IcoProxy {

  address public owner;

  address public icoAddress;

  Token public easyMineToken;

  uint256 public totalContributed;

  function IcoProxy(address _icoAddress, address _easyMineTokenAddress) {
    require(_icoAddress != 0x0);
    require(_easyMineTokenAddress != 0x0);

    owner = msg.sender;
    icoAddress = _icoAddress;
    easyMineToken = Token(_easyMineTokenAddress);
  }

  /* Fallback function */
  function()
    public
    payable {
    if (msg.sender != icoAddress) {
      require(msg.value > 0);

      uint256 initialBalance = this.balance;
      uint256 initialTokenBalance = easyMineToken.balanceOf(this);

      assert(icoAddress.send(msg.value));

      uint256 change = 0;
      if (this.balance > initialBalance) {
        change = this.balance - initialBalance;
        assert(msg.sender.send(change));
      }
      totalContributed += msg.value - change;

      uint256 newTokenBalance = easyMineToken.balanceOf(this);
      uint256 tokensBought = newTokenBalance - initialTokenBalance;
      if (tokensBought > 0) {
        assert(easyMineToken.transfer(msg.sender, tokensBought));
      }
    }
  }

  function withdrawAll()
    public {
    require(msg.sender == owner);

    uint256 tokenBalance = easyMineToken.balanceOf(this);
    assert(easyMineToken.transfer(owner, tokenBalance));
    assert(owner.send(this.balance));
  }
}
