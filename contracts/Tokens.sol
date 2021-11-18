// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Link is ERC20 ("Chainlink", "LINK") {
    constructor () { _mint(msg.sender, 1000000000000000000000); }
}

contract Polygon is ERC20 ("Polygon", "MATIC") {
    constructor () { _mint(msg.sender, 1000000000000000000000); }
}

contract WrappedBitcoin is ERC20 ("Wrapped Bitcoin", "WBTC") {
    constructor () { _mint(msg.sender, 1000000000000000000000); }
}

contract StableCoin is ERC20 ("StableCoin", "USDP") {
    constructor () { _mint(msg.sender, 1000000000000000000000); }

    function decimals() public view virtual override returns (uint8) {
        return 8;
    }
}