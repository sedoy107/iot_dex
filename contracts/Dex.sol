// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "./OrderBook.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

contract Dex is Wallet, OrderBook {

    using Math for uint256;

    // event LimitBuyOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed price , uint256 indexed amount);
    // event LimitSellOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed price , uint256 indexed amount);
    // event MarketBuyOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed amount);
    // event MarketSellOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed amount);
    // event BuyOrderFilled (address trader, bytes32 indexed ticker, uint256 indexed price, uint256 indexed amount);
    // event SellOrderFilled (address trader, bytes32 indexed ticker, uint256 indexed price, uint256 indexed amount);
    event OrderCreated(Side side, bytes32 ticker, uint256 price, uint256 amount);

    function processSwaps(bytes32 ticker) private {
        uint256 minLen;
        
        // BUY and SELL `orderBook`s must both have entries
        while (orderBook[ticker][Side.SELL].length > 0 && orderBook[ticker][Side.BUY].length > 0) {
            // Get top SELL and BUY orders
            Order storage topBuyOrder = orderBook[ticker][Side.BUY][ orderBook[ticker][Side.BUY].length - 1 ];
            Order storage topSellOrder = orderBook[ticker][Side.BUY][ orderBook[ticker][Side.SELL].length - 1 ];

            // Match the orders
            uint256 fillAmount = Math.min(topBuyOrder.amount, topSellOrder.amount);
            // Increase filled amount for Buyer and decrease for Seller
            topBuyOrder.filled += fillAmount;
            topSellOrder.filled -= fillAmount;
            // Increase `trader`'s amount in the `Wallet` for buyer and decrease for seller
            balances[topBuyOrder.trader][ticker] += fillAmount;
            balances[topSellOrder.trader][ticker] -= fillAmount;

            //
        }

        // Identify the minimum length that will be used to loop through the order book
        if(orderBook[ticker][Side.SELL].length > orderBook[ticker][Side.BUY].length)
            minLen = orderBook[ticker][Side.BUY].length;
        else
            minLen = orderBook[ticker][Side.SELL].length;

        // Loop throught the BUY and SELL order books
        for (uint256 i = 0; i < minLen; i++) {
            
            //wqq

        }
    }

    function createOrder (Side side, bytes32 ticker, uint256 price, uint256 amount) external {

        _createOrder(side, ticker, price, amount);

        processSwaps(ticker);

        emit OrderCreated(side, ticker, price, amount);
    }

}