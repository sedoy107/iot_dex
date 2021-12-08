// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";


contract TestToken is ERC20 {
    
    constructor(string memory name, string memory symbol) ERC20(name, symbol) {
        _mint(msg.sender, 100000000000000000000000);
    }
    function mint(address account, uint256 amount) external {
        require(amount <= 1000000000000000000000000, "C'mon bro, you're already made a million");
        _mint(account, amount);
    }

    function burn(address account, uint256 amount) external {
        _burn(account, amount);
    }
}

// Standard ERC20 tokens
contract Link is ERC20 ("Chainlink", "LINK") {
    constructor () { _mint(msg.sender, 100000000000000000000000); }
}

contract Polygon is ERC20 ("Polygon", "MATIC") {
    constructor () { _mint(msg.sender, 100000000000000000000000); }
}

contract WrappedBitcoin is ERC20 ("Wrapped Bitcoin", "WBTC") {
    constructor () { _mint(msg.sender, 100000000000000000000000); }
}

// Peggged Coins

contract StableCoin is ERC20 ("StableCoin", "USDP") {
    constructor () { _mint(msg.sender, 100000000000000000000000); }

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
}

contract RussianRuble is TestToken ("Russian Crypto Ruble", "cRUB") {
    function decimals() public view virtual override returns (uint8) {return 8;}
}

contract USDollar is TestToken ("US Crypto Dollar", "cUSD") {
    function decimals() public view virtual override returns (uint8) {return 8;}
}

// ERC20 tokens that will be used on the testnet
contract AntiCovid is TestToken ("Anti Covid", "ACVD") {}

contract RemoteWork is TestToken ("Remote Work", "RWK") {}

contract GlobalFriendship is TestToken ("Global Friedship", "GFR") {}

contract YuriyToken is TestToken ("Yuriy Token", "YURIY") {}

contract BenchPress is TestToken ("Bench Press", "BPR") {}