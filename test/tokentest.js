'use strict';

const Link = artifacts.require("Link");
const Polygon = artifacts.require("Polygon");

const truffleAssert = require('../node_modules/truffle-assertions');

// references for convenience
const toBN = web3.utils.toBN;
const fromUtf8 = web3.utils.fromUtf8;

contract("Token Creation", async accounts => {
    
    it("balance of `accounts[0]` must be 1000 LINK", async () => {
        let link = await Link.deployed();
        let balance = await link.balanceOf(accounts[0]);
        assert.equal(balance.toNumber(), 1000);
    });

    it("balance of `accounts[0]` must be 1000 MATIC", async () => {
        let polygon = await Polygon.deployed();
        let balance = await polygon.balanceOf(accounts[0]);
        assert.equal(balance.toNumber(), 1000);
    });
   
});