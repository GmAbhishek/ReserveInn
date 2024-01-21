import "@nomicfoundation/hardhat-chai-matchers";
import { loadFixture } from "@nomicfoundation/hardhat-network-helpers";
import { expect } from "chai";
import { BigNumber } from "ethers";
import { ethers } from "hardhat";

const toEther = (val: number): BigNumber => ethers.utils.parseEther(`${val}`);
const toTimestamp = (dt = new Date()): number =>
  Math.floor(dt.getTime() / 1_000);
const ticketPrice = toEther(75);
const currentTs = toTimestamp();
const pastTs = toTimestamp(new Date(Date.now() - 10_000_000));
const futureTs = toTimestamp(new Date(Date.now() + 10_000_000));
const serviceFeeBasePoints = 300;
const venueFeeBasePoints = 1_500;
const sectionKey = "foobar";
const capacity = 500;
const testSectionKey = "test-section";
const testSectionTicketSerial = -1;
const totalSales = toEther(5_000);

async function newContract() {
  const [owner, venue, entertainer, attendee] = await ethers.getSigners();
  const factory = await ethers.getContractFactory("Event");
  const contract = await factory.deploy(
    venue.address,
    entertainer.address,
    serviceFeeBasePoints
  );
  await contract.deployed();
  return {
    owner,
    venue,
    entertainer,
    attendee,
    factory,
    contract,
  };
}

async function readyToSignContract() {
  const { owner, venue, entertainer, attendee, factory, contract } =
    await loadFixture(newContract);
  await contract.connect(entertainer).setEventDateTime(futureTs);
  await contract.connect(entertainer).setTicketSalesStartDateTime(currentTs);
  await contract.connect(entertainer).setTicketSalesEndDateTime(futureTs);
  await contract.connect(entertainer).setDefaultTicketPrice(ticketPrice);
  await contract.connect(venue).addSection("GA", 250);
  await contract.connect(entertainer).setSectionTicketPrice("GA", 1);
  return {
    owner,
    venue,
    entertainer,
    attendee,
    factory,
    contract,
  };
}

async function preSalesContract() {
  const { owner, venue, entertainer, attendee, factory, contract } =
    await loadFixture(readyToSignContract);
  await contract.connect(entertainer).setTicketSalesStartDateTime(futureTs);
  await contract.connect(entertainer).setTicketSalesEndDateTime(futureTs);
  await contract.connect(entertainer).signContract();
  await contract.connect(venue).signContract();
  return {
    owner,
    venue,
    entertainer,
    attendee,
    factory,
    contract,
  };
}

async function salesActiveContract() {
  const { owner, venue, entertainer, attendee, factory, contract } =
    await loadFixture(readyToSignContract);
  await contract.connect(entertainer).signContract();
  await contract.connect(venue).signContract();
  return {
    owner,
    venue,
    entertainer,
    attendee,
    factory,
    contract,
  };
}

async function postSalesContract() {
  const { owner, venue, entertainer, attendee, factory, contract } =
    await loadFixture(readyToSignContract);
  await contract.connect(entertainer).setTicketSalesStartDateTime(pastTs);
  await contract.connect(entertainer).setTicketSalesEndDateTime(pastTs);
  await contract.connect(entertainer).setVenueFeeBasePoints(venueFeeBasePoints);
  await contract.connect(entertainer).signContract();
  await contract.connect(venue).signContract();
  const tx = await owner.sendTransaction({
    to: contract.address,
    value: totalSales,
  });
  await tx.wait();
  return {
    owner,
    venue,
    entertainer,
    attendee,
    factory,
    contract,
  };
}

