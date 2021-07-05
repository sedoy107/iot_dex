'use strict';

const Dex = artifacts.require("Dex");
const Link = artifacts.require("Link");

const truffleAssert = require('../node_modules/truffle-assertions');

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;
 
contract("Dex Test #1", async accounts => {
    describe("ERC20 deposit / withdrowal", async () => {
        it("should handle deposits correctly", async () => {
            let dex = await Dex.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await dex.addToken(ticker, link.address, {from: accounts[0]})
            await link.approve(await dex.address, 500);
            await dex.deposit(100, ticker);
            let balanceOfLink = await dex.balances(accounts[0], ticker);
            assert.equal(
                balanceOfLink.toNumber(), 100
            );
            let erc20Balance = await link.balanceOf(accounts[0]);
            assert.equal(
                erc20Balance.toNumber(), 900
            );
        }); 
        it("should handle invalid withdrawals correctly", async () => {
            let dex = await Dex.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await truffleAssert.reverts (
                dex.withdraw(500, ticker)
            );
        });
        it("should handle valid withdrawals correctly", async () => {
            let dex = await Dex.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await truffleAssert.passes (
                dex.withdraw(100, ticker)
            );
            let balanceOfLink = await dex.balances(accounts[0], ticker);
            assert.equal(
                balanceOfLink.toNumber(), 0
            );
            let erc20Balance = await link.balanceOf(accounts[0]);
            assert.equal(
                erc20Balance.toNumber(), 1000
            );
        });
    });
    describe("DEX limit order creation", async () => {
        // The user must have enough ETH deposited to Dex to create a BUY order.
        
        // The user must have enough Tokens deposited to Dex to create a SELL order
        // THE SELL order with the lowest price must be at the top of the SELL order book
        /**
         * | Price | Amount |
         * |  10   |    4   | [3]
         * |   8   |    8   | [2]
         * |   5   |   12   | [1]
         * |   2   |   13   | [0]
         */
        // Dex must emit LimitSellOrderCreated upon creation

        // The BUY order with the highest price must be at the top of the BUY order book
        /**
         * | Price | Amount |
         * |  10   |   10   | [0]
         * |   8   |    8   | [1]
         * |   5   |    6   | [2]
         * |   2   |    5   | [3]
         */
        // Dex must emit LimitBuyOrderCreated upon creation

        /**
         * Executing order:
         * 
         * 
         */
    });
}) 