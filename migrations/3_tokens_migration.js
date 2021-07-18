const Link = artifacts.require("Link");
const Polygon = artifacts.require("Polygon");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Link);
  deployer.deploy(Polygon);
};
