pragma solidity ^0.4.13;

import "../Token/Token.sol";

contract EasyMineExchange {

  /* The easyMINE token */
  Token public easyMineToken;

  /* The owner of this contract */
  address public owner;

  /* Wallet that receives ETH */
  address public wallet;

  /* Current ETH->EMT exchange rate */
  uint256 public exchangeRate;

  modifier isOwner() {
    require(msg.sender == owner);
    _;
  }

  function EasyMineExchange(address _easyMineToken, address _wallet, uint256 _exchangeRate)
    public {
    require(_easyMineToken != 0x0);
    require(_wallet != 0x0);
    require(_exchangeRate != 0);

    owner = msg.sender;
    wallet = _wallet;
    easyMineToken = Token(_easyMineToken);
    exchangeRate = _exchangeRate;
  }

  /* Fallback function */
  function()
    public
    payable {
    exchange();
  }

  function exchange()
    public
    payable {
    require(msg.value > 0);

    uint256 tokensToReceive = (msg.value * 10**18) / exchangeRate;
    if (easyMineToken.balanceOf(this) >= tokensToReceive) {
      // if the exchange has sufficient EMT tokens, finalize the transactoins
      assert(easyMineToken.transfer(msg.sender, tokensToReceive));
      assert(wallet.send(msg.value));
    } else {
      // revert if there is insufficient EMT in the exchange
      revert();
    }
  }

  function setWallet(address _wallet)
    public
    isOwner {
    wallet = _wallet;
  }

  function setExchangeRate(uint256 _exchangeRate)
    public
    isOwner {
    exchangeRate = _exchangeRate;
  }

  /* In case of accidental token transfer to this address, owner can transfer it elsewhere */
  function transferERC20Token(address _tokenAddress, address _to, uint256 _value)
    public
    isOwner {
    Token token = Token(_tokenAddress);
    assert(token.transfer(_to, _value));
  }

}
