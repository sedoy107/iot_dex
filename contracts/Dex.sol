// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "./OrderBook.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

contract Dex is Wallet, OrderBook {

    using Math for uint256;

    event OrderCreated(
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    );

    function processSwaps(bytes32 tickerTo, bytes32 tickerFrom) private {
        // BUY and SELL `orderBook`s must both have entries
        while (
            orderBook[tickerTo][tickerFrom][Side.SELL].length > 0 && 
            orderBook[tickerTo][tickerFrom][Side.BUY].length > 0
        ) 
        {    
            // Get top BUY order
            uint256 topBuyIndex = orderBook[tickerTo][tickerFrom][Side.BUY].length - 1;
            Order storage topBuyOrder = orderBook[tickerTo][tickerFrom][Side.BUY][topBuyIndex];
            
            // Get top SELL order
            uint256 topSellIndex = orderBook[tickerTo][tickerFrom][Side.SELL].length - 1;
            Order storage topSellOrder = orderBook[tickerTo][tickerFrom][Side.BUY][topSellIndex];

            // Calculate the current order fill amount
            uint256 fillAmountTo = Math.min(topBuyOrder.amount, topSellOrder.amount);
            uint256 fillAmountFrom = Math.min(
                topBuyOrder.amount * topBuyOrder.price, 
                topSellOrder.amount * topBuyOrder.price
            );
            
            // Increase tickerTo and decrease tickerFrom tokens in buyer's wallet
            balances[topBuyOrder.trader][tickerTo] += fillAmountTo;
            balances[topBuyOrder.trader][tickerFrom] -= fillAmountFrom;

            // Decrease tickerTo and increase tickerFrom tokens in sellers's wallet
            balances[topSellOrder.trader][tickerTo] -= fillAmountTo;
            balances[topSellOrder.trader][tickerTo] += fillAmountFrom;

            // Increase filled amount for both, buyer seller
            topBuyOrder.filled += fillAmountTo;
            topSellOrder.filled += fillAmountTo;

            // If orders' filled == amount, then the order can be popped
            if (topBuyOrder.filled == topBuyOrder.amount)
                orderBook[tickerTo][tickerFrom][Side.BUY].pop();

            if (topSellOrder.filled == topSellOrder.amount)
                orderBook[tickerTo][tickerFrom][Side.SELL].pop();
            }
    }

    function createOrder (
        Side side, 
        bytes32 tickerTo,
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    )
    public virtual override {

        super.createOrder(side, tickerTo, tickerFrom, price, amount);

        processSwaps(tickerTo, tickerFrom);

        emit OrderCreated(side, tickerTo, tickerFrom, price, amount);
    }

}
