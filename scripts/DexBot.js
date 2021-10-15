// Contracts
const Dex = artifacts.require("Dex")
const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")

module.exports = async function(callback) {
  try {
    // Get Dex contracts
    let dex = await Dex.deployed()
    
    // Get token contracts
    let link = await Link.deployed()
    let polygon = await Polygon.deployed()
    let wbtc = await WrappedBitcoin.deployed()

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
    await dex.addPair(wbtcTicker, etherTicker)
  }
  catch(error) {
    console.log(error)
  }

  callback()
}

/*


*/