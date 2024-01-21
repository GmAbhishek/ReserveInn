// SPDX-License-Identifier: GPL-3.0
pragma solidity >=0.8.0 <0.9.0;

import "../Hedera/HederaResponseCodes.sol";
import "../Hedera/IHederaTokenService.sol";
import "../Hedera/HederaTokenService.sol";
import "../Hedera/ExpiryHelper.sol";
import "../Hedera/KeyHelper.sol";
import "./Ticket.sol";
import "./Section.sol";
import {
  Unauthorized,
  VenueAndEntertainerAreRequired,
  VenueFeeTooHigh,
  ContractNotFinalized,
  ContractAlreadyFinalized,
  ContractNotReadyToSign,
  CollectionNotCreated,
  CollectionCreationFailed,
  SalesNotActive,
  SalesStillActive,
  SectionNotFound,
  SectionAlreadyExists,
  SeatUnavailable,
  InsufficientPaymentAmount,
  TicketMintFailed,
  TicketNotFound,
  TicketAlreadyScanned,
  PayoutAlreadyCollected,
  TransferFailed
} from "./EventErrors.sol";

contract Event is ExpiryHelper, KeyHelper, HederaTokenService {
  using TicketIterableMapping for TicketMap;
  using SectionIterableMapping for SectionMap;

  TicketMap tickets;
  SectionMap sections;
  address public owner;
  address public venue;
  address public entertainer;
  address public tokenAddress;
  bool public venueSigned;
  bool public entertainerSigned;
  uint256 public eventDateTime;
  uint256 public ticketSalesStartDateTime;
  uint256 public ticketSalesEndDateTime;
  int256 public defaultTicketPrice;
  uint256 public serviceFeeBasePoints;
  uint256 public venueFeeBasePoints;
  uint256 public servicePayout;
  uint256 public venuePayout;
  uint256 public entertainerPayout;
  bool public servicePayoutCollected;
  bool public venuePayoutCollected;
  bool public entertainerPayoutCollected;
  bool public payoutsCalculated;

  constructor(
    address _venue,
    address _entertainer,
    uint256 _serviceFeeBasePoints
  ) {
    if (_venue == address(0) || _entertainer == address(0)) {
      revert VenueAndEntertainerAreRequired();
    }

    owner = msg.sender;
    venue = _venue;
    entertainer = _entertainer;
    serviceFeeBasePoints = _serviceFeeBasePoints;
    venueSigned = false;
    entertainerSigned = false;

    // test data
    sections.set("test-section", Section(-1, 1, 0));
    tickets.set(-1, Ticket("test-section", -1, owner, false));
  }

  receive() external payable {}

  // access modifiers
  modifier onlyOwner() {
    if (msg.sender != owner) revert Unauthorized();
    _;
  }

  modifier onlyVenue() {
    if (msg.sender != venue) revert Unauthorized();
    _;
  }

  modifier onlyEntertainer() {
    if (msg.sender != entertainer) revert Unauthorized();
    _;
  }

  modifier onlySigners() {
    if (msg.sender != venue && msg.sender != entertainer) revert Unauthorized();
    _;
  }

  modifier finalized() {
    if (!venueSigned || !entertainerSigned) revert ContractNotFinalized();
    _;
  }

  modifier notFinalized() {
    if (venueSigned && entertainerSigned) revert ContractAlreadyFinalized();
    _;
  }

  modifier readyToSign() {
    if (eventDateTime == 0
      || ticketSalesStartDateTime == 0
      || ticketSalesEndDateTime == 0
      || defaultTicketPrice == 0
    ) {
      revert ContractNotReadyToSign();
    }
    _;
  }

  modifier resetSignatures() {
    _;
    venueSigned = false;
    entertainerSigned = false;
  }

  modifier tokenCreated() {
    if (tokenAddress == address(0)) revert CollectionNotCreated();
    _;
  }

  modifier salesActive() {
    if (block.timestamp < ticketSalesStartDateTime || block.timestamp >= ticketSalesEndDateTime) {
      revert SalesNotActive();
    }
    _;
  }

  modifier postSales() {
    if (block.timestamp < ticketSalesStartDateTime) revert SalesNotActive();
    if (block.timestamp < ticketSalesEndDateTime) revert SalesStillActive();
    _;
  }

  // public getters
  function getBalance() public view returns (uint256) {
    return address(this).balance;
  }

  function getTicket(int64 _serial) public view returns (Ticket memory) {
    return tickets.get(_serial);
  }

  function getSectionKeys() public view returns (string[] memory) {
    return sections.keys;
  }

  function getSection(string memory _key) public view returns (Section memory) {
    return sections.get(_key);
  }

  function getTicketPrice(
    string calldata _key
  ) public view returns (int256) {
    int256 ticketPrice = sections.get(_key).ticketPrice;
    return (ticketPrice == 0 ? defaultTicketPrice : ticketPrice);
  }

  // admin functions
  function setEventDateTime(
    uint256 _eventDateTime
  ) external onlyEntertainer notFinalized resetSignatures {
    eventDateTime = _eventDateTime;
  }

  function setTicketSalesStartDateTime(
    uint256 _ticketSalesStartDateTime
  ) external onlyEntertainer notFinalized resetSignatures {
    ticketSalesStartDateTime = _ticketSalesStartDateTime;
  }

  function setTicketSalesEndDateTime(
    uint256 _ticketSalesEndDateTime
  ) external onlyEntertainer notFinalized resetSignatures {
    ticketSalesEndDateTime = _ticketSalesEndDateTime;
  }

  function setVenueFeeBasePoints(
    uint256 _venueFeeBasePoints
  ) external onlyEntertainer notFinalized resetSignatures {
    if (_venueFeeBasePoints + serviceFeeBasePoints > 10_000) revert VenueFeeTooHigh();
    venueFeeBasePoints = _venueFeeBasePoints;
  }

  function setDefaultTicketPrice(
    uint256 _ticketPrice
  ) external onlyEntertainer notFinalized resetSignatures {
    defaultTicketPrice = normalizeTicketPrice(_ticketPrice);
  }

  function addSection(
    string calldata _key,
    uint256 _capacity
  ) external onlyVenue notFinalized resetSignatures {
    if (sections.exists(_key)) revert SectionAlreadyExists();
    int256 capacity = normalizeCapacity(_capacity);
    Section memory section = Section(0, capacity, capacity);
    sections.set(_key, section);
  }

  function setSectionTicketPrice(
    string calldata _key,
    uint256 _ticketPrice
  ) external onlyEntertainer notFinalized resetSignatures {
    if (!sections.exists(_key)) revert SectionNotFound();
    Section storage section = sections.get(_key);
    section.ticketPrice = normalizeTicketPrice(_ticketPrice);
  }

  function setSectionCapacity(
    string calldata _key,
    uint256 _capacity
  ) external onlyVenue notFinalized resetSignatures {
    if (!sections.exists(_key)) revert SectionNotFound();
    Section storage section = sections.get(_key);
    int256 capacity = normalizeCapacity(_capacity);
    section.maxCapacity = capacity;
    section.remainingCapacity = capacity;
  }

  function removeSection(string calldata _key) external onlyVenue notFinalized resetSignatures {
    sections.remove(_key);
  }

  function signContract() external onlySigners notFinalized readyToSign {
    if (msg.sender == venue) {
      venueSigned = true;
    }
    if (msg.sender == entertainer) {
      entertainerSigned = true;
    }
  }

  function createNft(
    string memory name,
    string memory symbol,
    string memory memo,
    int64 maxSupply,
    int64 autoRenewPeriod
  ) external payable onlyEntertainer finalized returns (address) {
    IHederaTokenService.TokenKey[] memory keys = new IHederaTokenService.TokenKey[](1);
    keys[0] = getSingleKey(
      KeyType.SUPPLY,
      KeyValueType.CONTRACT_ID,
      address(this)
    );

    IHederaTokenService.HederaToken memory token;
    token.name = name;
    token.symbol = symbol;
    token.memo = memo;
    token.treasury = address(this);
    token.tokenSupplyType = true; // FINITE
    token.maxSupply = maxSupply;
    token.tokenKeys = keys;
    token.freezeDefault = false;
    token.expiry = createAutoRenewExpiry(address(this), autoRenewPeriod);

    (int256 responseCode, address createdToken) = HederaTokenService.createNonFungibleToken(token);
    if (responseCode != HederaResponseCodes.SUCCESS) revert CollectionCreationFailed();
    tokenAddress = createdToken;
    return createdToken;
  }

  function purchaseTicket(
    string calldata _key,
    bytes[] memory _metadata
  ) external payable salesActive returns (int256) {
    Section memory section = getSection(_key);
    if (section.remainingCapacity == 0) revert SeatUnavailable();

    int256 ticketPrice = getTicketPrice(_key);
    if (ticketPrice > 0 && msg.value < uint256(ticketPrice)) revert InsufficientPaymentAmount();

    (int256 mintResponse, , int64[] memory serials) = HederaTokenService.mintToken(tokenAddress, 0, _metadata);
    if (mintResponse != HederaResponseCodes.SUCCESS) revert TicketMintFailed();

    tickets.set(
      serials[0],
      Ticket(_key, ticketPrice, msg.sender, false)
    );

    if (section.remainingCapacity > 0) section.remainingCapacity--;

    HederaTokenService.associateToken(msg.sender, tokenAddress);
    HederaTokenService.transferNFT(
      tokenAddress,
      address(this),
      msg.sender,
      serials[0]
    );

    return serials[0];
  }

  function scanTicket(int64 _serial) external onlyVenue {
    Ticket storage nfTicket = tickets.get(_serial);
    if (nfTicket.price == 0) revert TicketNotFound();
    if (nfTicket.scanned) revert TicketAlreadyScanned();
    nfTicket.scanned = true;
  }

  function collectPayout() external postSales {
    if (msg.sender != owner && msg.sender != venue && msg.sender != entertainer) {
      revert Unauthorized();
    }
    calculatePayouts();
    if (msg.sender == owner) {
      if (servicePayoutCollected) revert PayoutAlreadyCollected();
      (bool success, ) = owner.call{value: servicePayout}("");
      if (!success) revert TransferFailed();
      servicePayoutCollected = true;
    } else if (msg.sender == venue) {
      if (venuePayoutCollected) revert PayoutAlreadyCollected();
      (bool success, ) = venue.call{value: venuePayout}("");
      if (!success) revert TransferFailed();
      venuePayoutCollected = true;
    } else if (msg.sender == entertainer) {
      if (entertainerPayoutCollected) revert PayoutAlreadyCollected();
      (bool success, ) = entertainer.call{value: entertainerPayout}("");
      if (!success) revert TransferFailed();
      entertainerPayoutCollected = true;
    }
  }

  // internal functions
  function calculatePayouts() internal postSales {
    if (!payoutsCalculated) {
      uint256 totalBalance = address(this).balance;
      servicePayout = (totalBalance * serviceFeeBasePoints) / 10_000;
      venuePayout = (totalBalance * venueFeeBasePoints) / 10_000;
      entertainerPayout = totalBalance - (servicePayout + venuePayout);
      payoutsCalculated = true;
    }
  }

  function normalizeTicketPrice(
    uint256 _ticketPrice
  ) internal pure returns (int256) {
    // We need to differentiate between an unset ticket price and a free ticket
    // and since unset values are always 0, we'll use -1 to represent free tickets
    return (_ticketPrice == 0 ? -1 : int(_ticketPrice));
  }

  function normalizeCapacity(
    uint256 _capacity
  ) internal pure returns (int256) {
    // We need to differentiate between an unset capacity and an unlimited capacity
    // and since uniset values are always 0, we'll use -1 to represent unlimited capacity
    return (_capacity == 0 ? -1 : int(_capacity));
  }
}
