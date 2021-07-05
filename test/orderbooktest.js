'use strict';

const OrderBook = artifacts.require("OrderBook");

const truffleAssert = require('../node_modules/truffle-assertions');
const Chance = require('../node_modules/chance');
const chance = new Chance();

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;
 
contract.only("OrderBook Test", async accounts => {
    it("should correctly handle zero BUY orders", async () => {
        let orderbook = await OrderBook.deployed();
        let ticker = web3.utils.fromAscii("LINK");

        await truffleAssert.reverts(
            orderbook.createLimitBuyOrder(ticker, 0, 1)
        )
        await truffleAssert.reverts(
            orderbook.createLimitBuyOrder(ticker, 1, 0)
        )
        await truffleAssert.reverts(
            orderbook.createLimitBuyOrder(ticker, 0, 0)
        )
    });
    it("should correctly handle zero SELL orders", async () => {
        let orderbook = await OrderBook.deployed();
        let ticker = web3.utils.fromAscii("LINK");

        await truffleAssert.reverts(
            orderbook.createLimitSellOrder(ticker, 0, 1)
        )
        await truffleAssert.reverts(
            orderbook.createLimitSellOrder(ticker, 1, 0)
        )
        await truffleAssert.reverts(
            orderbook.createLimitSellOrder(ticker, 0, 0)
        )
    });
    it("should correctly place BUY orders", async () => {
        // THE SELL order with the lowest price must be at the top of the SELL order book
        /**
         * | Price | Amount |
         * |   2   |    4   | [0]
         * |   5   |    8   | [1]
         * |   8   |   12   | [2]
         * |  10   |   13   | [3]
        */
        let orderbook = await OrderBook.deployed();
        let ticker = web3.utils.fromAscii("LINK");

        await orderbook.createLimitBuyOrder(ticker, 10, 4);
        await orderbook.createLimitBuyOrder(ticker, 12, 4);
        await orderbook.createLimitBuyOrder(ticker, 9, 4);
        await orderbook.createLimitBuyOrder(ticker, 7, 4);

        let orders = await orderbook.getBidOrderBook(ticker);
        let prices = orders.map(x => parseInt(x.price));
        let length = prices.length;

        assert.equal(Math.max.apply(null,prices), prices[length - 1], "Wrong maximum");
        assert.equal(Math.min.apply(null,prices),prices[0], "Wrong minimum");
        assert(prices[0] < prices[1], "Wrong order");
        assert(prices[1] < prices[2], "Wrong order");
        assert(prices[2] < prices[3], "Wrong order");
        

    });
    it("should correctly place SELL orders", async () => {
        // The BUY order with the highest price must be at the top of the BUY order book
        /**
         * | Price | Amount |
         * |   2   |   10   | [3]
         * |   5   |    8   | [2]
         * |   8   |    6   | [1]
         * |  10   |    5   | [0]
         */
        let orderbook = await OrderBook.deployed();
        let ticker = web3.utils.fromAscii("LINK");

        await orderbook.createLimitSellOrder(ticker, 10, 4);
        await orderbook.createLimitSellOrder(ticker, 12, 4);
        await orderbook.createLimitSellOrder(ticker, 9, 4);
        await orderbook.createLimitSellOrder(ticker, 7, 4);

        let orders = await orderbook.getAskOrderBook(ticker);
        let prices = orders.map(x => parseInt(x.price));
        let length = prices.length;

        assert.equal(Math.max.apply(null,prices), prices[0], "Wrong maximum");
        assert.equal(Math.min.apply(null,prices),prices[length - 1], "Wrong minimum");
        assert(prices[0] > prices[1], "Wrong order");
        assert(prices[1] > prices[2], "Wrong order");
        assert(prices[2] > prices[3], "Wrong order");
    });
}) 