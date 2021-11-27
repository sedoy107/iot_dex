'use strict'

const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")
const StableCoin = artifacts.require("StableCoin")

const Chance = require('chance')
const chance = new Chance()

const truffleAssertions = require('truffle-assertions')

describe("Dex Hack Test", async () => {

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


    contract("double spend test", async accounts => {

        before("setup contracts and deposit tokens", async () => setupTest1(accounts))

        it ("should create a buy order that costs the entire balance of MATIC tokens", async () => {
            
            await truffleAssertions.passes (
                // buy 500 LINK @ 1 MATIC
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '500000000000000000000', {from: accounts[5]})
            )
        })
        
        it ("should not create another order that costs 50 MATIC tokens as they should be locked by the previous order", async () => {
            await truffleAssertions.reverts (
                // buy 50 LINK @ 1 MATIC once again
                dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '50000000000000000000', {from: accounts[5]})
            )
        })
        
        it ("should fill the first 500 LINK for 500 MATIC", async () => {
            await truffleAssertions.passes (
                // sell 500 LINK @ 1 MATIC once again
                dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '500000000000000000000', {from: accounts[1]})
            )
        })

        it ("should not fill the order for 50 LINK for 50 MATIC", async () => {
            await truffleAssertions.passes (
                // sell 500 LINK @ 1 MATIC once again
                dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', '50000000000000000000', {from: accounts[2]})
            )
        })
    })
})