'use strict';

const Wallet = artifacts.require("Wallet");
const Link = artifacts.require("Link");

const truffleAssert = require('../node_modules/truffle-assertions');

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;

contract("ERC20 Token Test", async accounts => {
    describe("Token Attributes Test", async () => {
        it("ERC20 token symbol must be \"LINK\"", async () => {
            let link = await Link.deployed();
            let symbol = await link.symbol();
            assert.equal(symbol, "LINK");
        });
        it("balance of `accounts[0]` must be 1000 LINK", async () => {
            let link = await Link.deployed();
            let balance = await link.balanceOf(accounts[0]);
            assert.equal(balance.toNumber(), 1000);
        });
    });
});
 
contract("Wallet Test #1", async accounts => {
    describe("Add ERC20 to wallet", async () => {
        it("should only be possible for owner to add token", async () => {
            let wallet = await Wallet.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await truffleAssert.reverts (
                wallet.addToken(ticker, link.address, {from: accounts[1]})
            );
            await truffleAssert.passes (
                wallet.addToken(ticker, link.address, {from: accounts[0]})
            );
        });
    });
    describe("ERC20 deposit / withdrowal", async () => {
        it("should handle deposits correctly", async () => {
            let wallet = await Wallet.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await wallet.addToken(ticker, link.address, {from: accounts[0]})
            await link.approve(await wallet.address, 500);
            await wallet.deposit(100, ticker);
            let balanceOfLink = await wallet.balances(accounts[0], ticker);
            assert.equal(
                balanceOfLink.toNumber(), 100
            );
            let erc20Balance = await link.balanceOf(accounts[0]);
            assert.equal(
                erc20Balance.toNumber(), 900
            );
        }); 
        it("should handle invalid withdrawals correctly", async () => {
            let wallet = await Wallet.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await truffleAssert.reverts (
                wallet.withdraw(500, ticker)
            );
        });
        it("should handle valid withdrawals correctly", async () => {
            let wallet = await Wallet.deployed();
            let link = await Link.deployed();
            let symbol = await link.symbol();
            let ticker = fromUtf8(symbol);
            await truffleAssert.passes (
                wallet.withdraw(100, ticker)
            );
            let balanceOfLink = await wallet.balances(accounts[0], ticker);
            assert.equal(
                balanceOfLink.toNumber(), 0
            );
            let erc20Balance = await link.balanceOf(accounts[0]);
            assert.equal(
                erc20Balance.toNumber(), 1000
            );
        });
    });
}) 