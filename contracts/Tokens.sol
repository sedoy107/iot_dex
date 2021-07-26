// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Link is ERC20 ("Chainlink", "LINK") {
    constructor () { _mint(msg.sender, 1000); }
}

contract Polygon is ERC20 ("Polygon", "MATIC") {
    constructor () { _mint(msg.sender, 1000); }
}

contract WrappedBitcoin is ERC20 ("Wrapped Bitcoin", "WBTC") {
    constructor () { _mint(msg.sender, 1000); }
}