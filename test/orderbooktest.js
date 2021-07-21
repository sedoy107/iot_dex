'use strict';

const OrderBook = artifacts.require("OrderBook");

const truffleAssert = require('../node_modules/truffle-assertions');
const Chance = require('../node_modules/chance');
const chance = new Chance();

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;

const BUY = 0;
const SELL = 1;
 
contract("OrderBook Test", async accounts => {
    describe("Generic", async () => {
        it("should correctly handle orders with amount == 0", async () => {
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");

            await truffleAssert.reverts(
                orderBook.createOrder(BUY, tickerTo, tickerFrom, 0, 0)
            )
            await truffleAssert.reverts(
                orderBook.createOrder(SELL, tickerTo, tickerFrom, 0, 0)
            )
        });
        it("should not place market orders when order book is empty", async () => {
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");

            await truffleAssert.reverts(
                orderBook.createOrder(BUY, tickerTo, tickerFrom, 0, 5)
            )
            await truffleAssert.reverts(
                orderBook.createOrder(SELL, tickerTo, tickerFrom, 0, 5)
            )
        });
    });
    describe("Limit Orders", async () => {
        it("should place BUY orders sorted from lowest [0] to highest [length - 1]", async () => {
            // THE BUY order with the lowest price must be at the top of the SELL order book
            /**
             * | Price | Amount |
             * |   2   |    4   | [0]
             * |   5   |    8   | [1]
             * |   8   |   12   | [2]
             * |  10   |   13   | [3]
            */
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");
            let orderCount = 20;

            for (let i = 0; i < orderCount; i++) {
                await orderBook.createOrder(BUY, tickerTo, tickerFrom, chance.integer({min:1, max:100}), 4);
            }

            let orders = await orderBook.getOrderBook(BUY, tickerTo, tickerFrom);
            let prices = orders.map(x => parseInt(x.price));
            let length = prices.length;

            assert.equal(Math.max.apply(null,prices), prices[length - 1], "Wrong maximum");
            assert.equal(Math.min.apply(null,prices),prices[0], "Wrong minimum");
            for (let i = 1; i < orderCount; i++) {
                assert(prices[i - 1] <= prices[i], "Wrong order")
            }
        });
        it("should place SELL orders sorted from highest [0] to lowest [length - 1]", async () => {
            // The SELL order with the highest price must be at the top of the BUY order book
            /**
             * | Price | Amount |
             * |   2   |   10   | [3]
             * |   5   |    8   | [2]
             * |   8   |    6   | [1]
             * |  10   |    5   | [0]
             */
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");
            let orderCount = 5;

            for (let i = 0; i < orderCount; i++) {
                await orderBook.createOrder(SELL, tickerTo, tickerFrom, chance.integer({min:1, max:100}), 4);
            }

            let orders = await orderBook.getOrderBook(SELL, tickerTo, tickerFrom);
            let prices = orders.map(x => parseInt(x.price));
            let length = prices.length;

            assert.equal(Math.max.apply(null,prices), prices[0], "Wrong maximum");
            assert.equal(Math.min.apply(null,prices),prices[length - 1], "Wrong minimum");
            for (let i = 1; i < orderCount; i++) {
                assert(prices[i - 1] >= prices[i], "Wrong order")
            }
        });
    });
    describe("Market Orders", async () => {
        it("should place SELL orders at the top of the order book [length - 1]", async () => {
            // The SELL order with the highest price must be at the top of the BUY order book
            /**
             * | Price | Amount |
             * |   2   |   10   | [3] <---- bestPrice is at the top
             * |   5   |    8   | [2]
             * |   8   |    6   | [1]
             * |  10   |    5   | [0]
             */
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");

            // Retrieve bestPrice
            let orders = await orderBook.getOrderBook(SELL, tickerTo, tickerFrom);
            let prices = orders.map(x => parseInt(x.price));
            let bestPrice = prices.slice(-1)[0];

            await orderBook.createOrder(SELL, tickerTo, tickerFrom, 0, 4);

            orders = await orderBook.getOrderBook(SELL, tickerTo, tickerFrom);
            prices = orders.map(x => parseInt(x.price));

            assert.equal(Math.min.apply(null,prices), bestPrice, "bestPrice must be minimum");
            assert.equal(prices.slice(-1)[0], prices.slice(-2)[0], "The two top SELL orders must have the same price")
        });
        it("should place BUY orders at the top of the order book [length - 1]", async () => {
            // THE BUY order with the lowest price must be at the top of the SELL order book
            /**
             * | Price | Amount |
             * |   2   |    4   | [0] <---- bestPrice at the top
             * |   5   |    8   | [1]
             * |   8   |   12   | [2]
             * |  10   |   13   | [3]
            */
            let orderBook = await OrderBook.deployed();
            let tickerTo = web3.utils.fromAscii("LINK");
            let tickerFrom = web3.utils.fromAscii("MATIC");

            // Retrieve bestPrice
            let orders = await orderBook.getOrderBook(BUY, tickerTo, tickerFrom);
            let prices = orders.map(x => parseInt(x.price));
            let bestPrice = prices.slice(-1)[0];

            await orderBook.createOrder(BUY, tickerTo, tickerFrom, 0, 4);

            orders = await orderBook.getOrderBook(BUY, tickerTo, tickerFrom);
            prices = orders.map(x => parseInt(x.price));

            assert.equal(Math.max.apply(null,prices), bestPrice, "bestPrice must be minimum");
            assert.equal(prices.slice(-1)[0], prices.slice(-2)[0], "The two top SELL orders must have the same price")
        });
    });
});