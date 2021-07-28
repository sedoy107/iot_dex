'use strict'

const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")

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
const MARKET = 0;
const LIMIT = 1;
const IOC = 2;
const FOK = 3;
const MOC = 4;

contract("Dex", async accounts => {
    
    // Global declarations
    let dex

    before("setup contracts and deposit tokens", async () => {
        // Init contracts
        dex = await Dex.deployed()
    })

    // Auxiliary function to verify balances after the trades have completed
    async function verifyBalances (account, ticker_1, ticker_2, expected_1, expected_2) {
        let balance_1 = (await dex.balances(account, ticker_1)).toNumber()
        let balance_2 = (await dex.balances(account, ticker_2)).toNumber()
        assert.equal(balance_1, expected_1)
        assert.equal(balance_2, expected_2)
    }

    describe.only("Token Swaps", async () => {

        // Token declarations
        let link
        let polygon
        let linkTicker
        let polygonTicker
        
        // Number of accounts used for the test
        const accountCount = 6
        
        // Define token amounts
        const linkAmount = 50
        const polygonAmount = 100

        // Define deposit amounts
        const linkDeposit = 50
        const polygonDeposit = 100

        before("setup token contracts and deposit them to dex", async () => {
            // Init token contracts
            link = await Link.deployed()
            polygon = await Polygon.deployed()
    
            // Retrieve token tickers
            linkTicker = fromUtf8(await link.symbol())
            polygonTicker = fromUtf8(await polygon.symbol())
    
            // Dex: add tokens
            await dex.addToken(linkTicker, link.address)
            await dex.addToken(polygonTicker, polygon.address)
    
            for (let i = 0; i < accountCount; i++) {
                // Send some tokens to accounts
                await link.transfer(accounts[i], linkAmount)
                await polygon.transfer(accounts[i], polygonAmount)
    
                // Approve dex to withdraw from token contracts
                await link.approve(dex.address, linkAmount, {from: accounts[i]})
                await polygon.approve(dex.address, polygonAmount, {from: accounts[i]})
    
                // Deposit tokens to the Dex
                await dex.deposit(linkDeposit, linkTicker, {from: accounts[i]})
                await dex.deposit(polygonDeposit, polygonTicker, {from: accounts[i]})
    
                // Print balances on the Dex
                let linkInitialBalance = (await dex.balances(accounts[i], linkTicker)).toNumber()
                let polygonInitialBalance = (await dex.balances(accounts[i], polygonTicker)).toNumber()
                assert.equal(linkInitialBalance, linkDeposit)
                assert.equal(polygonInitialBalance, polygonDeposit)
            }
        })

        afterEach ("verify Dex balances integrity", async () => {
            let linkDexBalance = 0
            let polygonDexBalance = 0
            for (let i = 0; i < accountCount; i++) {
                linkDexBalance += (await dex.balances(accounts[i], linkTicker)).toNumber()
                polygonDexBalance += (await dex.balances(accounts[i], polygonTicker)).toNumber()
            }
            assert.equal(linkDexBalance, linkDeposit * accountCount)
            assert.equal(polygonDexBalance, polygonDeposit * accountCount)
        })

        it("should correctly process limit orders where order get cancelled", async () => {
            let tx;

            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 5, 4, {from: accounts[1]}) // 0: buy 4@5

            truffleAssertions.eventEmitted(tx, 'OrderCreated', (ev) => { 
                return ev.id == 0 && ev.trader == accounts[1] && ev.side == BUY && ev.orderType == LIMIT &&
                ev.price == 5 && ev.amount == 4
            }, "OrderCreated should be emitted with correct values")

            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 6, 2, {from: accounts[2]}) // 1: buy 2@6
            
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 7, 1, {from: accounts[3]}) // 2: buy 1@7
            
            await dex.cancelOrder(1, BUY, linkTicker, polygonTicker) // cancel BUY order with id 1
            
            tx = await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 5, 5, {from: accounts[0]}) // 3: sell 5@5
            
            truffleAssertions.prettyPrintEmittedEvents(tx)

            truffleAssertions.eventEmitted(tx, 'OrderCreated', (ev) => { 
                return ev.id == 3 && ev.trader == accounts[0] && ev.side == SELL && ev.orderType == LIMIT &&
                ev.price == 5 && ev.amount == 5
            }, "OrderCreated should be emitted with correct values")

            truffleAssertions.eventEmitted(tx, 'OrderRemoved', (ev) => { 
                return ev.id == 2 && ev.trader == accounts[3] && ev.side == BUY && ev.orderType == LIMIT &&
                ev.filled == 1 && ev.price == 7 && ev.amount == 1
            }, "OrderCreated should be emitted with correct values")

            truffleAssertions.eventEmitted(tx, 'OrderRemoved', (ev) => { 
                return ev.id == 0 && ev.trader == accounts[1] && ev.side == BUY && ev.orderType == LIMIT &&
                ev.filled == 4 && ev.price == 5 && ev.amount == 4
            }, "OrderCreated should be emitted with correct values")

            truffleAssertions.eventEmitted(tx, 'OrderRemoved', (ev) => { 
                return ev.id == 3 && ev.trader == accounts[0] && ev.side == SELL && ev.orderType == LIMIT &&
                ev.filled == 5 && ev.price == 5 && ev.amount == 5
            }, "OrderCreated should be emitted with correct values")

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[0], linkTicker, polygonTicker, 45, 127)
            await verifyBalances(accounts[1], linkTicker, polygonTicker, 54, 80)
            await verifyBalances(accounts[2], linkTicker, polygonTicker, 50, 100)
            await verifyBalances(accounts[3], linkTicker, polygonTicker, 51, 93)
        })
        it("should correctly handle market orders where order get cancelled", async () => {
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 3, 10, {from: accounts[2]}) // 4: buy 10@3

            // Cancel order 4
            await dex.cancelOrder(4, BUY, linkTicker, polygonTicker)

            await dex.createOrder(SELL, MARKET, linkTicker, polygonTicker, 0, 8, {from: accounts[4]}) // 5: sell 8@market
            // Will be fulfilled by order 5
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 3, 1, {from: accounts[2]}) // 6: buy 1@3

            // Cancel partially filled order 5
            await dex.cancelOrder(5, SELL, linkTicker, polygonTicker)

            // This market order will still be created based on the order 5
            await dex.createOrder(BUY, MARKET, linkTicker, polygonTicker, 0, 9, {from: accounts[5]}) // 7: buy 9@market

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[5], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 0, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], linkTicker, polygonTicker, 51, 97)
            await verifyBalances(accounts[4], linkTicker, polygonTicker, 49, 103)
            await verifyBalances(accounts[5], linkTicker, polygonTicker, 50, 100)
        })
    })
    describe("Ether Swaps", async () => {

        // Token declarations
        let wbtc
        let wbtcTicker
        const etherTicker = fromUtf8("ETH");
        
        // Number of accounts used for the test
        const accountCount = 6
        
        // Define token amounts
        const wbtcAmount = 50
        const etherAmount = 100

        // Define deposit amounts
        const wbtcDeposit = 50
        const etherDeposit = 100

        before("setup token contracts and deposit them to dex", async () => {
            // Init token contracts
            wbtc = await WrappedBitcoin.deployed()
    
            // Retrieve token tickers
            wbtcTicker = fromUtf8(await wbtc.symbol())
    
            // Dex: add tokens
            await dex.addToken(wbtcTicker, wbtc.address)
    
            for (let i = 0; i < accountCount; i++) {
                // Send some tokens to other accounts 
                await wbtc.transfer(accounts[i], wbtcAmount)
    
                // Approve dex to withdraw from token contracts
                await wbtc.approve(dex.address, wbtcAmount, {from: accounts[i]})
    
                // Deposit tokens to the Dex
                await dex.deposit(wbtcDeposit, wbtcTicker, {from: accounts[i]})
                await dex.methods['deposit()']({from: accounts[i], value: etherDeposit})
    
                // Print balances on the Dex
                let wbtcInitialBalance = (await dex.balances(accounts[i], wbtcTicker)).toNumber()
                let etherInitialBalance = (await dex.balances(accounts[i], etherTicker)).toNumber()
                assert.equal(wbtcInitialBalance, wbtcDeposit)
                assert.equal(etherInitialBalance, etherDeposit)
            }
        })

        afterEach ("verify Dex balances integrity", async () => {
            let wbtcDexBalance = 0
            let etherDexBalance = 0
            for (let i = 0; i < accountCount; i++) {
                wbtcDexBalance += (await dex.balances(accounts[i], wbtcTicker)).toNumber()
                etherDexBalance += (await dex.balances(accounts[i], etherTicker)).toNumber()
            }
            assert.equal(wbtcDexBalance, wbtcDeposit * accountCount)
            assert.equal(etherDexBalance, etherDeposit * accountCount)
        })

        it("should correctly process limit orders", async () => {
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 5, 4, {from: accounts[1]}) // buy 4 wbtc for 5 matic each
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 6, 2, {from: accounts[2]}) // buy 2 wbtc for 6 matic each
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 7, 1, {from: accounts[3]}) // buy 1 wbtc for 7 matic each

            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 5, 5, {from: accounts[0]}) // sell 5 wbtc for 5 matic each

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[1], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 2, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[0], wbtcTicker, etherTicker, 45, 129)
            await verifyBalances(accounts[1], wbtcTicker, etherTicker, 52, 90)
            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 52, 88)
            await verifyBalances(accounts[3], wbtcTicker, etherTicker, 51, 93)
        })

        it("should correctly handle limit orders #2", async () => {
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 7, 5, {from: accounts[1]}) // sell 5@7
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 6, 4, {from: accounts[2]}) // buy 4@6
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 6, 10, {from: accounts[3]}) // sell 10@6
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 6, 5, {from: accounts[2]}) // buy 5@6
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 8, 2, {from: accounts[0]}) // buy 2@8

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[1], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 2, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 1)
            assert.equal(sellOrderBook[0].trader, accounts[1], "Wrong account in the sell order book")
            assert.equal(sellOrderBook[0].filled, 1, "Wrong filled amount")

            await verifyBalances(accounts[0], wbtcTicker, etherTicker, 47, 116)
            await verifyBalances(accounts[1], wbtcTicker, etherTicker, 51, 97)
            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 61, 34)
            await verifyBalances(accounts[3], wbtcTicker, etherTicker, 41, 153)
        })

        it("should correctly handle market orders", async () => {
            await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 8, {from: accounts[4]}) // sell 8@market
            await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 3, 8, {from: accounts[2]}) // buy 8@3
            await dex.createOrder(BUY, MARKET, wbtcTicker, etherTicker, 0, 9, {from: accounts[5]}) // buy 9@market

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 2)
            assert.equal(buyOrderBook[0].trader, accounts[2], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 6, "Wrong filled amount")
            assert.equal(buyOrderBook[1].trader, accounts[5], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[1].filled, 4, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[1], wbtcTicker, etherTicker, 49, 115)
            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 67, 16)
            await verifyBalances(accounts[4], wbtcTicker, etherTicker, 42, 128)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 54, 72)
        })

        it("market order that was previously partially filled at a lower price \
should fill a new limit order that came at a higher price", async () => {
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 10, 7, {from: accounts[4]}) // sell 7@10

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[2], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 6, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 1)
            assert.equal(sellOrderBook[0].trader, accounts[4], "Wrong account in the sell order book")
            assert.equal(sellOrderBook[0].filled, 5, "Wrong filled amount")

            await verifyBalances(accounts[4], wbtcTicker, etherTicker, 37, 178)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 59, 22)
        })
        it("more market order test", async () => {
            await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 8, {from: accounts[0]}) // sell 8@market
            await dex.createOrder(BUY, MARKET, wbtcTicker, etherTicker, 0, 10, {from: accounts[1]}) // buy 10@market
            await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 1, {from: accounts[3]}) // sell 1@market
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 20, 1, {from: accounts[5]}) // sell 1@20

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[0], wbtcTicker, etherTicker, 39, 140)
            await verifyBalances(accounts[1], wbtcTicker, etherTicker, 59, 47)
            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 69, 10)
            await verifyBalances(accounts[3], wbtcTicker, etherTicker, 40, 163)
            await verifyBalances(accounts[4], wbtcTicker, etherTicker, 35, 198)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 58, 42)
        })
    })
})
