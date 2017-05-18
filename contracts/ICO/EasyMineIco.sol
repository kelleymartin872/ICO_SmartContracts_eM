pragma solidity ^0.4.10;

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

  modifier isPreIco() {
    if (msg.sender != preIcoAddress) {
      throw;
    }
    _;
  }

  modifier isValidPayload() {
    if (msg.data.length != 4 && msg.data.length != 36) {
      throw;
    }
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
    if (_wallet == 0) {
      throw;
    }
    owner = msg.sender;
    wallet = _wallet;
    stage = Stages.AuctionDeployed;
  }

  /* Sets up the token and pre ICO addresses */
  function setup(address _easyMineToken, address _preIcoAddress)
    public
    isOwner
    atStage(Stages.AuctionDeployed)
  {
    if (_easyMineToken == 0 || _preIcoAddress == 0) {
      throw;
    }
    easyMineToken = EasyMineToken(_easyMineToken);
    preIcoAddress = _preIcoAddress;
    // Validate token balance
    if (easyMineToken.balanceOf(this) != MAX_TOKENS_SOLD) {
      throw;
    }
    stage = Stages.AuctionSetUp;
  }

  /* Schedules start of the auction */
  function scheduleStart(uint256 _startBlock)
    public
    isOwner
    atStage(Stages.AuctionSetUp)
  {
    // Start allowed minimum 3000 blocks from now
    if (block.number + 3000 >= _startBlock) {
      throw;
    }
    startBlock = _startBlock;
    endBlock = startBlock + MAX_DURATION_BLOCKS;
    stage = Stages.AuctionStartScheduled;
  }

  /* Submits a pre ICO bid */
  function preIcoBid(address _receiver)
    public
    payable
    isPreIco
    timedTransitions
    atStage(Stages.AuctionStartScheduled)
  {
    uint256 amount = msg.value;
    if (_receiver == 0 || amount == 0) {
      throw;
    }
    if (!wallet.send(amount)) {
      throw;
    }
    bids[_receiver] += amount;
    totalReceived += amount;

    if (totalReceived > PRE_ICO_BIDS_CEILING) {
      throw;
    }

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
  function bid(address receiver)
    public
    payable
    isValidPayload
    timedTransitions
    atStage(Stages.AuctionStarted)
    returns (uint amount)
  {
    // If a bid is done on behalf of a user via ShapeShift, the receiver address is set.
    if (receiver == 0) {
      receiver = msg.sender;
    }
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

      if (!receiver.send(msg.value - amount)) {
        throw;
      }
    }

    if (amount <= 0) {
      throw;
    }

    if (!wallet.send(amount)) {
      throw;
    }

    bids[receiver] += amount;
    totalReceived += amount;

    updateEndBlock();

    if (amount == maxBid) {
      finalizeAuction();
    }

    BidSubmission(receiver, amount);
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
  function claimTokens(address receiver)
    public
    isValidPayload
    timedTransitions
    atStage(Stages.TradingStarted)
  {
    if (receiver == 0) {
      receiver = msg.sender;
    }

    if (bids[receiver] == 0) {
      throw;
    }

    uint256 tokenCount = bids[receiver] * 10**18 / finalPrice;
    bids[receiver] = 0;
    easyMineToken.transfer(receiver, tokenCount);
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