describe("Event contract", () => {
  describe("constructor", () => {
    it("should initialize owner", async () => {
      const { owner, contract } = await loadFixture(newContract);
      expect(await contract.owner()).to.equal(owner.address);
    });

    it("should set venue", async () => {
      const { venue, contract } = await loadFixture(newContract);
      expect(await contract.venue()).to.equal(venue.address);
    });

    it("should set entertainer", async () => {
      const { entertainer, contract } = await loadFixture(newContract);
      expect(await contract.entertainer()).to.equal(entertainer.address);
    });

    it("should set serviceFeeBasePoints", async () => {
      const { contract } = await loadFixture(newContract);
      expect(await contract.serviceFeeBasePoints()).to.equal(
        serviceFeeBasePoints
      );
    });

    it("should initialize venueSigned to false", async () => {
      const { contract } = await loadFixture(newContract);
      expect(await contract.venueSigned()).to.equal(false);
    });

    it("should initialize entertainerSigned to false", async () => {
      const { contract } = await loadFixture(newContract);
      expect(await contract.entertainerSigned()).to.equal(false);
    });

    it("should revert if no venue provided", async () => {
      const { entertainer, factory } = await loadFixture(newContract);
      await expect(
        factory.deploy(
          ethers.constants.AddressZero,
          entertainer.address,
          serviceFeeBasePoints
        )
      ).to.be.revertedWithCustomError(factory, "VenueAndEntertainerAreRequired");
    });

    it("should revert if no entertainer provided", async () => {
      const { venue, factory } = await loadFixture(newContract);
      await expect(
        factory.deploy(
          venue.address,
          ethers.constants.AddressZero,
          serviceFeeBasePoints
        )
      ).to.be.revertedWithCustomError(factory, "VenueAndEntertainerAreRequired");
    });
  });

  describe("terms & conditions", () => {
    describe("setEventDateTime function", () => {
      it("should set the event date time", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract.connect(entertainer).setEventDateTime(currentTs);
        expect(await contract.eventDateTime()).to.equal(currentTs);
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).setEventDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setEventDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).setEventDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setTicketSalesStartDateTime function", () => {
      it("should set the ticket sales start date time", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract
          .connect(entertainer)
          .setTicketSalesStartDateTime(currentTs);
        expect(await contract.ticketSalesStartDateTime()).to.equal(currentTs);
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).setTicketSalesStartDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setTicketSalesStartDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).setTicketSalesStartDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setTicketSalesEndDateTime function", () => {
      it("should set the ticket sales end date time", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract
          .connect(entertainer)
          .setTicketSalesEndDateTime(currentTs);
        expect(await contract.ticketSalesEndDateTime()).to.equal(currentTs);
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).setTicketSalesEndDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setTicketSalesEndDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).setTicketSalesEndDateTime(currentTs)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setVenueFeeBasePoints function", () => {
      it("should set the venue fee base points", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract
          .connect(entertainer)
          .setVenueFeeBasePoints(venueFeeBasePoints);
        expect(await contract.venueFeeBasePoints()).to.equal(
          venueFeeBasePoints
        );
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).setVenueFeeBasePoints(venueFeeBasePoints)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setVenueFeeBasePoints(venueFeeBasePoints)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).setVenueFeeBasePoints(venueFeeBasePoints)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setDefaultTicketPrice function", () => {
      it("should set the default ticket price when greater than 0", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract.connect(entertainer).setDefaultTicketPrice(ticketPrice);
        expect(await contract.defaultTicketPrice()).to.equal(ticketPrice);
      });

      it("should set the default ticket price to -1 when free", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await contract
          .connect(entertainer)
          .setDefaultTicketPrice(ethers.constants.Zero);
        expect(await contract.defaultTicketPrice()).to.equal(-1);
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).setDefaultTicketPrice(ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setDefaultTicketPrice(ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).setDefaultTicketPrice(ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("addSection function", () => {
      it("should add the section", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        const actual = await contract.getSection(sectionKey);
        expect(actual.ticketPrice).to.equal(ethers.constants.Zero);
        expect(actual.maxCapacity).to.equal(capacity);
        expect(actual.remainingCapacity).to.equal(capacity);
      });

      it("should default capacity to -1", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, 0);
        const actual = await contract.getSection(sectionKey);
        expect(actual.maxCapacity).to.equal(-1);
        expect(actual.remainingCapacity).to.equal(-1);
      });

      it("should revert if the section already exists", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract.connect(venue).addSection(sectionKey, capacity)
        ).to.be.revertedWithCustomError(contract, "SectionAlreadyExists");
      });

      it("should revert when called by owner", async () => {
        const { owner, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(owner).addSection(sectionKey, capacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by entertainer", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(entertainer).addSection(sectionKey, capacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { attendee, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(attendee).addSection(sectionKey, capacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setSectionTicketPrice function", () => {
      it("should set the ticket price", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract
          .connect(entertainer)
          .setSectionTicketPrice(sectionKey, ticketPrice);
        const actual = await contract.getSection(sectionKey);
        expect(actual.ticketPrice).to.equal(ticketPrice);
      });

      it("should revert when section not found", async () => {
        const { entertainer, contract } = await loadFixture(newContract);
        await expect(
          contract
            .connect(entertainer)
            .setSectionTicketPrice(sectionKey, ticketPrice)
        ).to.be.revertedWithCustomError(contract, "SectionNotFound");
      });

      it("should revert when called by owner", async () => {
        const { venue, owner, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(owner)
            .setSectionTicketPrice(sectionKey, ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by venue", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(venue)
            .setSectionTicketPrice(sectionKey, ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { venue, attendee, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(attendee)
            .setSectionTicketPrice(sectionKey, ticketPrice)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("setSectionCapacity function", () => {
      const newCapacity = toEther(250);

      it("should set the capacity", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract
          .connect(venue)
          .setSectionCapacity(sectionKey, newCapacity);
        const actual = await contract.getSection(sectionKey);
        expect(actual.maxCapacity).to.equal(newCapacity);
        expect(actual.remainingCapacity).to.equal(newCapacity);
      });

      it("should default the capacity to -1", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract
          .connect(venue)
          .setSectionCapacity(sectionKey, 0);
        const actual = await contract.getSection(sectionKey);
        expect(actual.maxCapacity).to.equal(-1);
        expect(actual.remainingCapacity).to.equal(-1);
      });

      it("should revert when section not found", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(
          contract.connect(venue).setSectionCapacity("baz", newCapacity)
        ).to.be.revertedWithCustomError(contract, "SectionNotFound");
      });

      it("should revert when called by owner", async () => {
        const { venue, owner, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(owner)
            .setSectionCapacity(sectionKey, newCapacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by entertainer", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(entertainer)
            .setSectionCapacity(sectionKey, newCapacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { venue, attendee, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract
            .connect(attendee)
            .setSectionCapacity(sectionKey, newCapacity)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });

    describe("removeSection function", () => {
      it("should remove the section", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract.connect(venue).removeSection(sectionKey);
        const actualKeys = await contract.getSectionKeys();
        expect(actualKeys.includes(sectionKey)).to.equal(false);
        const actual = await contract.getSection(sectionKey);
        expect(actual.ticketPrice).to.equal(ethers.constants.Zero);
        expect(actual.maxCapacity).to.equal(ethers.constants.Zero);
        expect(actual.remainingCapacity).to.equal(ethers.constants.Zero);
      });

      it("should revert when called by owner", async () => {
        const { venue, owner, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract.connect(owner).removeSection(sectionKey)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by entertainer", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract.connect(entertainer).removeSection(sectionKey)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert when called by attendee", async () => {
        const { venue, attendee, contract } = await loadFixture(newContract);
        await contract.connect(venue).addSection(sectionKey, capacity);
        await expect(
          contract.connect(attendee).removeSection(sectionKey)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });
  });

  describe("finalization", () => {
    describe("resetSignatures modifier", () => {
      it("should reset signatures when eventDateTime is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract.connect(entertainer).setEventDateTime(currentTs);
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when ticketSalesStartDateTime is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract
          .connect(entertainer)
          .setTicketSalesStartDateTime(currentTs);
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when ticketSalesEndDateTime is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract
          .connect(entertainer)
          .setTicketSalesEndDateTime(currentTs);
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when defaultTicketPrice is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract
          .connect(entertainer)
          .setDefaultTicketPrice(toEther(1000));
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when venueFeeBasePoints is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract.connect(entertainer).setVenueFeeBasePoints(3_000);
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when section is added", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(entertainer).signContract();
        expect(await contract.entertainerSigned()).to.equal(true);
        await contract.connect(venue).addSection(sectionKey, capacity);
        expect(await contract.entertainerSigned()).to.equal(false);
      });

      it("should reset signatures when section ticket price is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
        await contract
          .connect(entertainer)
          .setSectionTicketPrice(sectionKey, ticketPrice);
        expect(await contract.venueSigned()).to.equal(false);
      });

      it("should reset signatures when section capacity is updated", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract.connect(entertainer).signContract();
        expect(await contract.entertainerSigned()).to.equal(true);
        await contract.connect(venue).setSectionCapacity(sectionKey, 1001);
        expect(await contract.entertainerSigned()).to.equal(false);
      });

      it("should reset signatures when section is removed", async () => {
        const { venue, entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(venue).addSection(sectionKey, capacity);
        await contract.connect(entertainer).signContract();
        expect(await contract.entertainerSigned()).to.equal(true);
        await contract.connect(venue).removeSection(sectionKey);
        expect(await contract.entertainerSigned()).to.equal(false);
      });
    });

    describe("readyToSign modifier", () => {
      it("should revert signContract if eventDateTime not set", async () => {
        const { venue, contract } = await loadFixture(newContract);
        await expect(contract.connect(venue).signContract())
          .to.be.revertedWithCustomError(contract, "ContractNotReadyToSign");
      });

      it("should revert signContract if ticketSalesStartDateTime not set", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(entertainer).setEventDateTime(currentTs);
        await expect(contract.connect(venue).signContract())
          .to.be.revertedWithCustomError(contract, "ContractNotReadyToSign");
      });

      it("should revert signContract if ticketSalesEndDateTime not set", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(entertainer).setEventDateTime(currentTs);
        await contract
          .connect(entertainer)
          .setTicketSalesStartDateTime(currentTs);
        await expect(contract.connect(venue).signContract())
          .to.be.revertedWithCustomError(contract, "ContractNotReadyToSign");
      });

      it("should revert signContract if defaultTicketPrice not set", async () => {
        const { venue, entertainer, contract } = await loadFixture(newContract);
        await contract.connect(entertainer).setEventDateTime(currentTs);
        await contract
          .connect(entertainer)
          .setTicketSalesStartDateTime(currentTs);
        await contract
          .connect(entertainer)
          .setTicketSalesEndDateTime(currentTs);
        await expect(contract.connect(venue).signContract())
          .to.be.revertedWithCustomError(contract, "ContractNotReadyToSign");
      });
    });

    describe("signContract function", () => {
      it("should sign contract for venue", async () => {
        const { venue, contract } = await loadFixture(readyToSignContract);
        await contract.connect(venue).signContract();
        expect(await contract.venueSigned()).to.equal(true);
      });

      it("should sign contract for entertainer", async () => {
        const { entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await contract.connect(entertainer).signContract();
        expect(await contract.entertainerSigned()).to.equal(true);
      });

      it("should revert if called by owner", async () => {
        const { owner, contract } = await loadFixture(readyToSignContract);
        await expect(contract.connect(owner).signContract())
          .to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if called by attendee", async () => {
        const { attendee, contract } = await loadFixture(readyToSignContract);
        await expect(
          contract.connect(attendee).signContract()
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if both parties already signed", async () => {
        const { venue, contract } = await loadFixture(salesActiveContract);
        await expect(contract.connect(venue).signContract()).to.be.revertedWithCustomError(contract, "ContractAlreadyFinalized");
      });
    });
  });

  describe("sales", () => {
    describe("createNft function", () => {
      it("should revert if contract not finalized", async () => {
        const { entertainer, contract } = await loadFixture(
          readyToSignContract
        );
        await expect(
          contract
            .connect(entertainer)
            .createNft("foo", "FOO", "memo", 70_000, 100_000)
        ).to.be.revertedWithCustomError(contract, "ContractNotFinalized");
      });

      it("should revert if called by owner", async () => {
        const { owner, contract } = await loadFixture(readyToSignContract);
        await expect(
          contract
            .connect(owner)
            .createNft("foo", "FOO", "memo", 70_000, 100_000)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if called by venue", async () => {
        const { venue, contract } = await loadFixture(readyToSignContract);
        await expect(
          contract
            .connect(venue)
            .createNft("foo", "FOO", "memo", 70_000, 100_000)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if called by attendee", async () => {
        const { attendee, contract } = await loadFixture(readyToSignContract);
        await expect(
          contract
            .connect(attendee)
            .createNft("foo", "FOO", "memo", 70_000, 100_000)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should return created token ID", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });
    });

    describe("purchaseTicket function", () => {
      it("should revert if sales haven't started", async () => {
        const { attendee, contract } = await loadFixture(preSalesContract);
        await expect(
          contract
            .connect(attendee)
            .purchaseTicket("GA", [Buffer.from("{}")])
        ).to.be.revertedWithCustomError(contract, "SalesNotActive");
      });

      it("should revert if sales have ended", async () => {
        const { attendee, contract } = await loadFixture(postSalesContract);
        await expect(
          contract
            .connect(attendee)
            .purchaseTicket("GA", [Buffer.from("{}")])
        ).to.be.revertedWithCustomError(contract, "SalesNotActive");
      });

      it("should revert if insufficient payment amount", async () => {
        const { attendee, contract } = await loadFixture(salesActiveContract);
        await expect(
          contract
            .connect(attendee)
            .purchaseTicket("GA", [Buffer.from("{}")])
        ).to.be.revertedWithCustomError(contract, "InsufficientPaymentAmount");
      });

      it("should revert if seat is unavailable", async () => {
        const { attendee, contract } = await loadFixture(salesActiveContract);
        await expect(
          contract
            .connect(attendee)
            .purchaseTicket(testSectionKey, [Buffer.from("{}")])
        ).to.be.revertedWithCustomError(contract, "SeatUnavailable");
      });

      it("should mint the NFTicket", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should add the NFTicket to the contract", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should decrement the remaining capacity of open section", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should set the serial of the ticket key", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should associate the token", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should transfer the ticket", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });

      it("should return the serial", async () => {
        // TODO : figure out how to mock Hedera Token Service
      });
    });
  });

  describe("event", () => {
    describe("scanTicket function", () => {
      it("should revert if ticket not found", async () => {
        const { venue, contract } = await loadFixture(salesActiveContract);
        await expect(contract.connect(venue).scanTicket(1)).to.be.revertedWithCustomError(
          contract,
          "TicketNotFound"
        );
      });

      it("should mark ticket as scanned", async () => {
        const { venue, contract } = await loadFixture(salesActiveContract);
        await contract.connect(venue).scanTicket(testSectionTicketSerial);
        const ticket = await contract.getTicket(testSectionTicketSerial);
        expect(ticket.scanned).to.equal(true);
      });

      it("should revert if ticket already scanned", async () => {
        const { venue, contract } = await loadFixture(salesActiveContract);
        await contract.connect(venue).scanTicket(testSectionTicketSerial);
        await expect(
          contract.connect(venue).scanTicket(testSectionTicketSerial)
        ).to.be.revertedWithCustomError(contract, "TicketAlreadyScanned");
      });

      it("should revert if called by owner", async () => {
        const { owner, contract } = await loadFixture(salesActiveContract);
        await expect(
          contract.connect(owner).scanTicket(testSectionTicketSerial)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if called by entertainer", async () => {
        const { entertainer, contract } = await loadFixture(
          salesActiveContract
        );
        await expect(
          contract.connect(entertainer).scanTicket(testSectionTicketSerial)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });

      it("should revert if called by attendee", async () => {
        const { attendee, contract } = await loadFixture(salesActiveContract);
        await expect(
          contract.connect(attendee).scanTicket(testSectionTicketSerial)
        ).to.be.revertedWithCustomError(contract, "Unauthorized");
      });
    });
  });

  describe("post-event", () => {
    const expectedServicePayout = totalSales
      .mul(serviceFeeBasePoints)
      .div(10_000);
    const expectedVenuePayout = totalSales.mul(venueFeeBasePoints).div(10_000);
    const expectedEntertainerPayout = totalSales
      .sub(expectedServicePayout)
      .sub(expectedVenuePayout);

    describe("collectPayout function", () => {
      describe("when called by owner", () => {
        it("should calculate payouts", async () => {
          const { owner, contract } = await loadFixture(postSalesContract);
          await contract.connect(owner).collectPayout();
          expect(await contract.servicePayout()).to.equal(
            expectedServicePayout
          );
          expect(await contract.venuePayout()).to.equal(expectedVenuePayout);
          expect(await contract.entertainerPayout()).to.equal(
            expectedEntertainerPayout
          );
        });

        it("should transfer payout", async () => {
          const { owner, contract } = await loadFixture(postSalesContract);
          const contractBalanceBefore = await contract.getBalance();
          const ownerBalanceBefore = await owner.getBalance();
          await contract.connect(owner).collectPayout();
          expect(await contract.getBalance()).to.equal(
            contractBalanceBefore.sub(expectedServicePayout)
          );
          expect(await owner.getBalance()).to.be.greaterThan(
            ownerBalanceBefore
          );
        });

        it("should set servicePayoutCollected", async () => {
          const { owner, contract } = await loadFixture(postSalesContract);
          await contract.connect(owner).collectPayout();
          expect(await contract.servicePayoutCollected()).to.equal(true);
        });

        it("should revert if payout already collected", async () => {
          const { owner, contract } = await loadFixture(postSalesContract);
          await contract.connect(owner).collectPayout();
          await expect(
            contract.connect(owner).collectPayout()
          ).to.be.revertedWithCustomError(contract, "PayoutAlreadyCollected");
        });

        it("should revert if sales still active", async () => {
          const { owner, contract } = await loadFixture(salesActiveContract);
          await expect(
            contract.connect(owner).collectPayout()
          ).to.be.revertedWithCustomError(contract, "SalesStillActive");
        });
      });

      describe("when called by venue", () => {
        it("should calculate payouts", async () => {
          const { venue, contract } = await loadFixture(postSalesContract);
          await contract.connect(venue).collectPayout();
          expect(await contract.servicePayout()).to.equal(
            expectedServicePayout
          );
          expect(await contract.venuePayout()).to.equal(expectedVenuePayout);
          expect(await contract.entertainerPayout()).to.equal(
            expectedEntertainerPayout
          );
        });

        it("should transfer payout", async () => {
          const { venue, contract } = await loadFixture(postSalesContract);
          const contractBalanceBefore = await contract.getBalance();
          const venueBalanceBefore = await venue.getBalance();
          await contract.connect(venue).collectPayout();
          expect(await contract.getBalance()).to.equal(
            contractBalanceBefore.sub(expectedVenuePayout)
          );
          expect(await venue.getBalance()).to.be.greaterThan(
            venueBalanceBefore
          );
        });

        it("should set venuePayoutCollected", async () => {
          const { venue, contract } = await loadFixture(postSalesContract);
          await contract.connect(venue).collectPayout();
          expect(await contract.venuePayoutCollected()).to.equal(true);
        });

        it("should revert if payout already collected", async () => {
          const { venue, contract } = await loadFixture(postSalesContract);
          await contract.connect(venue).collectPayout();
          await expect(
            contract.connect(venue).collectPayout()
          ).to.be.revertedWithCustomError(contract, "PayoutAlreadyCollected");
        });

        it("should revert if sales still active", async () => {
          const { venue, contract } = await loadFixture(salesActiveContract);
          await expect(
            contract.connect(venue).collectPayout()
          ).to.be.revertedWithCustomError(contract, "SalesStillActive");
        });
      });

      describe("when called by entertainer", () => {
        it("should calculate payouts", async () => {
          const { entertainer, contract } = await loadFixture(postSalesContract);
          await contract.connect(entertainer).collectPayout();
          expect(await contract.servicePayout()).to.equal(
            expectedServicePayout
          );
          expect(await contract.venuePayout()).to.equal(expectedVenuePayout);
          expect(await contract.entertainerPayout()).to.equal(
            expectedEntertainerPayout
          );
        });

        it("should transfer payout", async () => {
          const { entertainer, contract } = await loadFixture(postSalesContract);
          const contractBalanceBefore = await contract.getBalance();
          const entertainerBalanceBefore = await entertainer.getBalance();
          await contract.connect(entertainer).collectPayout();
          expect(await contract.getBalance()).to.equal(
            contractBalanceBefore.sub(expectedEntertainerPayout)
          );
          expect(await entertainer.getBalance()).to.be.greaterThan(
            entertainerBalanceBefore
          );
        });

        it("should set entertainerPayoutCollected", async () => {
          const { entertainer, contract } = await loadFixture(postSalesContract);
          await contract.connect(entertainer).collectPayout();
          expect(await contract.entertainerPayoutCollected()).to.equal(true);
        });

        it("should revert if payout already collected", async () => {
          const { entertainer, contract } = await loadFixture(postSalesContract);
          await contract.connect(entertainer).collectPayout();
          await expect(
            contract.connect(entertainer).collectPayout()
          ).to.be.revertedWithCustomError(contract, "PayoutAlreadyCollected");
        });

        it("should revert if sales still active", async () => {
          const { entertainer, contract } = await loadFixture(salesActiveContract);
          await expect(
            contract.connect(entertainer).collectPayout()
          ).to.be.revertedWithCustomError(contract, "SalesStillActive");
        });
      });

      describe("when called by anyone else", async () => {
        it("should revert with 'Unauthorized'", async () => {
          const { attendee, contract } = await loadFixture(postSalesContract);
          await expect(
            contract.connect(attendee).collectPayout()
          ).to.be.revertedWithCustomError(contract, "Unauthorized");
        });
      });
    });
  });
});
