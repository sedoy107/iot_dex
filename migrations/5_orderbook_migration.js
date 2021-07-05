const OrderBook = artifacts.require("OrderBook");

module.exports = function (deployer, network, accounts) {
  deployer.deploy(OrderBook);
};
