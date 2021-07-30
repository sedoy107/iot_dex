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
    let tx

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

    function verifyOrderCreated (tx, id, trader, side, orderType, price, amount, debug=false) {
        if(debug) {
            console.log("id: " + id)
            console.log("trader: " + trader)
            console.log("side: " + side)
            console.log("orderType: " + orderType)
            console.log("price: " + price)
            console.log("amount: " + amount)
        }
        truffleAssertions.eventEmitted(tx, 'OrderCreated', (ev) => { 
            return ev.id == id && ev.trader == trader && ev.side == side && ev.orderType == orderType &&
            ev.price == price && ev.amount == amount
        }, "OrderCreated should be emitted with correct values")
    }

    function verifyOrderRemoved (tx, id, trader, filled, debug=false) {
        if(debug) {
            console.log("id: " + id)
            console.log("trader: " + trader)
            console.log("filled: " + filled)
            console.log("amount: " + amount)
        }
        truffleAssertions.eventEmitted(tx, 'OrderRemoved', (ev) => { 
            return ev.id == id && ev.trader == trader && ev.filled == filled
        }, "OrderRemoved should be emitted with correct values")
    }

    function verifyOrderFilled (tx, id, trader, price, filled, debug=false) {
        if(debug) {
            console.log("id: " + id)
            console.log("trader: " + trader)
            console.log("price: " + price)
            console.log("filled: " + filled)
        }
        truffleAssertions.eventEmitted(tx, 'OrderFilled', (ev) => { 
            return ev.id == id && ev.trader == trader && ev.price == price && ev.filled == filled
        }, "OrderFilled should be emitted with correct values")
    }

    describe("Token Swaps", async () => {

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
            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 5, 4, {from: accounts[1]}) // 0: buy 4@5
            verifyOrderCreated(tx, 0, accounts[1], BUY, LIMIT, 5, 4)
            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 6, 2, {from: accounts[2]}) // 1: buy 2@6
            verifyOrderCreated(tx, 1, accounts[2], BUY, LIMIT, 6, 2)
            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 7, 1, {from: accounts[3]}) // 2: buy 1@7
            verifyOrderCreated(tx, 2, accounts[3], BUY, LIMIT, 7, 1)
            
            await dex.cancelOrder(1, BUY, linkTicker, polygonTicker) // cancel BUY order with id 1
            
            tx = await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 5, 5, {from: accounts[0]}) // 3: sell 5@5
            verifyOrderCreated(tx, 3, accounts[0], SELL, LIMIT, 5, 5)
            verifyOrderFilled(tx, 2, accounts[3], 7, 1)
            verifyOrderFilled(tx, 3, accounts[0], 7, 1)
            verifyOrderRemoved(tx, 2, accounts[3], 1)
            verifyOrderRemoved(tx, 1, accounts[2], 0)
            verifyOrderFilled(tx, 0, accounts[1], 5, 4)
            verifyOrderFilled(tx, 3, accounts[0], 5, 4)
            verifyOrderRemoved(tx, 0, accounts[1], 4)
            verifyOrderRemoved(tx, 3, accounts[0], 5)

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
            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 3, 10, {from: accounts[2]}) // 4: buy 10@3
            verifyOrderCreated(tx, 4, accounts[2], BUY, LIMIT, 3, 10)
            
            // Cancel order 4
            await dex.cancelOrder(4, BUY, linkTicker, polygonTicker)

            tx = await dex.createOrder(SELL, MARKET, linkTicker, polygonTicker, 0, 8, {from: accounts[4]}) // 5: sell 8@market
            verifyOrderCreated(tx, 5, accounts[4], SELL, MARKET, 0, 8)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 4, accounts[2], 0)
            
            // Will be fulfilled by order 5
            tx = await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, 3, 1, {from: accounts[2]}) // 6: buy 1@3
            verifyOrderCreated(tx, 6, accounts[2], BUY, LIMIT, 3, 1)
            verifyOrderFilled(tx, 5, accounts[4], 3, 1)
            verifyOrderFilled(tx, 6, accounts[2], 3, 1)
            verifyOrderRemoved(tx, 6, accounts[2], 1)

            // Cancel partially filled order 5
            await dex.cancelOrder(5, SELL, linkTicker, polygonTicker)

            // This market order will still be created because order 5 has not been popped yet
            tx = await dex.createOrder(BUY, MARKET, linkTicker, polygonTicker, 0, 9, {from: accounts[5]}) // 7: buy 9@market
            verifyOrderCreated(tx, 7, accounts[5], BUY, MARKET, 0, 9)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 5, accounts[4], 1)

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
        it("should correctly handle IOC orders", async () => { 
            tx = await dex.createOrder(SELL, IOC, linkTicker, polygonTicker, 10, 10, {from: accounts[2]})// 8: sell 10@10 ioc
            verifyOrderCreated(tx, 8, accounts[2], SELL, IOC, 10, 10)
            verifyOrderFilled(tx, 7, accounts[5], 10, 9)
            verifyOrderFilled(tx, 8, accounts[2], 10, 9)
            verifyOrderRemoved(tx, 7, accounts[5], 9)
            verifyOrderRemoved(tx, 8, accounts[2], 9)

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], linkTicker, polygonTicker, 42, 187)
            await verifyBalances(accounts[5], linkTicker, polygonTicker, 59, 10)
        })
        it("should correctly handle FOK orders", async () => { 
            tx = await dex.createOrder(BUY, FOK, linkTicker, polygonTicker, 2, 5, {from: accounts[2]}) // 9: buy 5@2 fok
            verifyOrderCreated(tx, 9, accounts[2], BUY, FOK, 2, 5)
            tx = await dex.createOrder(SELL, MARKET, linkTicker, polygonTicker, 0, 4, {from: accounts[5]})// 10: sell 4@market
            verifyOrderCreated(tx, 10, accounts[5], SELL, MARKET, 0, 4)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 9, accounts[2], 0)

            tx = await dex.createOrder(BUY, FOK, linkTicker, polygonTicker, 2, 4, {from: accounts[2]}) // 11: buy 5@2 fok
            verifyOrderCreated(tx, 11, accounts[2], BUY, FOK, 2, 4)
            verifyOrderFilled(tx, 10, accounts[5], 2, 4)
            verifyOrderFilled(tx, 11, accounts[2], 2, 4)
            verifyOrderRemoved(tx, 10, accounts[5], 4)
            verifyOrderRemoved(tx, 11, accounts[2], 4)

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], linkTicker, polygonTicker, 46, 179)
            await verifyBalances(accounts[5], linkTicker, polygonTicker, 55, 18)
        })
        it("should correctly handle two matching FOK orders", async () => { 
            tx = await dex.createOrder(BUY, FOK, linkTicker, polygonTicker, 3, 10, {from: accounts[2]}) // 12: buy 10@2
            verifyOrderCreated(tx, 12, accounts[2], BUY, FOK, 3, 10)
            tx = await dex.createOrder(SELL, FOK, linkTicker, polygonTicker, 2, 5, {from: accounts[5]}) // 13: sell 5@2
            verifyOrderCreated(tx, 13, accounts[5], SELL, FOK, 2, 5)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 12, accounts[2], 0)

            let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 1)

            tx =  await dex.createOrder(BUY, FOK, linkTicker, polygonTicker, 2, 5, {from: accounts[2]}) // 14: buy 5@2 
            verifyOrderCreated(tx, 14, accounts[2], BUY, FOK, 2, 5)
            verifyOrderFilled(tx, 13, accounts[5], 2, 5)
            verifyOrderFilled(tx, 14, accounts[2], 2, 5)
            verifyOrderRemoved(tx, 13, accounts[5], 5)
            verifyOrderRemoved(tx, 14, accounts[2], 5)

            buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker)
            assert.equal(buyOrderBook.length, 0)
            sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], linkTicker, polygonTicker, 51, 169)
            await verifyBalances(accounts[5], linkTicker, polygonTicker, 50, 28)
        })
        it("should correctly handle MOC orders", async () => { 
            await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 4, 5, {from: accounts[2]}) // 15: sell 5@4
            await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, 5, 6, {from: accounts[1]}) // 16: sell 6@5
            tx = await dex.createOrder(BUY, MOC, linkTicker, polygonTicker, 5, 6, {from: accounts[4]}) // 17 buy 6@5
            verifyOrderCreated(tx, 17, accounts[4], BUY, MOC, 5, 6)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 17, accounts[4], 0)

            tx = await dex.createOrder(BUY, MOC, linkTicker, polygonTicker, 3, 6, {from: accounts[4]}) // 18 buy 6@3
            verifyOrderCreated(tx, 18, accounts[4], BUY, MOC, 3, 6)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            truffleAssertions.eventNotEmitted(tx, "OrderRemoved")

            tx = await dex.createOrder(SELL, MARKET, linkTicker, polygonTicker, 0, 1, {from: accounts[5]}) // 19: sell 1@market
            verifyOrderCreated(tx, 19, accounts[5], SELL, MARKET, 0, 1)
            verifyOrderFilled(tx, 18, accounts[4], 3, 1)
            verifyOrderFilled(tx, 19, accounts[5], 3, 1)
            verifyOrderRemoved(tx, 19, accounts[5], 1)
        })
    })
    describe.only("Ether Swaps", async () => {

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

        it("should correctly process limit orders where order get cancelled", async () => {
            tx = await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 5, 4, {from: accounts[1]}) // 0: buy 4@5
            verifyOrderCreated(tx, 0, accounts[1], BUY, LIMIT, 5, 4)
            tx = await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 6, 2, {from: accounts[2]}) // 1: buy 2@6
            verifyOrderCreated(tx, 1, accounts[2], BUY, LIMIT, 6, 2)
            tx = await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 7, 1, {from: accounts[3]}) // 2: buy 1@7
            verifyOrderCreated(tx, 2, accounts[3], BUY, LIMIT, 7, 1)
            
            await dex.cancelOrder(1, BUY, wbtcTicker, etherTicker) // cancel BUY order with id 1
            
            tx = await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 5, 5, {from: accounts[0]}) // 3: sell 5@5
            verifyOrderCreated(tx, 3, accounts[0], SELL, LIMIT, 5, 5)
            verifyOrderFilled(tx, 2, accounts[3], 7, 1)
            verifyOrderFilled(tx, 3, accounts[0], 7, 1)
            verifyOrderRemoved(tx, 2, accounts[3], 1)
            verifyOrderRemoved(tx, 1, accounts[2], 0)
            verifyOrderFilled(tx, 0, accounts[1], 5, 4)
            verifyOrderFilled(tx, 3, accounts[0], 5, 4)
            verifyOrderRemoved(tx, 0, accounts[1], 4)
            verifyOrderRemoved(tx, 3, accounts[0], 5)

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[0], wbtcTicker, etherTicker, 45, 127)
            await verifyBalances(accounts[1], wbtcTicker, etherTicker, 54, 80)
            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 50, 100)
            await verifyBalances(accounts[3], wbtcTicker, etherTicker, 51, 93)
        })
        it("should correctly handle market orders where order get cancelled", async () => {
            tx = await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 3, 10, {from: accounts[2]}) // 4: buy 10@3
            verifyOrderCreated(tx, 4, accounts[2], BUY, LIMIT, 3, 10)
            
            // Cancel order 4
            await dex.cancelOrder(4, BUY, wbtcTicker, etherTicker)

            tx = await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 8, {from: accounts[4]}) // 5: sell 8@market
            verifyOrderCreated(tx, 5, accounts[4], SELL, MARKET, 0, 8)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 4, accounts[2], 0)
            
            // Will be fulfilled by order 5
            tx = await dex.createOrder(BUY, LIMIT, wbtcTicker, etherTicker, 3, 1, {from: accounts[2]}) // 6: buy 1@3
            verifyOrderCreated(tx, 6, accounts[2], BUY, LIMIT, 3, 1)
            verifyOrderFilled(tx, 5, accounts[4], 3, 1)
            verifyOrderFilled(tx, 6, accounts[2], 3, 1)
            verifyOrderRemoved(tx, 6, accounts[2], 1)

            // Cancel partially filled order 5
            await dex.cancelOrder(5, SELL, wbtcTicker, etherTicker)

            // This market order will still be created because order 5 has not been popped yet
            tx = await dex.createOrder(BUY, MARKET, wbtcTicker, etherTicker, 0, 9, {from: accounts[5]}) // 7: buy 9@market
            verifyOrderCreated(tx, 7, accounts[5], BUY, MARKET, 0, 9)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 5, accounts[4], 1)

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 1)
            assert.equal(buyOrderBook[0].trader, accounts[5], "Wrong account in the buy order book")
            assert.equal(buyOrderBook[0].filled, 0, "Wrong filled amount")
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 51, 97)
            await verifyBalances(accounts[4], wbtcTicker, etherTicker, 49, 103)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 50, 100)
        })
        it("should correctly handle IOC orders", async () => { 
            tx = await dex.createOrder(SELL, IOC, wbtcTicker, etherTicker, 10, 10, {from: accounts[2]})// 8: sell 10@10 ioc
            verifyOrderCreated(tx, 8, accounts[2], SELL, IOC, 10, 10)
            verifyOrderFilled(tx, 7, accounts[5], 10, 9)
            verifyOrderFilled(tx, 8, accounts[2], 10, 9)
            verifyOrderRemoved(tx, 7, accounts[5], 9)
            verifyOrderRemoved(tx, 8, accounts[2], 9)

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 42, 187)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 59, 10)
        })
        it("should correctly handle FOK orders", async () => { 
            tx = await dex.createOrder(BUY, FOK, wbtcTicker, etherTicker, 2, 5, {from: accounts[2]}) // 9: buy 5@2 fok
            verifyOrderCreated(tx, 9, accounts[2], BUY, FOK, 2, 5)
            tx = await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 4, {from: accounts[5]})// 10: sell 4@market
            verifyOrderCreated(tx, 10, accounts[5], SELL, MARKET, 0, 4)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 9, accounts[2], 0)

            tx = await dex.createOrder(BUY, FOK, wbtcTicker, etherTicker, 2, 4, {from: accounts[2]}) // 11: buy 5@2 fok
            verifyOrderCreated(tx, 11, accounts[2], BUY, FOK, 2, 4)
            verifyOrderFilled(tx, 10, accounts[5], 2, 4)
            verifyOrderFilled(tx, 11, accounts[2], 2, 4)
            verifyOrderRemoved(tx, 10, accounts[5], 4)
            verifyOrderRemoved(tx, 11, accounts[2], 4)

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 46, 179)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 55, 18)
        })
        it("should correctly handle two matching FOK orders", async () => { 
            tx = await dex.createOrder(BUY, FOK, wbtcTicker, etherTicker, 3, 10, {from: accounts[2]}) // 12: buy 10@2
            verifyOrderCreated(tx, 12, accounts[2], BUY, FOK, 3, 10)
            tx = await dex.createOrder(SELL, FOK, wbtcTicker, etherTicker, 2, 5, {from: accounts[5]}) // 13: sell 5@2
            verifyOrderCreated(tx, 13, accounts[5], SELL, FOK, 2, 5)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 12, accounts[2], 0)

            let buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            let sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 1)

            tx =  await dex.createOrder(BUY, FOK, wbtcTicker, etherTicker, 2, 5, {from: accounts[2]}) // 14: buy 5@2 
            verifyOrderCreated(tx, 14, accounts[2], BUY, FOK, 2, 5)
            verifyOrderFilled(tx, 13, accounts[5], 2, 5)
            verifyOrderFilled(tx, 14, accounts[2], 2, 5)
            verifyOrderRemoved(tx, 13, accounts[5], 5)
            verifyOrderRemoved(tx, 14, accounts[2], 5)

            buyOrderBook = await dex.getOrderBook(BUY, wbtcTicker, etherTicker)
            assert.equal(buyOrderBook.length, 0)
            sellOrderBook = await dex.getOrderBook(SELL, wbtcTicker, etherTicker)
            assert.equal(sellOrderBook.length, 0)

            await verifyBalances(accounts[2], wbtcTicker, etherTicker, 51, 169)
            await verifyBalances(accounts[5], wbtcTicker, etherTicker, 50, 28)
        })
        it("should correctly handle MOC orders", async () => { 
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 4, 5, {from: accounts[2]}) // 15: sell 5@4
            await dex.createOrder(SELL, LIMIT, wbtcTicker, etherTicker, 5, 6, {from: accounts[1]}) // 16: sell 6@5
            tx = await dex.createOrder(BUY, MOC, wbtcTicker, etherTicker, 5, 6, {from: accounts[4]}) // 17 buy 6@5
            verifyOrderCreated(tx, 17, accounts[4], BUY, MOC, 5, 6)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            verifyOrderRemoved(tx, 17, accounts[4], 0)

            tx = await dex.createOrder(BUY, MOC, wbtcTicker, etherTicker, 3, 6, {from: accounts[4]}) // 18 buy 6@3
            verifyOrderCreated(tx, 18, accounts[4], BUY, MOC, 3, 6)
            truffleAssertions.eventNotEmitted(tx, "OrderFilled")
            truffleAssertions.eventNotEmitted(tx, "OrderRemoved")

            tx = await dex.createOrder(SELL, MARKET, wbtcTicker, etherTicker, 0, 1, {from: accounts[5]}) // 19: sell 1@market
            verifyOrderCreated(tx, 19, accounts[5], SELL, MARKET, 0, 1)
            verifyOrderFilled(tx, 18, accounts[4], 3, 1)
            verifyOrderFilled(tx, 19, accounts[5], 3, 1)
            verifyOrderRemoved(tx, 19, accounts[5], 1)
        })
    })
})
