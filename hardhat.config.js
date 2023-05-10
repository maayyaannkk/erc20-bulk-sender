require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: "0.8.18",
  networks: {
    hardhat: {},
    goerli: {
      url: process.env.ALCHEMY_GOERLI_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    sepolia: {
      url: process.env.ALCHEMY_SEPOLIA_URL,
      accounts: [process.env.PRIVATE_KEY]
    },
    polygon: {
      url: process.env.ALCHEMY_POLYGON_URL,
      accounts: [process.env.PRIVATE_KEY]
    }
  }
};
