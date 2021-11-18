const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")
const StableCoin = artifacts.require("StableCoin")

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Link)
  deployer.deploy(Polygon)
  deployer.deploy(WrappedBitcoin)
  deployer.deploy(StableCoin)
};
