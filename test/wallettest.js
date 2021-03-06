'use strict'

const Wallet = artifacts.require("Wallet")
const Link = artifacts.require("Link")

const truffleAssertions = require('../node_modules/truffle-assertions')

// references for convenience
const toBN = web3.utils.toBN
const fromUtf8 = web3.utils.fromUtf8

let wallet
let link
let ticker

const ethTicker = fromUtf8("ETH")
const ethAddress = '0x0000000000000000000000000000000000000000'
const ethDecimals = 18

let balances = [
    {accountId: 1, quantity: toBN(5 * (10 ** 18))},
    {accountId: 2, quantity: toBN(4 * (10 ** 18))},
    {accountId: 3, quantity: toBN(3 * (10 ** 18))},
]

describe("Wallet Test", async () => {

    contract("Add ERC20 to wallet", async accounts => {

        before("Setup contracts", async () => {
            wallet = await Wallet.deployed()
            link = await Link.deployed()
            ticker = fromUtf8(await link.symbol())
        })

        it("should only be possible for owner to add token", async () => {
            await truffleAssertions.reverts (
                wallet.addToken(ticker, link.address, {from: accounts[1]})
            )
            await truffleAssertions.passes (
                wallet.addToken(ticker, link.address, {from: accounts[0]})
            )
        })

        it("should not be possible to add same token more than once", async () => {
            await truffleAssertions.reverts (
                wallet.addToken(ticker, link.address, {from: accounts[0]})
            )
        })

        it("should not be possible to add ETH token as it is being added in the constructor", async () => {
            await truffleAssertions.reverts (
                wallet.addToken(ethTicker, link.address, {from: accounts[0]})
            )
        })
    })

    contract("ETHER deposit / withdrawal", async accounts => {

        before("Setup contracts", async () => {
            wallet = await Wallet.deployed()
        })

        it("should not allow withdrawals when an account has 0 balance", async () => {
            await truffleAssertions.reverts( wallet.methods['withdraw(uint256)'](100, {from: accounts[4]}) )
        })

        it("should handle deposits correctly", async () => {
            for (let {accountId, quantity} of balances) {
                await wallet.methods['deposit()']({ from: accounts[accountId], value: quantity })

                let accountBalance = await wallet.balances(accounts[accountId], ethTicker)

                console.log("deposited to accounts[" + accountId + "]:" + accountBalance)
                
                assert(accountBalance.eq(quantity), "Balances do not match")
            }
        })

        it("should not allow withdrawals when an account insufficient balance", async () => {
            for (let {accountId, quantity} of balances) {
                await truffleAssertions.reverts(wallet.methods['withdraw(uint256)'](quantity+1, { from: accounts[accountId] }))
            }
        })

        it("should handle withdrawals correctly", async () => {
            for (let {accountId, quantity} of balances) {
                await truffleAssertions.passes(wallet.methods['withdraw(uint256)'](quantity, { from: accounts[accountId] }))

                let accountBalance = await wallet.balances(accounts[accountId], ethTicker)

                console.log("withdrawn from accounts[" + accountId + "]:" + quantity)

                assert(accountBalance.eq(toBN(0)), "Balance MUST be zero")
            }
        })
    })

    contract("ERC20 deposit / withdrawal", async accounts => {

        before("Setup contracts", async () => {
            wallet = await Wallet.deployed()
            link = await Link.deployed()
            ticker = fromUtf8(await link.symbol())
            for (let {accountId, quantity} of balances) {
                await link.transfer(accounts[accountId], quantity)
                await link.approve(await wallet.address, quantity, {from: accounts[accountId]})
            }
            wallet.addToken(ticker, link.address, {from: accounts[0]})
        })

        it("should not allow withdrawals when an account has 0 balance", async () => {
            await truffleAssertions.reverts( wallet.methods['withdraw(uint256,bytes32)'](100, ticker, {from: accounts[4]}) )
        })

        it("should handle deposits correctly", async () => {
            for (let {accountId, quantity} of balances) {
                await wallet.methods['deposit(uint256,bytes32)'](quantity, ticker, { from: accounts[accountId] })

                let accountBalance = await wallet.balances(accounts[accountId], ticker)

                console.log("deposited to accounts[" + accountId + "]:" + accountBalance)
                
                assert(accountBalance.eq(quantity), "Balances do not match")
            }
        })

        it("should not allow withdrawals when an account insufficient balance", async () => {
            for (let {accountId, quantity} of balances) {
                await truffleAssertions.reverts(wallet.methods['withdraw(uint256,bytes32)'](quantity+1, ticker, { from: accounts[accountId] }))
            }
        })

        it("should handle withdrawals correctly", async () => {
            for (let {accountId, quantity} of balances) {
                await truffleAssertions.passes(wallet.methods['withdraw(uint256,bytes32)'](quantity, ticker, { from: accounts[accountId] }))

                let accountBalance = await wallet.balances(accounts[accountId], ticker)

                console.log("withdrawn from accounts[" + accountId + "]:" + quantity)

                assert(accountBalance.eq(toBN(0)), "Balance MUST be zero")
            }
        })
    })
})