import "@nomicfoundation/hardhat-toolbox";
import { HardhatUserConfig } from "hardhat/config";
import { getRequired } from "./common/env";

const config: HardhatUserConfig = {
  mocha: {
    timeout: 3600000,
  },
  solidity: {
    version: "0.8.17",
    settings: {
      optimizer: {
        enabled: true,
        runs: 500,
      },
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./contracts",
    cache: "./hardhat-cache",
    artifacts: "./dist/hardhat-artifacts",
  },
  networks: {
    testnet: {
      url: getRequired("RPC_ENDPOINT"),
      accounts: [getRequired("OPERATOR_HEX_KEY")],
    },
  },
};

export default config;
