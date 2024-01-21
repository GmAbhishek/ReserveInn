import "@nomiclabs/hardhat-ethers";
import { ethers, network } from "hardhat";
import { getRequired } from "../../common/env";

async function main() {
  const venue = getRequired("VENUE_ADDRESS");
  const entertainer = getRequired("ENTERTAINER_ADDRESS");
  const serviceFeeBasePoints = Math.trunc(parseInt(getRequired("SERVICE_FEE_PERC"), 10) * 100);
  const factory = await ethers.getContractFactory("Event");
  const contract = await factory.deploy(
    venue,
    entertainer,
    serviceFeeBasePoints
  );
  await contract.deployed();
  console.info(
    `Deployed "Event" to the ${network.name} network. Address: ${contract.address}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
