pragma solidity ^0.4.13;

import "../Token/EasyMineToken.sol";
import "./EasyMineIco.sol";

contract EasyMinePreIco {

  /* Maximum number of tokens sold during pre ICO */
  uint256 constant public PRE_ICO_TOKENS = 2000000 * 10**18; // 2M EMT

  /* Pre ICO token price */
  uint256 constant public PRICE = 0.02 * 10**18;

  /* Minimum pre ICO contribution value */
  uint256 constant public MIN_VALUE = 20 * 10**18; // 20 ether

  /* The easyMINE token */
  EasyMineToken public easyMineToken;

  /* The easyMINE ICO */
  EasyMineIco public easyMineIco;

  /* Owner of this contract */
  address public owner;

  /* Current stage */
  Stages public stage;

  /* Total number of tokens sold */
  uint256 public totalTokensSold;

  enum Stages {
    Deployed,
    SetUp,
    Started,
    Closed
  }

  modifier atStage(Stages _stage) {
    require(stage == _stage);
    _;
  }

  modifier isOwner() {
    require(msg.sender == owner);
    _;
  }

  function EasyMinePreIco() {
    owner = msg.sender;
    stage = Stages.Deployed;
  }

  /* Fallback function */
  function()
    public
    payable {
    if (stage == Stages.Started) {
      buyTokens();
    } else {
      revert();
    }
  }

  /* Sets up the contract with token and ICO addresses */
  function setup(address _easyMineToken, address _ico)
    isOwner
    atStage(Stages.Deployed)
  {
    require(_easyMineToken != 0x0);
    require(_ico != 0x0);

    easyMineToken = EasyMineToken(_easyMineToken);
    easyMineIco = EasyMineIco(_ico);

    // Validate token balance
    assert(easyMineToken.balanceOf(this) == PRE_ICO_TOKENS);

    stage = Stages.SetUp;
  }

  /* Starts the pre ICO */
  function start()
    public
    isOwner
    atStage(Stages.SetUp)
  {
    stage = Stages.Started;
  }

  /* Function used to participate in the pre ICO. */
  function buyTokens()
    public
    payable
    atStage(Stages.Started) {

    uint256 tokensLeft = PRE_ICO_TOKENS - totalTokensSold;
    assert(tokensLeft > 0);

    uint256 value = msg.value;
    require(value >= MIN_VALUE);

    uint256 tokensToReceive = (value * 10**18) / PRICE;

    if (tokensLeft < tokensToReceive) {
      // there are not enough tokens left we need to send back change
      tokensToReceive = tokensLeft;
      uint256 change = value - (PRICE * tokensToReceive) / 10**18;
      value -= change;
      if (!msg.sender.send(change)) {
        // sending change failed
        revert();
      }
    }

    // assign the tokens
    // and bid the ICO contract
    totalTokensSold += tokensToReceive;
    if (!easyMineToken.transfer(msg.sender, tokensToReceive)) {
      revert();
    }
    easyMineIco.preIcoBid.value(value)(msg.sender);
  }

  /* Closes the pre ICO, burning all unsold tokens. */
  function close()
    public
    isOwner
    atStage(Stages.Started) {
    // burn all remaining tokens
    uint256 remainingTokens = PRE_ICO_TOKENS - totalTokensSold;
    if (remainingTokens > 0) {
      easyMineToken.burn(remainingTokens);
    }
    stage = Stages.Closed;
  }

  /* Transfer any ether accidentally left in this contract */
  function cleanup()
    public
    isOwner
    atStage(Stages.Closed)
  {
    if (!owner.send(this.balance)) {
      revert();
    }
  }

}
