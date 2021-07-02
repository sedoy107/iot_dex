// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";

contract Dex is Wallet{

    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint256 id;
        address trader;
        Side side;
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }

    mapping (bytes32 => mapping (Side => Order[])) private orderBook;

    function _getOrderBook (bytes32 ticker, Side side) private view returns(Order[] memory) {
        return orderBook[ticker][side];
    }

    function getAskOrderBook (bytes32 ticker) public view returns(Order[] memory) {
        return _getOrderBook(ticker, Side.SELL);
    }

    function getBidOrderBook (bytes32 ticker) public view returns(Order[] memory) {
        return _getOrderBook(ticker, Side.BUY);
    }
}