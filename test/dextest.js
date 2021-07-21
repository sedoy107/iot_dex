'use strict';

const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");
const Polygon = artifacts.require("Polygon");

const truffleAssert = require('../node_modules/truffle-assertions');
const Chance = require('../node_modules/chance');
const chance = new Chance();

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;

// Order book side constants
const BUY = 0;
const SELL = 1;

contract("Dex", async accounts => {
    it("should handle swaps correctly", async () => {
        // Define owner
        let owner = accounts[0];

        // Init contracts
        let dex = await Dex.deployed();
        let link = await Link.deployed();
        let polygon = await Polygon.deployed();

        // Retrieve token tickers
        let linkTicker = fromUtf8(await link.symbol());
        let polygonTicker = fromUtf8(await polygon.symbol());

        // Dex: add tokens
        await dex.addToken(linkTicker, link.address);
        await dex.addToken(polygonTicker, polygon.address);

        // Define token amounts
        let linkAmount = 50;
        let polygonAmount = 100;

        // Define deposit amounts
        let linkDeposit = 50;
        let polygonDeposit = 100;

        // Account count
        let n = 3

        for (let i = 0; i <= n; i++) {
            // Send some tokens to accounts 1, 2, 3
            await link.transfer(accounts[i], linkAmount);
            await polygon.transfer(accounts[i], polygonAmount);
        
            // Approve dex to withdraw from token contracts
            await link.approve(dex.address, linkAmount, {from: accounts[i]});
            await polygon.approve(dex.address, polygonAmount, {from: accounts[i]});

            // Deposit tokens to the Dex
            await dex.deposit(linkDeposit, linkTicker, {from: accounts[i]});
            await dex.deposit(polygonDeposit, polygonTicker, {from: accounts[i]});

            // Print balances on the Dex
            let linkInitialBalance = (await dex.balances(accounts[i], linkTicker)).toNumber();
            let polygonInitialBalance = (await dex.balances(accounts[i], polygonTicker)).toNumber();
            console.log("Initial Link balance on Dex for accounts[" + i + "]: " + linkInitialBalance);
            console.log("Initial Matic balance on Dex for accounts[" + i + "]: " + polygonInitialBalance);
        }

        // Create some limit orders
        await dex.createOrder(BUY, linkTicker, polygonTicker, 5, 4, {from: accounts[1]}); // buy 4 link for 5 matic each
        await dex.createOrder(BUY, linkTicker, polygonTicker, 6, 2, {from: accounts[2]}); // buy 2 link for 6 matic each
        await dex.createOrder(BUY, linkTicker, polygonTicker, 7, 1, {from: accounts[3]}); // buy 1 link for 7 matic each

        //console.log(await dex.getOrderBook(BUY, linkTicker, polygonTicker));

        // Create some sell orders <- orderBook index is out of bound
        await debug( await dex.createOrder(SELL, linkTicker, polygonTicker, 5, 5, {from: accounts[0]}) ); // sell 5 link for 5 matic each

        // Verify the order book
        let buyOrderBook = await dex.getOrderBook(BUY, linkTicker, polygonTicker);
        assert.equal(buyOrderBook.length, 1);
        let sellOrderBook = await dex.getOrderBook(SELL, linkTicker, polygonTicker);
        assert.equal(sellOrderBook.length, 0);

        async function verifyBalances (dex, account_index, linkExpected, polygonExpected) {
            let linkBalance = (await dex.balances(accounts[account_index], linkTicker)).toNumber();
            let polygonBalance = (await dex.balances(accounts[account_index], polygonTicker)).toNumber();
            assert.equal(linkBalance, linkExpected);
            assert.equal(polygonBalance, polygonExpected);
        }

        // Verify the balances on the accounts
        await verifyBalances(dex, 0, 45, 125); //
        await verifyBalances(dex, 1, 52, 90); // 
        await verifyBalances(dex, 2, 52, 90);
        await verifyBalances(dex, 3, 51, 95);
    });
});