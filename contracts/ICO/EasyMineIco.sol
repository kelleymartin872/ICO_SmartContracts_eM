pragma solidity ^0.4.13;

import "../Token/EasyMineToken.sol";

contract EasyMineIco {

  event BidSubmission(address indexed sender, uint256 amount);

  /* Maximum number of tokens sold during ICO */
  uint256 constant public MAX_TOKENS_SOLD = 27000000 * 10**18; // 27,000,000 tokens

  /* Waiting period before claiming the tokens after ICO ended */
  uint256 constant public WAITING_PERIOD = 7 days;

  /* Maximum duration of ICO */
  uint256 constant public MAX_DURATION_BLOCKS = 198000;

  /* Maximum amount of ether collected during ICO */
  uint256 constant public AUCTION_BIDS_CEILING = 500000 * 10**18; // 500,000 ether

  /* Maximum number of ether collected during pre ICO */
  uint256 constant public PRE_ICO_BIDS_CEILING = 40000 * 10**18; // 40,000 ether

  /* Auction starting price */
  uint256 constant public INITIAL_PRICE = 0.2 * 10**18; // 0.2 ETC for 1 EMT initially

  /* How much the price is reduced in each block */
  uint256 constant public PRICE_REDUCTION_PER_BLOCK = 0.000001 * 10**18;

  /* The owner of this contract */
  address public owner;

  /* The easyMINE wallet address */
  address public wallet;

  /* The easyMINE token */
  EasyMineToken public easyMineToken;

  /* Pre ICO contract address */
  address public preIcoAddress;

  /* Auction starting block */
  uint256 public startBlock;

  /* Auction end time */
  uint256 public endTime;

  /* Total amount of ether received */
  uint256 public totalReceived;

  /* Auction final price */
  uint256 public finalPrice;

  /* Foreseen auction end block */
  uint256 public endBlock;

  /* Auction bids */
  mapping (address => uint256) public bids;

  /* Current stage */
  Stages public stage;

  enum Stages {
    AuctionDeployed,
    AuctionSetUp,
    AuctionStartScheduled,
    AuctionStarted,
    AuctionEnded,
    TradingStarted
  }

  modifier atStage(Stages _stage) {
    require(stage == _stage);
    _;
  }

  modifier isOwner() {
    require(msg.sender == owner);
    _;
  }

  modifier isPreIco() {
    require(msg.sender == preIcoAddress);
    _;
  }

  modifier isValidPayload() {
    require(msg.data.length == 0 || msg.data.length == 4);
    _;
  }

  modifier timedTransitions() {
    if (stage == Stages.AuctionStartScheduled && block.number >= startBlock) {
      stage = Stages.AuctionStarted;
    }
    if (stage == Stages.AuctionStarted && block.number >= endBlock) {
      finalizeAuction();
    }
    if (stage == Stages.AuctionEnded && now > endTime + WAITING_PERIOD) {
      stage = Stages.TradingStarted;
    }
    _;
  }

  function EasyMineIco(address _wallet)
    public {
    require(_wallet != 0x0);

    owner = msg.sender;
    wallet = _wallet;
    stage = Stages.AuctionDeployed;
  }

  /* Fallback function */
  function()
    public
    payable
    timedTransitions {
    if (stage == Stages.AuctionStarted) {
      bid();
    } else if (stage == Stages.TradingStarted) {
      claimTokens();
    } else {
      revert();
    }
  }

  /* Sets up the token and pre ICO addresses */
  function setup(address _easyMineToken, address _preIcoAddress)
    public
    isOwner
    atStage(Stages.AuctionDeployed)
  {
    require(_easyMineToken != 0x0);
    require(_preIcoAddress != 0x0);

    easyMineToken = EasyMineToken(_easyMineToken);
    preIcoAddress = _preIcoAddress;

    // Validate token balance
    assert(easyMineToken.balanceOf(this) == MAX_TOKENS_SOLD);

    stage = Stages.AuctionSetUp;
  }

  /* Schedules start of the auction */
  function scheduleStart(uint256 _startBlock)
    public
    isOwner
    atStage(Stages.AuctionSetUp)
  {
    // Start allowed minimum 3000 blocks from now
    require(_startBlock > block.number + 3000);

    startBlock = _startBlock;
    endBlock = startBlock + MAX_DURATION_BLOCKS;
    stage = Stages.AuctionStartScheduled;
  }

  /* Submits a pre ICO bid */
  function preIcoBid(address _receiver)
    external
    payable
    isPreIco
    timedTransitions
    atStage(Stages.AuctionStartScheduled)
  {
    uint256 amount = msg.value;
    require(_receiver != 0x0);
    require(amount != 0x0);

    assert(wallet.send(amount));

    bids[_receiver] += amount;
    totalReceived += amount;

    assert(totalReceived <= PRE_ICO_BIDS_CEILING);

    updateEndBlock();

    BidSubmission(_receiver, amount);
  }

  function updateStage()
    public
    timedTransitions
    returns (Stages)
  {
    return stage;
  }

  /* Submits a bid */
  function bid()
    public
    payable
    isValidPayload
    timedTransitions
    atStage(Stages.AuctionStarted)
    returns (uint256 amount)
  {
    amount = msg.value;

    uint256 currentPrice = calcCurrentTokenPrice();

    uint256 maxBidByCeiling = AUCTION_BIDS_CEILING - totalReceived;

    uint256 maxBidBySoldTokens = (MAX_TOKENS_SOLD / 10**18) * currentPrice - totalReceived;

    uint256 maxBid;
    if (maxBidByCeiling > maxBidBySoldTokens) {
      maxBid = maxBidBySoldTokens;
    } else {
      maxBid = maxBidByCeiling;
    }

    if (amount > maxBid) {
      amount = maxBid;

      assert(msg.sender.send(msg.value - amount));
    }

    assert(amount > 0);
    assert(wallet.send(amount));

    bids[msg.sender] += amount;
    totalReceived += amount;

    updateEndBlock();

    if (amount == maxBid) {
      finalizeAuction();
    }

    BidSubmission(msg.sender, amount);
  }

  /* updates the foreseen end block */
  function updateEndBlock() private {
    // the minimum price we can reach not to exceed max tokens count
    uint256 minimumPrice = totalReceived * 10**18 / MAX_TOKENS_SOLD;

    // block at which minimum price will be reached
    uint256 minimumPriceBlock = startBlock + (INITIAL_PRICE - minimumPrice) / PRICE_REDUCTION_PER_BLOCK;

    // if minimum price will be reached sooner than current endBlock, update it
    if (minimumPriceBlock < endBlock) {
      endBlock = minimumPriceBlock;
    }
  }

  /* Claims the tokens after auction ended */
  function claimTokens()
    public
    isValidPayload
    timedTransitions
    atStage(Stages.TradingStarted)
  {
    require(bids[msg.sender] != 0);

    uint256 tokenCount = bids[msg.sender] * 10**18 / finalPrice;
    bids[msg.sender] = 0;
    assert(easyMineToken.transfer(msg.sender, tokenCount));
  }

  /* Transfer any ether accidentally left in this contract */
  function cleanup()
    public
    isOwner
    timedTransitions
    atStage(Stages.TradingStarted)
  {
    assert(owner.send(this.balance));
  }

  function calcCurrentTokenPrice()
    constant
    public
    returns (uint256) {
    return calcTokenPrice(block.number);
  }

  function calcTokenPrice(uint256 blockNumber)
    constant
    public
    returns (uint256)
  {
    uint256 blockDiff = blockNumber - startBlock;
    uint256 priceReduction = blockDiff * PRICE_REDUCTION_PER_BLOCK;
    return INITIAL_PRICE - priceReduction;
  }

  function finalizeAuction()
    private
  {
    stage = Stages.AuctionEnded;
    endTime = now;

    if (block.number > endBlock) {
      // if the acution has ended at endBlock, final price is the price at that block
      finalPrice = calcTokenPrice(endBlock);
    } else {
      // if the auction has ended before reaching endBlock, final price is the price at current block
      finalPrice = calcTokenPrice(block.number);
    }
    // burn unsold tokens
    uint256 soldTokens = (totalReceived * 10**18) / finalPrice;
    uint256 unsoldTokens = MAX_TOKENS_SOLD - soldTokens;

    if (unsoldTokens > 0) {
      easyMineToken.burn(unsoldTokens);
    }
  }

}
