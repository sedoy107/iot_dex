'use strict'

const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")
const StableCoin = artifacts.require("StableCoin")

const Chance = require('chance')
const chance = new Chance()

const truffleAssertions = require('truffle-assertions')

describe("Dex Test", async () => {

    // references for convenience
    const fromUtf8 = web3.utils.fromUtf8
    const fromAscii = web3.utils.fromAscii
    const toWei = web3.utils.toWei

    // Order book side constants
    const BUY = 0
    const SELL = 1

    // Order types constants
    const MARKET = 0;
    const LIMIT = 1;
    const IOC = 2;
    const FOK = 3;
    const MOC = 4;

    // Declare global reusable variables
    let dex, tx 
    let link, matic, wbtc, usdp
    const eth = {
        contract: null,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        ticker: fromUtf8('ETH'),
        decimals: 18
    }

    // Distribute some tokens to the wallet accounts
    let balances = [
        {accountId: 1, quantity: (5 * (10 ** 20)).toString()},
        {accountId: 2, quantity: (5 * (10 ** 20)).toString()},
        {accountId: 3, quantity: (5 * (10 ** 20)).toString()},
        {accountId: 4, quantity: (5 * (10 ** 20)).toString()},
        {accountId: 5, quantity: (5 * (10 ** 20)).toString()},
    ]

    // Auxiliary function to verify balances after the trades have completed
    async function verifyBalances (account, ticker_1, ticker_2, expected_1, expected_2) {
        let balance_1 = (await dex.balances(account, ticker_1, {from: account})).toString()
        let balance_2 = (await dex.balances(account, ticker_2, {from: account})).toString()
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

    async function buildTokenObject(contract) {
        return {
            erc20: contract,
            address: contract.address,
            symbol: await contract.symbol(),
            ticker: fromUtf8(await contract.symbol()),
            decimals: (await contract.decimals()).toNumber()
        }
    }

    async function setupTest1 (accounts) {
        dex = await Dex.new()
        
        const linkContract = await Link.new()
        const polygonContract = await Polygon.new()
        const wrappedBitcoinContract = await WrappedBitcoin.new()
        const stableCoinContract = await StableCoin.new()

        link = await buildTokenObject(linkContract)
        matic = await buildTokenObject(polygonContract)
        wbtc = await buildTokenObject(wrappedBitcoinContract)
        usdp = await buildTokenObject(stableCoinContract)

        const tokens = [link, matic, wbtc, usdp]

        for (let {erc20, address, symbol, ticker, decimals} of tokens ) {

            // Add the token to the Dex
            await dex.addToken(ticker, address)

            for (let {accountId, quantity} of balances) {

                // Transfer some tokens to the target account `accounts[accountId]`
                await erc20.transfer(accounts[accountId], quantity)
                // Approve Dex for spending the funds on behalf of the target account `accounts[accountId]`
                await erc20.approve(dex.address, quantity, {from: accounts[accountId]})
                
                // Make deposit of tokens to Dex contract
                await dex.deposit(quantity, ticker, {from: accounts[accountId]})
            }
        }

        // Add pairs ETH/...
        await dex.addPair(eth.ticker, link.ticker)
        await dex.addPair(eth.ticker, matic.ticker)
        await dex.addPair(eth.ticker, wbtc.ticker)
        await dex.addPair(eth.ticker, usdp.ticker)
        // Add pairs LINK/eth
        await dex.addPair(link.ticker, matic.ticker)
        await dex.addPair(link.ticker, wbtc.ticker)
        // Add pairs USDP/...
        await dex.addPair(usdp.ticker, link.ticker)
        await dex.addPair(usdp.ticker, matic.ticker)
        await dex.addPair(usdp.ticker, wbtc.ticker)
    }

    async function setupTest2(accounts) {
        await setupTest1(accounts)

        // Fill the BUY side
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '3000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[5]}) // buy 5 LINK @ 3 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '2500000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[4]}) // buy 5 LINK @ 2.5 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '2000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[3]}) // buy 5 LINK @ 2 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1500000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[2]}) // buy 5 LINK @ 1.5 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[1]}) // buy 5 LINK @ 1 MATIC 
       
        // Fill the SELL side
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '9000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[1]}) // sell 5 LINK @ 9 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '8500000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[2]}) // sell 5 LINK @ 8.5 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '8000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[3]}) // sell 5 LINK @ 8 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '7500000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[4]}) // sell 5 LINK @ 7.5 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '7000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[5]}) // sell 5 LINK @ 7 MATIC
       
    }

    async function setupTest3(accounts) {
        await setupTest1(accounts)

        // Fill the BUY side
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '3019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[5]}) // buy 0.000000005 LINK @ 3 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '2519287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[4]}) // buy 0.000000005 LINK @ 2.5 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '2019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[3]}) // buy 0.000000005 LINK @ 2 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1519287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[2]}) // buy 0.000000005 LINK @ 1.5 MATIC 
        await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[1]}) // buy 0.000000005 LINK @ 1 MATIC 
       
        // Fill the SELL side
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '9019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[1]}) // sell 0.000000005 LINK @ 9 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '8519287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[2]}) // sell 0.000000005 LINK @ 8.5 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '8019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[3]}) // sell 0.000000005 LINK @ 8 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '7519287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[4]}) // sell 0.000000005 LINK @ 7.5 MATIC
        await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '7019287371983123442', (5 * (10 ** 9)).toString(), {from: accounts[5]}) // sell 0.000000005 LINK @ 7 MATIC
       
    }

    async function setupTest4 (accounts) {
        await setupTest1(accounts)

        // Fill the BUY si
        await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '700000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[5]}) // buy 50 USDP @ 0.70 MATIC 
        await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '650000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[4]}) // buy 50 USDP @ 0.65 MATIC 
        await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '600000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[3]}) // buy 50 USDP @ 0.60 MATIC 
        await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '550000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[2]}) // buy 50 USDP @ 0.55 MATIC 
        await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '500000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[1]}) // buy 50 USDP @ 0.50 MATIC 

        // Fill the SELL side
        await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '1000000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[1]}) // sell 50 USDP @ 1.00 MATIC
        await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '950000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[2]}) // sell 50 USDP @ 0.95 MATIC
        await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '900000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[3]}) // sell 50 USDP @ 0.90 MATIC
        await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '850000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[4]}) // sell 50 USDP @ 0.85 MATIC
        await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '800000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[5]}) // sell 50 USDP @ 0.80 MATIC
       
    }

    contract("generic test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest1(accounts))
        
        it ("should have correct balance for each of the accounts", async () => {
            const tokens = [link, matic, wbtc, usdp]
        
            for (let {accountId, quantity} of balances) {
                for (let {erc20, address, symbol, ticker, decimals} of tokens ) {
                    const balanceMsg = `\naccountId: ${accountId}\naccount: ${accounts[accountId]}\ndeposit: ${quantity}`
                    const tokenMsg = `\naddress: ${address}\nsymbol: ${symbol}\nticker: ${ticker}\ndecimals: ${decimals}`

                    assert.equal((await dex.balances(accounts[accountId], ticker)).toString(), quantity, `Dex deposit failed:\n${balanceMsg}${tokenMsg}`)
                }
            }
        })

        it ("should not create a limit order if the pair does not exist", async () => {
            await truffleAssertions.reverts(
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, 5, 4, {from: accounts[1]}) // buy 4 linkWei @ 5 maticWei
            )
        })

        it ("should not create a limit order if price OR amount are below 10^9", async () => {

            await truffleAssertions.reverts(
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1000000000', '999999999', {from: accounts[1]})
            )

            await truffleAssertions.reverts(
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '999999999', '1000000000', {from: accounts[1]})
            )
        })

        it ("should not create a limit order if fund were not deposited", async () => {
            await truffleAssertions.reverts(
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, 0, '1000000000000000000', {from: accounts[0]}) // buy 1 ETH @ market
            )
        })

        it ("should not create a market order if the price is below 10^9", async () => {
            await truffleAssertions.reverts(
                dex.createOrder(BUY, MARKET, link.ticker, matic.ticker, 0, '999999999', {from: accounts[1]}) // buy 9k-1 maticWei @ market
            )
        })

        it ("should not create a market order if the market is not available", async () => {
            await truffleAssertions.reverts(
                dex.createOrder(BUY, MARKET, link.ticker, matic.ticker, 0, '1000000000', {from: accounts[1]}) // buy 9k maticWei @ market
            )
        })
    })

    contract("limit order creation test", async accounts => {

        beforeEach("setup contracts and deposit tokens", async () => setupTest1(accounts))

        it ("should create a buy limit order", async () => {
            await truffleAssertions.passes(
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), {from: accounts[1]}) // buy 5 LINK @ 100 MATIC
            )
        })

        it ("should create a sell limit order", async () => {
            await truffleAssertions.passes(
                dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), {from: accounts[1]}) // sell 5 LINK @ 100 MATIC
            )
        })

        it ("should create a buy limit order and emit orderCreate event", async () => {
            tx = await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), {from: accounts[1]}) // buy 5 LINK @ 100 MATIC
            verifyOrderCreated (tx, 0, accounts[1], BUY, LIMIT, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), false)
        })

        it ("should create a sell limit order and emit orderCreate event", async () => {
            tx = await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), {from: accounts[1]}) // sell 5 LINK @ 100 MATIC
            verifyOrderCreated (tx, 0, accounts[1], SELL, LIMIT, (10 ** 20).toString(), (5 * (10 ** 18)).toString(), false)
        })
    })

    contract("test order placement within the order book", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("should have correct sell side of the order book", async () => {
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5, "Must have 5 sell orders")
            assert.equal(orderBookSell.slice(-1)[0].id, 9, "Order id 9 must be the best sell order")
        })

        it("should have correct buy side of the order book", async () => {
            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5, "Must have 5 buy orders")
            assert.equal(orderBookBuy.slice(-1)[0].id, 0, "Order id 0 must be the best buy order")
        })
        
        it("should place the best sell limit orders at the top of the sell side on the order book", async () => {
            await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '6500000000000000000', (1 * (10 ** 18)).toString(), {from: accounts[1]}) // sell 1 LINK @ 6.5 MATIC
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 6, "Must have 6 sell orders")
            assert.equal(orderBookSell.slice(-1)[0].id, 10, "Order id 11 must be the best sell order")
        })

        it("should place the best buy limit orders at the top of the buy side on the order book", async () => {
            await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '3500000000000000000', (1 * (10 ** 18)).toString(), {from: accounts[1]}) // buy 1 LINK @ 3.5 MATIC
            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 6, "Must have 6 buy orders")
            assert.equal(orderBookBuy.slice(-1)[0].id, 11, "Order id 10 must be the best buy order")
        })
    })

    contract("limit order execution and event emission test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("should execute buy limit order and emit events", async () => {
            tx = await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '9000000000000000000', '1000000000000000000', {from: accounts[1]}) // buy 1 LINK @ 9 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, LIMIT, '9000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 9, accounts[5], '7000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '1000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '501000000000000000000', '493000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '499000000000000000000', '507000000000000000000')
        })

        it("should execute sell limit order and emit events", async () => {
            tx = await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '1000000000000000000', {from: accounts[1]}) // sell 1 LINK @ 1 MATIC
            verifyOrderCreated (tx, 11, accounts[1], SELL, LIMIT, '1000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 0, accounts[5], '3000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 11, accounts[1], '3000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '1000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '500000000000000000000', '496000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '500000000000000000000', '504000000000000000000')
        })
    })

    contract("limit order execution when price flooring cuts the least significant numbers", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest3(accounts))

        it("should execute buy limit order and emit events", async () => {
            tx = await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '9000000000000000000', '1000000000', {from: accounts[1]}) // buy 0.000000001 LINK @ 9.5 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, LIMIT, '9000000000000000000', '1000000000')
            verifyOrderFilled(tx, 9, accounts[5], '7019287371983123442', '1000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7019287371983123442', '1000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '1000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '500000000001000000000', '499999999992980712629')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '499999999999000000000', '500000000007019287371')
        })

        it("should execute sell limit order and emit events", async () => {
            tx = await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '1000000000', {from: accounts[1]}) // sell 0.000000001 LINK @ 1 MATIC
            verifyOrderCreated (tx, 11, accounts[1], SELL, LIMIT, '1000000000000000000', '1000000000')
            verifyOrderFilled(tx, 0, accounts[5], '3019287371983123442', '1000000000')
            verifyOrderFilled(tx, 11, accounts[1], '3019287371983123442', '1000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '1000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '500000000000000000000', '499999999996000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '500000000000000000000', '500000000004000000000')
        })
    })

    contract("buy/sell entire market with limit order test", async accounts => {

        beforeEach("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("should execute buy limit order and emit events", async () => {
            tx = await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '9000000000000000000', '25000000000000000000', {from: accounts[1]}) // buy 25 LINK @ 9 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, LIMIT, '9000000000000000000', '25000000000000000000')
            
            verifyOrderFilled(tx, 9, accounts[5], '7000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7000000000000000000', '5000000000000000000')
            verifyOrderRemoved(tx, 9, accounts[5], '5000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '495000000000000000000', '535000000000000000000')
            
            verifyOrderFilled(tx, 8, accounts[4], '7500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7500000000000000000', '10000000000000000000')
            verifyOrderRemoved(tx, 8, accounts[4], '5000000000000000000')
            await verifyBalances(accounts[4], link.ticker, matic.ticker, '495000000000000000000', '537500000000000000000')

            verifyOrderFilled(tx, 7, accounts[3], '8000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '8000000000000000000', '15000000000000000000')
            verifyOrderRemoved(tx, 7, accounts[3], '5000000000000000000')
            await verifyBalances(accounts[3], link.ticker, matic.ticker, '495000000000000000000', '540000000000000000000')

            verifyOrderFilled(tx, 6, accounts[2], '8500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '8500000000000000000', '20000000000000000000')
            verifyOrderRemoved(tx, 6, accounts[2], '5000000000000000000')
            await verifyBalances(accounts[2], link.ticker, matic.ticker, '495000000000000000000', '542500000000000000000')

            verifyOrderFilled(tx, 5, accounts[1], '9000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '9000000000000000000', '25000000000000000000')
            verifyOrderRemoved(tx, 5, accounts[1], '5000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '520000000000000000000', '345000000000000000000')

        })

        it("should execute sell limit order and emit events", async () => {
            tx = await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '25000000000000000000', {from: accounts[1]}) // sell 25 LINK @ 1 MATIC
            verifyOrderCreated (tx, 10, accounts[1], SELL, LIMIT, '1000000000000000000', '25000000000000000000')
            
            verifyOrderFilled(tx, 0, accounts[5], '3000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '3000000000000000000', '5000000000000000000')
            verifyOrderRemoved(tx, 0, accounts[5], '5000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '505000000000000000000', '485000000000000000000')
            
            verifyOrderFilled(tx, 1, accounts[4], '2500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '2500000000000000000', '10000000000000000000')
            verifyOrderRemoved(tx, 1, accounts[4], '5000000000000000000')
            await verifyBalances(accounts[4], link.ticker, matic.ticker, '505000000000000000000', '487500000000000000000')

            verifyOrderFilled(tx, 2, accounts[3], '2000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '2000000000000000000', '15000000000000000000')
            verifyOrderRemoved(tx, 2, accounts[3], '5000000000000000000')
            await verifyBalances(accounts[3], link.ticker, matic.ticker, '505000000000000000000', '490000000000000000000')

            verifyOrderFilled(tx, 3, accounts[2], '1500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '1500000000000000000', '20000000000000000000')
            verifyOrderRemoved(tx, 3, accounts[2], '5000000000000000000')
            await verifyBalances(accounts[2], link.ticker, matic.ticker, '505000000000000000000', '492500000000000000000')

            verifyOrderFilled(tx, 4, accounts[1], '1000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '1000000000000000000', '25000000000000000000')
            verifyOrderRemoved(tx, 4, accounts[1], '5000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '480000000000000000000', '545000000000000000000')
        })
    })
    
    contract("test market order", async accounts => {

        beforeEach("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("should execute buy market order and emit events", async () => {
            tx = await dex.createOrder(BUY, MARKET, link.ticker, matic.ticker, '0', '25000000000000000000', {from: accounts[1]}) // buy 25 LINK @ MARKET
            verifyOrderCreated (tx, 10, accounts[1], BUY, MARKET, '0', '25000000000000000000')
            
            verifyOrderFilled(tx, 9, accounts[5], '7000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7000000000000000000', '5000000000000000000')
            verifyOrderRemoved(tx, 9, accounts[5], '5000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '495000000000000000000', '535000000000000000000')
            
            verifyOrderFilled(tx, 8, accounts[4], '7500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7500000000000000000', '10000000000000000000')
            verifyOrderRemoved(tx, 8, accounts[4], '5000000000000000000')
            await verifyBalances(accounts[4], link.ticker, matic.ticker, '495000000000000000000', '537500000000000000000')

            verifyOrderFilled(tx, 7, accounts[3], '8000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '8000000000000000000', '15000000000000000000')
            verifyOrderRemoved(tx, 7, accounts[3], '5000000000000000000')
            await verifyBalances(accounts[3], link.ticker, matic.ticker, '495000000000000000000', '540000000000000000000')

            verifyOrderFilled(tx, 6, accounts[2], '8500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '8500000000000000000', '20000000000000000000')
            verifyOrderRemoved(tx, 6, accounts[2], '5000000000000000000')
            await verifyBalances(accounts[2], link.ticker, matic.ticker, '495000000000000000000', '542500000000000000000')

            verifyOrderFilled(tx, 5, accounts[1], '9000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '9000000000000000000', '25000000000000000000')
            verifyOrderRemoved(tx, 5, accounts[1], '5000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '520000000000000000000', '345000000000000000000')

        })

        it("should execute sell market order and emit events", async () => {
            tx = await dex.createOrder(SELL, MARKET, link.ticker, matic.ticker, '0', '25000000000000000000', {from: accounts[1]}) // sell 25 LINK @ MARKET
            verifyOrderCreated (tx, 10, accounts[1], SELL, MARKET, '0', '25000000000000000000')
            
            verifyOrderFilled(tx, 0, accounts[5], '3000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '3000000000000000000', '5000000000000000000')
            verifyOrderRemoved(tx, 0, accounts[5], '5000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '505000000000000000000', '485000000000000000000')
            
            verifyOrderFilled(tx, 1, accounts[4], '2500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '2500000000000000000', '10000000000000000000')
            verifyOrderRemoved(tx, 1, accounts[4], '5000000000000000000')
            await verifyBalances(accounts[4], link.ticker, matic.ticker, '505000000000000000000', '487500000000000000000')

            verifyOrderFilled(tx, 2, accounts[3], '2000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '2000000000000000000', '15000000000000000000')
            verifyOrderRemoved(tx, 2, accounts[3], '5000000000000000000')
            await verifyBalances(accounts[3], link.ticker, matic.ticker, '505000000000000000000', '490000000000000000000')

            verifyOrderFilled(tx, 3, accounts[2], '1500000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '1500000000000000000', '20000000000000000000')
            verifyOrderRemoved(tx, 3, accounts[2], '5000000000000000000')
            await verifyBalances(accounts[2], link.ticker, matic.ticker, '505000000000000000000', '492500000000000000000')

            verifyOrderFilled(tx, 4, accounts[1], '1000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '1000000000000000000', '25000000000000000000')
            verifyOrderRemoved(tx, 4, accounts[1], '5000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000000000000')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '480000000000000000000', '545000000000000000000')
        })

        it("market order buys the market and remains in the order book", async () => {
            tx = await dex.createOrder(BUY, MARKET, link.ticker, matic.ticker, '0', '30000000000000000000', {from: accounts[1]}) // buy 30 LINK @ MARKET
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '520000000000000000000', '345000000000000000000')
            
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 0)

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 6)
            
            const {id, isActive, side, orderType, trader, amount, price, filled} = orderBookBuy.slice(-1)[0]
            assert.equal(id, 10)
            assert.equal(isActive, true)
            assert.equal(side, BUY)
            assert.equal(orderType, MARKET)
            assert.equal(trader, accounts[1])
            assert.equal(amount, '30000000000000000000')
            assert.equal(price, '9000000000000000000')
            assert.equal(filled, '25000000000000000000')
        })

        it("market order sells the market and remains in the order book", async () => {
            tx = await dex.createOrder(SELL, MARKET, link.ticker, matic.ticker, '0', '30000000000000000000', {from: accounts[1]}) // sell 30 LINK @ MARKET
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '480000000000000000000', '545000000000000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 0)

            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 6)
            
            const {id, isActive, side, orderType, trader, amount, price, filled} = orderBookSell.slice(-1)[0]
            assert.equal(id, 10)
            assert.equal(isActive, true)
            assert.equal(side, SELL)
            assert.equal(orderType, MARKET)
            assert.equal(trader, accounts[1])
            assert.equal(amount, '30000000000000000000')
            assert.equal(price, '1000000000000000000')
            assert.equal(filled, '25000000000000000000')
        })
    })

    contract("remaining order amount that is < the MIN_AMOUNT ( 10^9 ) should not be put on the order book", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("limit order executed but the remaining amount is too small to be filled at the requested price", async () => {
            tx = await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '900000000000000000', '5000000000000000001', {from: accounts[1]}) // sell 5 LINK and 1 wei @ 0.9 MATIC
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '495000000000000000000', '515000000000000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 4)

            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)

            await verifyOrderRemoved(tx, 10, accounts[1], '5000000000000000000')
        })
    })

    contract("limit MOC order test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("should not let MOC buy order to be placed; should emit events", async () => {
            tx = await dex.createOrder(BUY, MOC, link.ticker, matic.ticker, '9000000000000000000', '1000000000000000000', {from: accounts[1]}) // buy 1 LINK @ 9 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, MOC, '9000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '0')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '500000000000000000000', '500000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '500000000000000000000', '500000000000000000000')
        })

        it("should not let MOC sell order to be placed; should emit events", async () => {
            tx = await dex.createOrder(SELL, MOC, link.ticker, matic.ticker, '1000000000000000000', '1000000000000000000', {from: accounts[1]}) // sell 1 LINK @ 1 MATIC
            verifyOrderCreated (tx, 11, accounts[1], SELL, MOC, '1000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '0')
            await verifyBalances(accounts[1], link.ticker, matic.ticker, '500000000000000000000', '500000000000000000000')
            await verifyBalances(accounts[5], link.ticker, matic.ticker, '500000000000000000000', '500000000000000000000')
        })

        it("should let MOC buy order in; should not emit OrderFilled and OrderRemoved events", async () => {
            tx = await dex.createOrder(BUY, MOC, link.ticker, matic.ticker, '1000000000000000000', '1000000000000000000', {from: accounts[1]}) // buy 1 LINK @ 1 MATIC
            verifyOrderCreated (tx, 12, accounts[1], BUY, MOC, '1000000000000000000', '1000000000000000000')
            truffleAssertions.eventNotEmitted(tx, 'OrderRemoved')
            truffleAssertions.eventNotEmitted(tx, 'OrderFilled')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 6)
        })

        it("should let MOC sell order in; should not emit OrderFilled and OrderRemoved events", async () => {
            tx = await dex.createOrder(SELL, MOC, link.ticker, matic.ticker, '9000000000000000000', '1000000000000000000', {from: accounts[1]}) // sell 1 LINK @ 9 MATIC
            verifyOrderCreated (tx, 13, accounts[1], SELL, MOC, '9000000000000000000', '1000000000000000000')
            truffleAssertions.eventNotEmitted(tx, 'OrderRemoved')
            truffleAssertions.eventNotEmitted(tx, 'OrderFilled')

            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 6)
        })
    })

    contract("limit FOK order test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("buy FOK order should not be filled and should be removed", async () => {
            tx = await dex.createOrder(BUY, FOK, link.ticker, matic.ticker, '9000000000000000000', '30000000000000000000', {from: accounts[1]}) // buy 30 LINK @ 9 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, FOK, '9000000000000000000', '30000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '0')
            truffleAssertions.eventNotEmitted(tx, 'OrderFilled')
            
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5)
        })

        it("sell FOK order should not be filled and should be removed", async () => {
            tx = await dex.createOrder(SELL, FOK, link.ticker, matic.ticker, '1000000000000000000', '30000000000000000000', {from: accounts[1]}) // sell 30 LINK @ 1 MATIC
            verifyOrderCreated (tx, 11, accounts[1], SELL, FOK, '1000000000000000000', '30000000000000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '0')
            truffleAssertions.eventNotEmitted(tx, 'OrderFilled')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5)

            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)
        })

        it("buy FOK order should be filled in full", async () => {
            tx = await dex.createOrder(BUY, FOK, link.ticker, matic.ticker, '9000000000000000000', '1000000000000000000', {from: accounts[1]}) // buy 1 LINK @ 9 MATIC
            verifyOrderCreated (tx, 12, accounts[1], BUY, FOK, '9000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 12, accounts[1], '1000000000000000000')
            verifyOrderFilled(tx, 9, accounts[5], '7000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 12, accounts[1], '7000000000000000000', '1000000000000000000')
            
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5)
        })

        it("sell FOK order should be filled in full", async () => {
            tx = await dex.createOrder(SELL, FOK, link.ticker, matic.ticker, '1000000000000000000', '1000000000000000000', {from: accounts[1]}) // sell 1 LINK @ 1 MATIC
            verifyOrderCreated (tx, 13, accounts[1], SELL, FOK, '1000000000000000000', '1000000000000000000')
            verifyOrderRemoved(tx, 13, accounts[1], '1000000000000000000')
            verifyOrderFilled(tx, 0, accounts[5], '3000000000000000000', '1000000000000000000')
            verifyOrderFilled(tx, 13, accounts[1], '3000000000000000000', '1000000000000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5)

            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)
        })
    })

    contract("limit IOC order test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest2(accounts))

        it("buy IOC order should be filled and the remaining amount should not rest on the order book", async () => {
            tx = await dex.createOrder(BUY, IOC, link.ticker, matic.ticker, '9000000000000000000', '30000000000000000000', {from: accounts[1]}) // buy 30 LINK @ 9 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, IOC, '9000000000000000000', '30000000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '5000000000000000000')
            verifyOrderFilled(tx, 9, accounts[5], '7000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '7000000000000000000', '5000000000000000000')
            
            const orderBookSell = await dex.getOrderBook(SELL, link.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 4)
        })

        it("sell IOC order should be filled and the remaining amount should not rest on the order book", async () => {
            tx = await dex.createOrder(SELL, IOC, link.ticker, matic.ticker, '1000000000000000000', '30000000000000000000', {from: accounts[1]}) // sell 30 LINK @ 1 MATIC
            verifyOrderCreated (tx, 11, accounts[1], SELL, IOC, '1000000000000000000', '30000000000000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '5000000000000000000')
            verifyOrderFilled(tx, 0, accounts[5], '3000000000000000000', '5000000000000000000')
            verifyOrderFilled(tx, 11, accounts[1], '3000000000000000000', '5000000000000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, link.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 4)
        })
    })

    contract("limit orders with stable coin that has 8 decimals", async accounts => {

        beforeEach("setup contracts and deposit tokens", async () => setupTest4(accounts))

        it("should place buy limit order", async () => {
            tx = await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '1000000000000000000', '1000000000', {from: accounts[1]}) // buy 10 USDP @ 1.0 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, LIMIT, '1000000000000000000', '1000000000')
            verifyOrderFilled(tx, 9, accounts[5], '800000000000000000', '1000000000')
            verifyOrderFilled(tx, 10, accounts[1], '800000000000000000', '1000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '1000000000')
            
            const orderBookSell = await dex.getOrderBook(SELL, usdp.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 5)

            await verifyBalances(accounts[1], usdp.ticker, matic.ticker, '500000000001000000000', '492000000000000000000')
            await verifyBalances(accounts[5], usdp.ticker, matic.ticker, '499999999999000000000', '508000000000000000000')
        })

        it("should place sell limit order", async () => {
            tx = await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '500000000000000000', '1000000000', {from: accounts[1]}) // sell 10 USDP @ 0.4 MATIC
            verifyOrderCreated (tx, 10, accounts[1], SELL, LIMIT, '500000000000000000', '1000000000')
            verifyOrderFilled(tx, 0, accounts[5], '700000000000000000', '1000000000')
            verifyOrderFilled(tx, 10, accounts[1], '700000000000000000', '1000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '1000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, usdp.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 5)

            await verifyBalances(accounts[1], usdp.ticker, matic.ticker, '499999999999000000000', '507000000000000000000')
            await verifyBalances(accounts[5], usdp.ticker, matic.ticker, '500000000001000000000', '493000000000000000000')
        })
    })

    contract("limit orders with stable coin that has 8 decimals", async accounts => {

        beforeEach("setup contracts and deposit tokens", async () => setupTest4(accounts))

        it("buy entire market with limit order", async () => {
            tx = await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '1000000000000000000', '25000000000', {from: accounts[1]}) // buy 250 USDP @ 1 MATIC
            verifyOrderCreated (tx, 10, accounts[1], BUY, LIMIT, '1000000000000000000', '25000000000')
            
            verifyOrderFilled(tx, 9, accounts[5], '800000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '800000000000000000', '5000000000')
            verifyOrderRemoved(tx, 9, accounts[5], '5000000000')

            verifyOrderFilled(tx, 8, accounts[4], '850000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '850000000000000000', '10000000000')
            verifyOrderRemoved(tx, 8, accounts[4], '5000000000')

            verifyOrderFilled(tx, 7, accounts[3], '900000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '900000000000000000', '15000000000')
            verifyOrderRemoved(tx, 7, accounts[3], '5000000000')

            verifyOrderFilled(tx, 6, accounts[2], '950000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '950000000000000000', '20000000000')
            verifyOrderRemoved(tx, 6, accounts[2], '5000000000')

            verifyOrderFilled(tx, 5, accounts[1], '1000000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '1000000000000000000', '25000000000')
            verifyOrderRemoved(tx, 5, accounts[1], '5000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000')
            
            const orderBookSell = await dex.getOrderBook(SELL, usdp.ticker, matic.ticker)
            assert.equal(orderBookSell.length, 0)

            await verifyBalances(accounts[5], usdp.ticker, matic.ticker, '499999999995000000000', '540000000000000000000')
            await verifyBalances(accounts[4], usdp.ticker, matic.ticker, '499999999995000000000', '542500000000000000000')
            await verifyBalances(accounts[3], usdp.ticker, matic.ticker, '499999999995000000000', '545000000000000000000')
            await verifyBalances(accounts[2], usdp.ticker, matic.ticker, '499999999995000000000', '547500000000000000000')
            await verifyBalances(accounts[1], usdp.ticker, matic.ticker, '500000000020000000000', '325000000000000000000')
        })

        it("buy entire market with limit order", async () => {
            tx = await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '500000000000000000', '25000000000', {from: accounts[1]}) // sell 250 USDP @ 0.5 MATIC
            verifyOrderCreated (tx, 10, accounts[1], SELL, LIMIT, '500000000000000000', '25000000000')
            
            verifyOrderFilled(tx, 0, accounts[5], '700000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '700000000000000000', '5000000000')
            verifyOrderRemoved(tx, 0, accounts[5], '5000000000')

            verifyOrderFilled(tx, 1, accounts[4], '650000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '650000000000000000', '10000000000')
            verifyOrderRemoved(tx, 1, accounts[4], '5000000000')

            verifyOrderFilled(tx, 2, accounts[3], '600000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '600000000000000000', '15000000000')
            verifyOrderRemoved(tx, 2, accounts[3], '5000000000')

            verifyOrderFilled(tx, 3, accounts[2], '550000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '550000000000000000', '20000000000')
            verifyOrderRemoved(tx, 3, accounts[2], '5000000000')

            verifyOrderFilled(tx, 4, accounts[1], '500000000000000000', '5000000000')
            verifyOrderFilled(tx, 10, accounts[1], '500000000000000000', '25000000000')
            verifyOrderRemoved(tx, 4, accounts[1], '5000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '25000000000')

            const orderBookBuy = await dex.getOrderBook(BUY, usdp.ticker, matic.ticker)
            assert.equal(orderBookBuy.length, 0)

            await verifyBalances(accounts[5], usdp.ticker, matic.ticker, '500000000005000000000', '465000000000000000000')
            await verifyBalances(accounts[4], usdp.ticker, matic.ticker, '500000000005000000000', '467500000000000000000')
            await verifyBalances(accounts[3], usdp.ticker, matic.ticker, '500000000005000000000', '470000000000000000000')
            await verifyBalances(accounts[2], usdp.ticker, matic.ticker, '500000000005000000000', '472500000000000000000')
            await verifyBalances(accounts[1], usdp.ticker, matic.ticker, '499999999980000000000', '625000000000000000000')
        })
    })

    async function setupTest5 (accounts) {
        await setupTest1(accounts)

        const ethAmount = toWei('1000000000', 'gwei') // 1 ETH
        for (let {accountId} of balances) {
            await dex.methods['deposit()']({from: accounts[accountId], value: ethAmount})
        }

        // Fill the BUY side
        await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '400000000000', ethAmount, {from: accounts[5]}) // buy 1 ETH @ 4000 USDP 
        await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '350000000000', ethAmount, {from: accounts[4]}) // buy 1 ETH @ 3500 USDP 
        await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '300000000000', ethAmount, {from: accounts[3]}) // buy 1 ETH @ 3000 USDP 
        await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '250000000000', ethAmount, {from: accounts[2]}) // buy 1 ETH @ 2500 USDP 
        await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '200000000000', ethAmount, {from: accounts[1]}) // buy 1 ETH @ 2000 USDP 

        // Fill the SELL side
        await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '700000000000', ethAmount, {from: accounts[1]}) // sell 1 ETH @ 7000 USDP
        await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '650000000000', ethAmount, {from: accounts[2]}) // sell 1 ETH @ 6500 USDP
        await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '600000000000', ethAmount, {from: accounts[3]}) // sell 1 ETH @ 6000 USDP
        await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '550000000000', ethAmount, {from: accounts[4]}) // sell 1 ETH @ 5500 USDP
        await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '500000000000', ethAmount, {from: accounts[5]}) // sell 1 ETH @ 5000 USDP
    
    }

    contract.only("more tests using ETH and USDP", async accounts => {
        
        before("setup contracts and deposit tokens", async () => setupTest5(accounts))

        after("return ETH back to the owners", async () => {
            for (let {accountId} of balances) {
                const balance = await dex.balances(accounts[accountId], eth.ticker, {from: accounts[accountId]})
                await dex.methods['withdraw(uint256)'](balance, {from: accounts[accountId]})
            }
        })
        
        it ("should correctly execute buy limit order", async () => {
            tx = await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '500000000000', '100000000000000000', {from: accounts[1]}) // buy 0.1 ETH @ 5000 USDP
            verifyOrderFilled(tx, 9, accounts[5], '500000000000', '100000000000000000')
            verifyOrderFilled(tx, 10, accounts[1], '500000000000', '100000000000000000')
            verifyOrderRemoved(tx, 10, accounts[1], '100000000000000000')
            verifyBalances(accounts[5], eth.ticker, usdp.ticker, '900000000000000000', '500000000050000000000')
            verifyBalances(accounts[1], eth.ticker, usdp.ticker, '1100000000000000000', '499999999950000000000')
        })

        it ("should correctly execute sell limit order", async () => {
            tx = await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '200000000000', '100000000000000000', {from: accounts[1]}) // buy 0.1 ETH @ 2000 USDP
            verifyOrderFilled(tx, 0, accounts[5], '400000000000', '100000000000000000')
            verifyOrderFilled(tx, 11, accounts[1], '400000000000', '100000000000000000')
            verifyOrderRemoved(tx, 11, accounts[1], '100000000000000000')
            verifyBalances(accounts[5], eth.ticker, usdp.ticker, '1000000000000000000', '500000000010000000000')
            verifyBalances(accounts[1], eth.ticker, usdp.ticker, '1000000000000000000', '499999999990000000000')
        })

        it ("should remove the remaining amount that is too small to be filled at the requested price", async () => {
            tx = await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '500000000000', '900000000000000001', {from: accounts[1]}) // buy 0.1 ETH @ 5000 USDP
            verifyOrderFilled(tx, 9, accounts[5], '500000000000', '1000000000000000000')
            verifyOrderFilled(tx, 12, accounts[1], '500000000000', '900000000000000000')
            verifyOrderRemoved(tx, 9, accounts[5], '1000000000000000000')
            verifyOrderRemoved(tx, 12, accounts[1], '900000000000000000')
        })

    })
})