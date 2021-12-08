'use strict'

module.exports = async function(callback) {
  try {
    // Get accounts
    const accounts = await web3.eth.getAccounts()

    // Import contracts
    const Dex = artifacts.require("Dex")
    const RussianRuble = artifacts.require("RussianRuble")
    const USDollar = artifacts.require("USDollar")
    const AntiCovid = artifacts.require("AntiCovid")
    const RemoteWork = artifacts.require("RemoteWork")
    const GlobalFriendship = artifacts.require("GlobalFriendship")
    const YuriyToken = artifacts.require("YuriyToken")
    const BenchPress = artifacts.require("BenchPress")

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
    let crub, cusd, acvd, rwk, gfr, yuriy, bpr
    const eth = {
        contract: null,
        address: '0x0000000000000000000000000000000000000000',
        symbol: 'ETH',
        ticker: fromUtf8('ETH'),
        decimals: 18
    }

    async function buildTokenObject(contract) {
      return {
          erc20: contract,
          address: contract.address,
          symbol: await contract.symbol(),
          ticker: fromUtf8(await contract.symbol()),
          decimals: (await contract.decimals()).toNumber()
      }
    }

    async function initDex () {
      dex = await Dex.deployed()
      
      const russianRuble = await RussianRuble.deployed()
      const usDollar = await USDollar.deployed()
      const antiCovid = await AntiCovid.deployed()
      const remoteWork = await RemoteWork.deployed()
      const globalFriendship = await GlobalFriendship.deployed()
      const yuriyToken = await YuriyToken.deployed()
      const benchPress = await BenchPress.deployed()

      crub = await buildTokenObject(russianRuble)
      cusd = await buildTokenObject(usDollar)
      acvd = await buildTokenObject(antiCovid)
      rwk = await buildTokenObject(remoteWork)
      gfr = await buildTokenObject(globalFriendship)
      yuriy = await buildTokenObject(yuriyToken)
      bpr = await buildTokenObject(benchPress)

      const tokens = [crub, cusd, acvd, rwk, gfr, yuriy, bpr]

      for (let i in tokens ) {
          const baseToken = tokens[i]
          await dex.addToken(baseToken.ticker, baseToken.address)
          await dex.addPair(eth.ticker, baseToken.ticker)
          console.log(`Pair added: ${eth.symbol}/${baseToken.symbol}`)
          for (let pairedToken of tokens.slice(parseInt(i) + 1) ) {
            await dex.addPair(baseToken.ticker, pairedToken.ticker)
            console.log(`Pair added: ${baseToken.symbol}/${pairedToken.symbol}`)
          }
          console.log(`${baseToken.symbol}: ${baseToken.address}`)
      }
    }

    await initDex()

  }
  catch(error) {
    console.log(error)
  }

  callback()
}