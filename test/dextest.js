'use strict'

const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")

const truffleAssert = require('../node_modules/truffle-assertions')
const Chance = require('../node_modules/chance')
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
    
    // Declarations
    let dex
    let link
    let polygon
    let linkTicker
    let polygonTicker
    const accountCount = 5

    // Auxiliary function to verify balances after the trades have completed
    async function verifyBalances (dex, account, linkExpected, polygonExpected) {
        let linkBalance = (await dex.balances(account, linkTicker)).toNumber()
        let polygonBalance = (await dex.balances(account, polygonTicker)).toNumber()
        assert.equal(linkBalance, linkExpected)
        assert.equal(polygonBalance, polygonExpected)
    }

    before("setup contracts and deposit tokens", async () => {
        // Init contracts
        dex = await Dex.deployed()
        link = await Link.deployed()
        polygon = await Polygon.deployed()

        // Retrieve token tickers
        linkTicker = fromUtf8(await link.symbol())
        polygonTicker = fromUtf8(await polygon.symbol())

        // Dex: add tokens
        await dex.addToken(linkTicker, link.address)
        await dex.addToken(polygonTicker, polygon.address)

        // Define token amounts
        let linkAmount = 50
        let polygonAmount = 100

        // Define deposit amounts
        let linkDeposit = 50
        let polygonDeposit = 100

        for (let i = 0; i <= accountCount; i++) {
            // Send some tokens to accounts 1, 2, 3
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

    describe("Token Swaps", async () => {
        it("Round 1. Limit Orders", async () => {
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 5, 4, {from: accounts[1]}) // buy 4 link for 5 matic each
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 6, 2, {from: accounts[2]}) // buy 2 link for 6 matic each
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 7, 1, {from: accounts[3]}) // buy 1 link for 7 matic each

            await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 5, 5, {from: accounts[0]}) // sell 5 link for 5 matic each

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[1], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 2, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(dex, accounts[0], 45, 129)
            await verifyBalances(dex, accounts[1], 52, 90)
            await verifyBalances(dex, accounts[2], 52, 88)
            await verifyBalances(dex, accounts[3], 51, 93)
        })

        it("Round 2. Limit Orders", async () => {
            await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 7, 5, {from: accounts[1]}) // sell 5@7
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 6, 4, {from: accounts[2]}) // buy 4@6
            await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 6, 10, {from: accounts[3]}) // sell 10@6
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 6, 5, {from: accounts[2]}) // buy 5@6
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 8, 2, {from: accounts[0]}) // buy 2@8

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[1], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 2, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 1)
            assert.equal(sellOrderBook[0].trader, accounts[1], "Wrong account in the sell order book")
            assert.equal(sellOrderBook[0].filled, 1, "Wrong filled amount")

            await verifyBalances(dex, accounts[0], 47, 116)
            await verifyBalances(dex, accounts[1], 51, 97)
            await verifyBalances(dex, accounts[2], 61, 34)
            await verifyBalances(dex, accounts[3], 41, 153)
        })

        it("Round 3. Market Orders", async () => {
            await dex.createOrder(SELL, MARKET, linkTicker, polygonTicker, 0, 8, {from: accounts[4]}) // sell 8@market
            await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 3, 8, {from: accounts[2]}) // buy 8@3
            await dex.createOrder(BUY, MARKET, linkTicker, polygonTicker, 0, 9, {from: accounts[5]}) // buy 9@market

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 2)
            assert.equal(buyOrderBook[0].trader, accounts[2], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 6, "Wrong filled amount")
            assert.equal(buyOrderBook[1].trader, accounts[5], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[1].filled, 4, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(dex, accounts[1], 49, 115)
            await verifyBalances(dex, accounts[2], 67, 16)
            await verifyBalances(dex, accounts[4], 42, 128)
            await verifyBalances(dex, accounts[5], 54, 72)
        })
    })
})