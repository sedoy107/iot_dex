const Link = artifacts.require("Link");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Link);
};
