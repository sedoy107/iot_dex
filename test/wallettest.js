'use strict';

const Wallet = artifacts.require("Wallet");
const Link = artifacts.require("Link");

const truffleAssert = require('../node_modules/truffle-assertions');

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;
 
contract("Wallet Test", async accounts => {

    let wallet
    let link
    let symbol
    let ticker
    
    const ethTicker = fromUtf8("ETH");

    before("Setup contracts", async () => {
        wallet = await Wallet.deployed();
        link = await Link.deployed();
        symbol = await link.symbol();
        ticker = fromUtf8(symbol);
    })

    describe("Add ERC20 to wallet", async () => {
        it("should only be possible for owner to add token", async () => {
            await truffleAssert.reverts (
                wallet.addToken(ticker, link.address, {from: accounts[1]})
            );
            await truffleAssert.passes (
                wallet.addToken(ticker, link.address, {from: accounts[0]})
            );
        });
    });
    describe("ETHER deposit / withdrawal", async () => {
        it("should handle deposits correctly", async () => {
            let balances = {
                1 : 10 ** 5,
                2 : 10 ** 4,
                3 : 10 ** 3,
            }

            for ( let i in balances ) {
                await wallet.methods['deposit()']({from: accounts[i], value: balances[i]});

                let accountBalance = (await wallet.balances(accounts[i], ethTicker)).toNumber();

                console.log("deposited to accounts[" + i + "]:" + accountBalance);

                assert.equal(accountBalance, balances[i], "Balances do not match");
            }
        });
        it("should handle withdrawals correctly", async () => {
            await truffleAssert.reverts ( wallet.withdraw(100, {from: accounts[4]}) );

            let balances = {
                1 : 10 ** 5,
                2 : 10 ** 4,
                3 : 10 ** 3,
            }

            for ( let i in balances ) {
                await truffleAssert.reverts ( wallet.methods['withdraw(uint256)'](balances[i] + 1, {from: accounts[i]}) );
                await truffleAssert.passes ( wallet.methods['withdraw(uint256)'](balances[i], {from: accounts[i]}) );

                let accountBalance = (await wallet.balances(accounts[i], ethTicker)).toNumber();

                console.log("withdrawn from accounts[" + i + "]:" + balances[i]);
                
                assert.equal(accountBalance, 0, "Balance MUST be zero");
            }
        });
    });
    describe("ERC20 deposit / withdrawal", async () => {
        it("should handle deposits correctly", async () => {
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
            await truffleAssert.reverts (
                wallet.withdraw(500, ticker)
            );
        });
        it("should handle valid withdrawals correctly", async () => {
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