const Link = artifacts.require("Link")
const Polygon = artifacts.require("Polygon")
const WrappedBitcoin = artifacts.require("WrappedBitcoin")
const StableCoin = artifacts.require("StableCoin")

const RussianRuble = artifacts.require("RussianRuble")
const USDollar = artifacts.require("USDollar")
const AntiCovid = artifacts.require("AntiCovid")
const RemoteWork = artifacts.require("RemoteWork")
const GlobalFriendship = artifacts.require("GlobalFriendship")
const YuriyToken = artifacts.require("YuriyToken")
const BenchPress = artifacts.require("BenchPress")

module.exports = function (deployer, network, accounts) {
  deployer.deploy(Link)
  deployer.deploy(Polygon)
  deployer.deploy(WrappedBitcoin)
  deployer.deploy(StableCoin)

  deployer.deploy(RussianRuble)
  deployer.deploy(USDollar)
  deployer.deploy(AntiCovid)
  deployer.deploy(RemoteWork)
  deployer.deploy(GlobalFriendship)
  deployer.deploy(YuriyToken)
  deployer.deploy(BenchPress)
};
