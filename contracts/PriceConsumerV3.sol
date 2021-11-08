// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

contract Market {

    mapping (bytes32 => uint256) prices;

    function getTokenPrice (bytes32 ticker) external view returns (uint256) {
        return prices[ticker];
    }

    function setTokenPrice (bytes32 ticker, uint256 price) external {
        prices[ticker] = price;
    }
}