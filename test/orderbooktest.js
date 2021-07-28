'use strict'

const OrderBook = artifacts.require("OrderBook")

const truffleAssert = require('../node_modules/truffle-assertions')
const Chance = require('../node_modules/chance')
const truffleAssertions = require('../node_modules/truffle-assertions')
const chance = new Chance()

// references for convenience
const toBN = web3.utils.toBN
const fromUtf8 = web3.utils.fromUtf8

// Order book side constants
const BUY = 0
const SELL = 1

// Order types constants
const MARKET = 0
const LIMIT = 1

// Define ticker values
const tickerTo = web3.utils.fromAscii("LINK")
const tickerFrom = web3.utils.fromAscii("MATIC")
 
contract("OrderBook: Error Conditions", async accounts => {

    let orderBook

    before("Setup OrderBook contract", async () => {
        orderBook = await OrderBook.deployed()
    })

    it("should revert when try to place order with amount == 0", async () => {
        await truffleAssert.reverts(
            orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 0, 0)
        )
        await truffleAssert.reverts(
            orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 0, 0)
        )
    })
    it("should not place market orders when order book is empty", async () => {
        await truffleAssert.reverts(
            orderBook.createOrder(BUY, MARKET, tickerTo, tickerFrom, 0, 5)
        )
        await truffleAssert.reverts(
            orderBook.createOrder(SELL, MARKET, tickerTo, tickerFrom, 0, 5)
        )
    })
    it("should revert when try to get market price when market is not available", async () => {
        await truffleAssert.reverts(
            orderBook.getMarketPrice(BUY, tickerTo, tickerFrom)
        )
        await truffleAssert.reverts(
            orderBook.getMarketPrice(SELL, tickerTo, tickerFrom)
        )
    })
})
contract("OrderBook: Cancel Orders", async accounts => {

    let orderBook

    before("Fill order book with limit orders that cannot be matched", async () => {

        orderBook = await OrderBook.deployed()

        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 10, 5) // sell 5@10
        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 9, 6) // sell 6@9 <- topSellOrder
        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 11, 4) // sell 4@11
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 7, 6) // buy 6@7 <- topBuyOrder
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 6, 8) // buy 8@6
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 5, 10) // buy 10@5
    })

    it("should cancel order if it exists", async () => {
        await orderBook.cancelOrder(0, SELL, tickerTo, tickerFrom)
        let order = await orderBook.getOrder(0, SELL, tickerTo, tickerFrom)
        assert.equal(order.isActive, false, "Must be true")
    })
    it("should not cancel order if it doesn't exist", async () => {
        await truffleAssertions.reverts(
            orderBook.cancelOrder(6, SELL, tickerTo, tickerFrom)
        )
    })
})

contract("OrderBook: Market Orders", async accounts => {

    let orderBook

    before("Fill order book with limit orders that cannot be matched", async () => {

        orderBook = await OrderBook.deployed()

        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 10, 5) // sell 5@10
        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 9, 6) // sell 6@9 <- topSellOrder
        await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, 11, 4) // sell 4@11
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 7, 6) // buy 6@7 <- topBuyOrder
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 6, 8) // buy 8@6
        await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, 5, 10) // buy 10@5
    })

    it("should place SELL orders at the top of the order book [length - 1]", async () => {
        await orderBook.createOrder(SELL, MARKET, tickerTo, tickerFrom, 0, 20) // sell 20@market

        let topSellOrder = (await orderBook.getOrderBook(SELL, tickerTo, tickerFrom)).slice(-1)[0].price
        let topBuyOrder = (await orderBook.getOrderBook(BUY, tickerTo, tickerFrom)).slice(-1)[0].price
        
        assert.equal(topSellOrder, topBuyOrder, "Market SELL order price must match the top BUY order price")

    })
    it("should place BUY orders at the top of the order book [length - 1]", async () => {
        await orderBook.createOrder(BUY, MARKET, tickerTo, tickerFrom, 0, 30) // buy 30@market

        let topSellOrder = (await orderBook.getOrderBook(SELL, tickerTo, tickerFrom)).slice(-1)[0].price
        let topBuyOrder = (await orderBook.getOrderBook(BUY, tickerTo, tickerFrom)).slice(-1)[0].price
        
        assert.equal(topBuyOrder, topSellOrder, "Market BUY order price must match the top SELL order price")
    })
})

contract("OrderBook: Limit Orders", async accounts => {

    let orderBook

    before("Setup OrderBook contract", async () => {
        orderBook = await OrderBook.deployed()
    })
    it("should place BUY orders sorted from lowest [0] to highest [length - 1]", async () => {
        /**
         * THE BUY order with the lowest price must be at the top of the SELL order book
         *
         * | Price | Amount |
         * |   2   |    4   | [0]
         * |   5   |    8   | [1]
         * |   8   |   12   | [2]
         * |  10   |   13   | [3]
        */

        let orderCount = 20

        for (let i = 0; i < orderCount; i++) {
            await orderBook.createOrder(BUY, LIMIT, tickerTo, tickerFrom, chance.integer({min:1, max:100}), 4)
        }

        let orders = await orderBook.getOrderBook(BUY, tickerTo, tickerFrom)
        let prices = orders.map(x => parseInt(x.price))
        let length = prices.length

        assert.equal()

        assert.equal(Math.max.apply(null,prices), prices[length - 1], "Wrong maximum")
        assert.equal(Math.min.apply(null,prices),prices[0], "Wrong minimum")
        for (let i = 1; i < orderCount; i++) {
            assert(prices[i - 1] <= prices[i], "Wrong order")
        }
    })
    it("should place SELL orders sorted from highest [0] to lowest [length - 1]", async () => {
        /**
         * The SELL order with the highest price must be at the top of the BUY order book
         *
         * | Price | Amount |
         * |   2   |   10   | [3]
         * |   5   |    8   | [2]
         * |   8   |    6   | [1]
         * |  10   |    5   | [0]
         */

        let orderCount = 5;

        for (let i = 0; i < orderCount; i++) {
            await orderBook.createOrder(SELL, LIMIT, tickerTo, tickerFrom, chance.integer({min:1, max:100}), 4)
        }

        let orders = await orderBook.getOrderBook(SELL, tickerTo, tickerFrom)
        let prices = orders.map(x => parseInt(x.price))
        let length = prices.length

        assert.equal(Math.max.apply(null,prices), prices[0], "Wrong maximum")
        assert.equal(Math.min.apply(null,prices),prices[length - 1], "Wrong minimum")
        for (let i = 1; i < orderCount; i++) {
            assert(prices[i - 1] >= prices[i], "Wrong order")
        }
    })
})