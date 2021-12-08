'use strict'

module.exports = async function(callback) {
  try {
    // Get accounts
    const accounts = await web3.eth.getAccounts()

    // Import contracts
    const Dex = artifacts.require("Dex")
    const Link = artifacts.require("Link")
    const Polygon = artifacts.require("Polygon")
    const WrappedBitcoin = artifacts.require("WrappedBitcoin")
    const StableCoin = artifacts.require("StableCoin")

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

    async function buildTokenObject(contract) {
      return {
          erc20: contract,
          address: contract.address,
          symbol: await contract.symbol(),
          ticker: fromUtf8(await contract.symbol()),
          decimals: (await contract.decimals()).toNumber()
      }
    }

    async function initDex (accounts) {
      dex = await Dex.deployed()
      
      const linkContract = await Link.deployed()
      const polygonContract = await Polygon.deployed()
      const wrappedBitcoinContract = await WrappedBitcoin.deployed()
      const stableCoinContract = await StableCoin.deployed()

      link = await buildTokenObject(linkContract)
      matic = await buildTokenObject(polygonContract)
      wbtc = await buildTokenObject(wrappedBitcoinContract)
      usdp = await buildTokenObject(stableCoinContract)
    }

    async function createTrades1(accounts) {

      // Fill the BUY side
      await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '3000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[5]}) // buy 0.5 LINK @ 3 MATIC 
      await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '2500000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[4]}) // buy 0.5 LINK @ 2.5 MATIC 
      await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '2000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[3]}) // buy 0.5 LINK @ 2 MATIC 
      await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1500000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[2]}) // buy 0.5 LINK @ 1.5 MATIC 
      await dex.createOrder(SELL, LIMIT, link.ticker, matic.ticker, '1000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[1]}) // buy 0.5 LINK @ 1 MATIC 
    
      // Fill the SELL side
      await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '9000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[1]}) // sell 0.5 LINK @ 9 MATIC
      await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '8500000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[2]}) // sell 0.5 LINK @ 8.5 MATIC
      await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '8000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[3]}) // sell 0.5 LINK @ 8 MATIC
      await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '7500000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[4]}) // sell 0.5 LINK @ 7.5 MATIC
      await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '7000000000000000000', (5 * (10 ** 16)).toString(), {from: accounts[5]}) // sell 0.5 LINK @ 7 MATIC
    
    }

    async function createTrades3 (accounts) {

      // Fill the SELL side
      await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '1000000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[1]}) // sell 50 USDP @ 1.00 MATIC
      await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '950000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[2]}) // sell 50 USDP @ 0.95 MATIC
      await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '900000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[3]}) // sell 50 USDP @ 0.90 MATIC
      await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '850000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[4]}) // sell 50 USDP @ 0.85 MATIC
      await dex.createOrder(SELL, LIMIT, usdp.ticker, matic.ticker, '800000000000000000', (5 * (10 ** 9)).toString(), {from: accounts[5]}) // sell 50 USDP @ 0.80 MATIC
      
      await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '1000000000000000000', (5 * (10 ** 8)).toString(), {from: accounts[1]}) // sell 5 USDP @ 1.00 MATIC
      await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '950000000000000000', (5 * (10 ** 8)).toString(), {from: accounts[2]}) // sell 5 USDP @ 0.95 MATIC
      await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '900000000000000000', (5 * (10 ** 8)).toString(), {from: accounts[3]}) // sell 5 USDP @ 0.90 MATIC
      await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '850000000000000000', (5 * (10 ** 8)).toString(), {from: accounts[4]}) // sell 5 USDP @ 0.85 MATIC
      await dex.createOrder(BUY, LIMIT, usdp.ticker, matic.ticker, '800000000000000000', (5 * (10 ** 8)).toString(), {from: accounts[5]}) // sell 5 USDP @ 0.80 MATIC
    }

    async function createTrades4 (accounts) {

      const ethAmount2 = toWei('100000000', 'gwei') // 0.1 ETH

      // Fill the BUY side
      await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '400000000000', ethAmount2, {from: accounts[5]}) // buy 1 ETH @ 4000 USDP 
      await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '350000000000', ethAmount2, {from: accounts[4]}) // buy 1 ETH @ 3500 USDP 
      await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '300000000000', ethAmount2, {from: accounts[3]}) // buy 1 ETH @ 3000 USDP 
      await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '250000000000', ethAmount2, {from: accounts[2]}) // buy 1 ETH @ 2500 USDP 
      await dex.createOrder(SELL, LIMIT, eth.ticker, usdp.ticker, '200000000000', ethAmount2, {from: accounts[1]}) // buy 1 ETH @ 2000 USDP 

      // Fill the SELL side
      await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '700000000000', ethAmount2, {from: accounts[1]}) // sell 1 ETH @ 7000 USDP
      await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '650000000000', ethAmount2, {from: accounts[2]}) // sell 1 ETH @ 6500 USDP
      await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '600000000000', ethAmount2, {from: accounts[3]}) // sell 1 ETH @ 6000 USDP
      await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '550000000000', ethAmount2, {from: accounts[4]}) // sell 1 ETH @ 5500 USDP
      await dex.createOrder(BUY, LIMIT, eth.ticker, usdp.ticker, '500000000000', ethAmount2, {from: accounts[5]}) // sell 1 ETH @ 5000 USDP

    }

    await initDex(accounts)
    await dex.createOrder(BUY, LIMIT, link.ticker, matic.ticker, '3000000000000000000', (5 * (10 ** 18)).toString(), {from: accounts[5]}) // buy 0.05 LINK @ 3 MATIC 
    //await createTrades1(accounts)
    //await createTrades3(accounts)
    //await createTrades4(accounts)


  }
  catch(error) {
    console.log(error)
  }

  callback()
}