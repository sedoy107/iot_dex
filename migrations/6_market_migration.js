const Market = artifacts.require("Market");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Market);
};
