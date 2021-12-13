'use strict'

module.exports = async function(callback) {
  try {
    const fromUtf8 = web3.utils.fromUtf8
    const accounts = await web3.eth.getAccounts()
    const Dex = artifacts.require("Dex")
    const dex = await Dex.deployed() 
    
    const link = {
      contract: null,
      address: '0xa36085F69e2889c224210F603D836748e7dC0088',
      symbol: 'LINK',
      ticker: fromUtf8('LINK'),
      decimals: 18
    }

    const eth = {
      contract: null,
      address: '0x0000000000000000000000000000000000000000',
      symbol: 'ETH',
      ticker: fromUtf8('ETH'),
      decimals: 18
    }
    // Add link token
    // await dex.addToken(link.ticker, link.address)
    // await dex.addPair(eth.ticker, link.ticker)
    
    // Add LINK pairs for all of the existing tokens
    const tokens = await dex.getTokenList()
    for (let token of tokens) {
      if (token.address != '0x0000000000000000000000000000000000000000') {
        await dex.addPair(link.ticker, token.ticker)
      }
    }
    

  }
  catch(error) {
    console.log(error)
  }

  callback()
}