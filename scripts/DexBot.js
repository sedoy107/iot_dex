// Contracts
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")

const Chance = require('../node_modules/chance')
const chance = new Chance()

// references for convenience
const toBN = web3.utils.toBN
const fromUtf8 = web3.utils.fromUtf8

// Order book side constants
const BUY = 0
const SELL = 1

// Order types constants
const MARKET = 0;
const LIMIT = 1;
const IOC = 2;
const FOK = 3;
const MOC = 4;

// Number of accounts to be used
const accountCount = 6
        
// Define token amounts
const linkAmount = toBN(50 * 10 ** 18)
const polygonAmount = toBN(100 * 10 ** 18)
const wbtcAmount = toBN(100 * 10 ** 18)

// Define deposit amounts
const linkDeposit = toBN(50 * 10 ** 18)
const polygonDeposit = toBN(100 * 10 ** 18)
const wbtcDeposit = toBN(100 * 10 ** 18)

module.exports = async function(callback) {
  try {
    // Get accounts
    const accounts = await web3.eth.getAccounts()
    console.log(accounts)

    // Get Dex contracts
    let dex = await Dex.deployed()
    
    // Get token contracts
    let link = await Link.deployed()
    let polygon = await Polygon.deployed()
    let wbtc = await WrappedBitcoin.deployed()
    console.log('link: ' + link.address)
    console.log('polygon: ' + polygon.address)
    console.log('wbtc: ' + wbtc.address)

    // Retrieve token tickers
    let etherTicker = web3.utils.fromUtf8("ETH");
    let linkTicker = web3.utils.fromUtf8('LINK')
    let polygonTicker = web3.utils.fromUtf8('MATIC')
    let wbtcTicker = web3.utils.fromUtf8('WBTC')

    // Dex: add tokens
    await dex.addToken(linkTicker, link.address)
    await dex.addToken(polygonTicker, polygon.address)
    await dex.addToken(wbtcTicker, wbtc.address)

    // Add pair
    await dex.addPair(linkTicker, polygonTicker)
    await dex.addPair(etherTicker, wbtcTicker)
    await dex.addPair(etherTicker, linkTicker)
    await dex.addPair(etherTicker, polygonTicker)

    // Send some tokens to the accounts and approve Dex for spending them
    for (let i = 0; i < accountCount; i++) {
      // Send some tokens to accounts
      await link.transfer(accounts[i], linkAmount)
      await polygon.transfer(accounts[i], polygonAmount)
      await wbtc.transfer(accounts[i], wbtcAmount)
      

      // Approve dex to withdraw from token contracts
      await link.approve(dex.address, linkAmount, {from: accounts[i]})
      await polygon.approve(dex.address, polygonAmount, {from: accounts[i]})
      await wbtc.approve(dex.address, wbtcAmount, {from: accounts[i]})

      // Deposit tokens to the Dex
      await dex.deposit(linkDeposit, linkTicker, {from: accounts[i]})
      await dex.deposit(polygonDeposit, polygonTicker, {from: accounts[i]})
      await dex.deposit(wbtcDeposit, wbtcTicker, {from: accounts[i]})
    }
    
    // Place orders
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(5 * 10 ** 18), 4, {from: accounts[1]}) // buy 4 link for 5 matic each
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(6 * 10 ** 18), 2, {from: accounts[2]}) // buy 2 link for 6 matic each
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(7 * 10 ** 18), 1, {from: accounts[3]}) // buy 1 link for 7 matic each
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(5 * 10 ** 18), 5, {from: accounts[0]}) // sell 5 link for 5 matic each

    // Fill the orderbook with orders
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(21 * 10 ** 18), 5, {from: accounts[0]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(22 * 10 ** 18), 5, {from: accounts[1]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(23 * 10 ** 18), 5, {from: accounts[2]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(24 * 10 ** 18), 5, {from: accounts[3]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(25 * 10 ** 18), 5, {from: accounts[4]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(26 * 10 ** 18), 5, {from: accounts[0]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(27 * 10 ** 18), 5, {from: accounts[1]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(28 * 10 ** 18), 5, {from: accounts[2]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(29 * 10 ** 18), 5, {from: accounts[3]})
    await dex.createOrder(SELL, LIMIT, linkTicker, polygonTicker, toBN(30 * 10 ** 18), 5, {from: accounts[4]})

    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(5 * 10 ** 18), 5, {from: accounts[0]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(6 * 10 ** 18), 5, {from: accounts[1]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(7 * 10 ** 18), 5, {from: accounts[2]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(8 * 10 ** 18), 5, {from: accounts[3]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(9 * 10 ** 18), 5, {from: accounts[4]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(10 * 10 ** 18), 5, {from: accounts[0]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(11 * 10 ** 18), 5, {from: accounts[1]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(12 * 10 ** 18), 5, {from: accounts[2]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(13 * 10 ** 18), 5, {from: accounts[3]})
    await dex.createOrder(BUY, LIMIT, linkTicker, polygonTicker, toBN(14 * 10 ** 18), 5, {from: accounts[4]})

    // await dex.createOrder(SELL, LIMIT, etherTicker, wbtcTicker, toBN(5 * 10 ** 16), 4, {from: accounts[1]}) // sell 4 wbtc for 0.05 ether each
    // await dex.createOrder(SELL, LIMIT, etherTicker, wbtcTicker, toBN(6 * 10 ** 16), 2, {from: accounts[2]}) // sell 2 wbtc for 0.06 ether each
    // await dex.createOrder(SELL, LIMIT, etherTicker, wbtcTicker, toBN(7 * 10 ** 16), 1, {from: accounts[3]}) // sell 1 wbtc for 0.07 ether each
    // await dex.createOrder(BUY, LIMIT, etherTicker, wbtcTicker, toBN(5 * 10 ** 16), 5, {from: accounts[0]}) // sell 5 wbtc for 0.05 ether each

  }
  catch(error) {
    console.log(error)
  }

  callback()
}

/*


*/