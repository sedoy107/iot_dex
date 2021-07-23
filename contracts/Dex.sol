// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "./OrderBook.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

contract Dex is Wallet, OrderBook {

    using Math for uint256;

    event OrderCreated(
        address indexed trader,
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
            Order storage topSellOrder = orderBook[tickerTo][tickerFrom][Side.SELL][topSellIndex];

            // If top orders are both market orders then bring their price to the max b/w the two of them
            if (topBuyOrder.orderType == OrderType.MARKET && topSellOrder.orderType == OrderType.MARKET) {
                uint256 newPrice = Math.max(topBuyOrder.price, topSellOrder.price);
                topBuyOrder.price = newPrice;
                topSellOrder.price = newPrice;
            }
            // If topBuyOrder is limit and topSellOrder is market, then use the buy order price
            else if (topBuyOrder.orderType != OrderType.MARKET && topSellOrder.orderType == OrderType.MARKET) {
                topSellOrder.price = topBuyOrder.price;
            }
            // If topSellOrder is limit and topBuyOrder is market, then use the sell order price
            else if (topBuyOrder.orderType == OrderType.MARKET && topSellOrder.orderType != OrderType.MARKET) {
                topBuyOrder.price = topSellOrder.price;
            }

            // If buyer's price is less then seller's price then order can't be filled
            if (topBuyOrder.price < topSellOrder.price)
                break;

            // Calculate the current order fill amount. 
            // Take into account the partly filled amounts by subtracting already filled tokes from the total amount
            uint256 a = topBuyOrder.amount - topBuyOrder.filled;
            uint256 b = topSellOrder.amount - topSellOrder.filled;
            uint256 fillAmountTo = Math.min(a, b);
            uint256 fillAmountFrom = Math.min(a, b) * topSellOrder.price;
            
            // Increase tickerTo and decrease tickerFrom tokens in buyer's wallet
            balances[topBuyOrder.trader][tickerTo] += fillAmountTo;
            balances[topBuyOrder.trader][tickerFrom] -= fillAmountFrom;

            // Decrease tickerTo and increase tickerFrom tokens in sellers's wallet
            balances[topSellOrder.trader][tickerTo] -= fillAmountTo;
            balances[topSellOrder.trader][tickerFrom] += fillAmountFrom;

            // Increase filled amount for both, buyer seller
            topBuyOrder.filled += fillAmountTo;
            topSellOrder.filled += fillAmountTo;

            assert(topBuyOrder.filled <= topBuyOrder.amount);
            assert(topSellOrder.filled <= topSellOrder.amount);

            // If order.filled == amount, then the order can be popped
            if (topBuyOrder.filled == topBuyOrder.amount) {
                delete orderBook[tickerTo][tickerFrom][Side.BUY][topBuyIndex];
                orderBook[tickerTo][tickerFrom][Side.BUY].pop();
            }

            if (topSellOrder.filled == topSellOrder.amount) {
                delete orderBook[tickerTo][tickerFrom][Side.SELL][topSellIndex];
                orderBook[tickerTo][tickerFrom][Side.SELL].pop();
            }
        }
    }

    function createOrder (
        Side side, 
        OrderType orderType,
        bytes32 tickerTo,
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    )
    public virtual override returns (uint256) {
        // Buyer can't swap for tokens he doesn't have
        if (side == Side.BUY) {
            uint256 buyersTokensToSwapBalance = balances[msg.sender][tickerFrom];
            require(buyersTokensToSwapBalance >= price * amount, "Dex: Buyer doesn't have enough tokes");
        }
        else {
            // Seller can't offer tokens for swap he doesn't have
            uint256 sellersTokensToSwapBalance = balances[msg.sender][tickerTo];
            require(sellersTokensToSwapBalance >= amount, "Dex: Seller doesn't have enough tokes");
        }

        uint256 orderId = super.createOrder(side, orderType, tickerTo, tickerFrom, price, amount);
        address trader = orderBook[tickerTo][tickerFrom][side][orderId].trader;

        processSwaps(tickerTo, tickerFrom);

        emit OrderCreated(trader, side, tickerTo, tickerFrom, price, amount);

        return orderId;
    }

}
