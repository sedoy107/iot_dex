const Link = artifacts.require("Link");
const Polygon = artifacts.require("Polygon");
const WrappedBitcoin = artifacts.require("WrappedBitcoin");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Link);
  deployer.deploy(Polygon);
  deployer.deploy(WrappedBitcoin);
};
