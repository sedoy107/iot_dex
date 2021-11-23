'use strict'

const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")
const StableCoin = artifacts.require("StableCoin")

contract("Token Test", async accounts => {
    
    it("balance of `accounts[0]` must be 1000 LINK", async () => {
        let link = await Link.deployed()
        let balance = await link.balanceOf(accounts[0])
        assert.equal(balance, '100000000000000000000000')
    })

    it("balance of `accounts[0]` must be 1000 MATIC", async () => {
        let polygon = await Polygon.deployed()
        let balance = await polygon.balanceOf(accounts[0])
        assert.equal(balance, '100000000000000000000000')
    })

    it("balance of `accounts[0]` must be 1000 USDP", async () => {
        let wrappedBitcoin = await WrappedBitcoin.deployed()
        let balance = await wrappedBitcoin.balanceOf(accounts[0])
        assert.equal(balance, '100000000000000000000000')
    })
   
    it("balance of `accounts[0]` must be 1000 WBTC", async () => {
        let stableCoin = await StableCoin.deployed()
        let balance = await stableCoin.balanceOf(accounts[0])
        assert.equal(balance, '100000000000000000000000')
    })

    it("balance of LINK must be 18", async () => {
        let link = await Link.deployed()
        let decimals = await link.decimals()
        assert.equal(decimals, 18)
    })

    it("balance of MATIC must be 18", async () => {
        let polygon = await Polygon.deployed()
        let decimals = await polygon.decimals()
        assert.equal(decimals, 18)
    })

    it("balance of WBTC must be 18", async () => {
        let wrappedBitcoin = await WrappedBitcoin.deployed()
        let decimals = await wrappedBitcoin.decimals()
        assert.equal(decimals, 18)
    })

    it("balance of USDP must be 8", async () => {
        let stableCoin = await StableCoin.deployed()
        let decimals = await stableCoin.decimals()
        assert.equal(decimals, 8)
    })
})