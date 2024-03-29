require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config({ path : ".env"});

/** @type import('hardhat/config').HardhatUserConfig */
const QUICKNODE_HTTP_URL = process.env.QUICKNODE_HTTP_URL;
const PRIVATE_KEY = process.env.PRIVATE_KEY;
const POLYGONSCAN_KEY = process.env.POLYGONSCAN_KEY;

module.exports = {
  solidity: "0.8.18",
  networks : {
    mumbai: {
      url : QUICKNODE_HTTP_URL,
      accounts : [PRIVATE_KEY],
    },
  },
  etherscan : {
   apiKey : {
    polygonMumbai : POLYGONSCAN_KEY,
   },
  },
};
