pragma solidity ^0.4.10;

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
    if (stage != _stage) {
      throw;
    }
    _;
  }

  modifier isOwner() {
    if (msg.sender != owner) {
      throw;
    }
    _;
  }

  function EasyMinePreIco() {
    owner = msg.sender;
    stage = Stages.Deployed;
  }

  /* Sets up the contract with token and ICO addresses */
  function setup(address _easyMineToken, address _ico)
    isOwner
    atStage(Stages.Deployed)
  {
    if (_easyMineToken == 0 || _ico == 0) {
      throw;
    }
    easyMineToken = EasyMineToken(_easyMineToken);
    easyMineIco = EasyMineIco(_ico);

    // Validate token balance
    if (easyMineToken.balanceOf(this) != PRE_ICO_TOKENS) {
      throw;
    }
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

    if (tokensLeft < 1) {
      // no more pre ICO tokens
      revert();
    }

    uint256 value = msg.value;

    if (value < MIN_VALUE) {
      // value less than required minimum
      revert();
    }

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
    easyMineToken.transfer(msg.sender, tokensToReceive);
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

}
