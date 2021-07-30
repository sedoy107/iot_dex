// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

import "./Wallet.sol";
import "./OrderBook.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/Math.sol";

contract Dex is Wallet, OrderBook {

    using Math for uint256;

    event OrderCreated(
        uint256 id,
        address indexed trader,
        Side side, 
        OrderType orderType,
        bytes32 tickerTo, 
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    );

    event OrderRemoved(
        uint256 id,
        address indexed trader,
        uint256 filled
    );

    event OrderFilled(
        uint256 id,
        address indexed trader,
        uint256 price,
        uint256 filled
    );

    mapping(bytes32 => mapping (bytes32 => bool)) pairs;

    modifier pairExists (bytes32 tickerTo, bytes32 tickerFrom) {
        require (pairs[tickerTo][tickerFrom], "Dex: pair doesn't exist");
        _;
    }

    function addPair(bytes32 ticketTo, bytes32 tickerFrom) public onlyOwner {
        pairs[ticketTo][tickerFrom] = true;
    }

    function removePair(bytes32 ticketTo, bytes32 tickerFrom) public onlyOwner {
        pairs[ticketTo][tickerFrom] = false;
    }

    function popTopOrder(
        Side side,
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    private {
        uint256 topIndex = orderBook[tickerTo][tickerFrom][side].length - 1;
        Order storage order = orderBook[tickerTo][tickerFrom][side][topIndex];
        
        emit OrderRemoved(
            order.id, 
            order.trader, 
            order.filled
        );
        
        delete orderBook[tickerTo][tickerFrom][side][topIndex];
        
        orderBook[tickerTo][tickerFrom][side].pop();
    }

    /**
     * @dev Matches the orders on the order book based on their price and type
     */
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

            /*
            Check if the orders aren't cancelled. If any of the orders is cancelled then pop the order
            and continue looking.
            */
            if (!topBuyOrder.isActive)
                popTopOrder(Side.BUY, tickerTo, tickerFrom);
            if (!topSellOrder.isActive)
                popTopOrder(Side.SELL, tickerTo, tickerFrom);
            if (!topSellOrder.isActive || !topBuyOrder.isActive)
                continue;
            
            /* 
            If the top orders are both market orders then their price will be equal as the previous market
            order's price will be the current market price and will propogate the the new market order
            that is currently being placed on the opposite side of the order book.
            */
            if (topBuyOrder.orderType == OrderType.MARKET && topSellOrder.orderType == OrderType.MARKET) {
                assert(topBuyOrder.price == topSellOrder.price);
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

            /* 
            For the most recent order that comes to processing, check if it is MOC order. If so
            then pop at this point it can fulfill the opposite side of orders and hence it won't 
            rest on the order book. It should be cancelled.

            Only one of the top orders can be cancelled as only one will be the most recent.
            */
            if (topBuyOrder.id == nextOrderId - 1 && topBuyOrder.orderType == OrderType.MOC) {
                popTopOrder(Side.BUY, tickerTo, tickerFrom);
                continue;
            }
            if (topBuyOrder.id == nextOrderId - 1 && topSellOrder.orderType == OrderType.MOC) {
                popTopOrder(Side.SELL, tickerTo, tickerFrom);
                continue;
            }

            // Calculate current fill price based on the order of arrival to the market
            uint256 fillPrice = topSellOrder.id < topBuyOrder.id ? topSellOrder.price : topBuyOrder.price;

            // Calculate the current order fill amount
            // Take into account the partly filled amounts by subtracting already filled tokes from the total amount
            uint256 remainingBuyOrderAmountToFill = topBuyOrder.amount - topBuyOrder.filled;
            uint256 remainingSellOrderAmountToFill = topSellOrder.amount - topSellOrder.filled;
            uint256 fillAmountTo = Math.min(remainingBuyOrderAmountToFill, remainingSellOrderAmountToFill);
            uint256 fillAmountFrom = fillAmountTo * fillPrice;

            /* 
            If FOK order then check if the fill amount == the order amount. 
            If so then remove the order.

            Both of the top orders can be FOK orders, but only one of them can
            be removed due to the projected partial fulfillment. 
            
            In case when both orders are the FOK orders, the one with lesser amount
            will remain on the order book.
            */
            bool fokBreak = false;
            if (topBuyOrder.orderType == OrderType.FOK && topBuyOrder.amount != fillAmountTo){
                popTopOrder(Side.BUY, tickerTo, tickerFrom);
                fokBreak = true;
            }
            if (topSellOrder.orderType == OrderType.FOK && topSellOrder.amount != fillAmountTo){
                popTopOrder(Side.SELL, tickerTo, tickerFrom);
                fokBreak = true;
            }
            if (fokBreak)
                continue;
            
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

            // Emit OrderFilled event for sell and buy orders
            emit OrderFilled(
                topBuyOrder.id,
                topBuyOrder.trader,
                fillPrice,
                fillAmountTo
            );

            emit OrderFilled(
                topSellOrder.id,
                topSellOrder.trader,
                fillPrice,
                fillAmountTo
            );

            // If order.filled == amount, then the order can be popped
            if (topBuyOrder.filled == topBuyOrder.amount) {
                popTopOrder(Side.BUY, tickerTo, tickerFrom);
            }
            // If IOC order is partially filled then still pop the order from the order book
            else if(topBuyOrder.orderType == OrderType.IOC && topBuyOrder.filled > 0){
                popTopOrder(Side.BUY, tickerTo, tickerFrom);
            }

            if (topSellOrder.filled == topSellOrder.amount) {
                popTopOrder(Side.SELL, tickerTo, tickerFrom);
            }
            // If IOC order is partially filled then still pop the order from the order book
            else if(topSellOrder.orderType == OrderType.IOC && topSellOrder.filled > 0){
                popTopOrder(Side.SELL, tickerTo, tickerFrom);
            }
        }
    }

    /**
     * @dev creates an order to swap two tokens:
     *  `amount` of tokens `tickerTo` are to be swapped for tokens `tickerFrom` @ `price`
     * 
     *  `orderType` defines the type of order to place
     *
     *  For market orders the price doesn't matter and can be zero.
     *  Market order will not be created if the opposite side of the order book is empty.
     *
     *  Overrides `createOrder` function from OrderBook.sol
     */
    function createOrder (
        Side side, 
        OrderType orderType,
        bytes32 tickerTo,
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    )
    public 
    virtual override 
    pairExists(tickerTo, tickerFrom)
    returns (uint256) {
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

        emit OrderCreated(
            orderId, 
            msg.sender, 
            side, 
            orderType, 
            tickerTo, 
            tickerFrom, 
            price, // for market orders price can be anything.
            amount
        );

        processSwaps(tickerTo, tickerFrom);

        return orderId;
    }
    function cancelOrder (
        uint256 orderId,
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    virtual override
    pairExists(tickerTo, tickerFrom)
    {
        super.cancelOrder(orderId, side, tickerTo, tickerFrom);
    }

    function getOrder (
        uint256 orderId,
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    view 
    virtual override
    pairExists(tickerTo, tickerFrom)
    returns (Order memory order)
    {
        return super.getOrder(orderId, side, tickerTo, tickerFrom);
    }

    function getOrderBook(
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    view 
    virtual override
    pairExists(tickerTo, tickerFrom)
    returns(Order[] memory)
    {
        return super.getOrderBook(side, tickerTo, tickerFrom);
    }

    function getMarketPrice (
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    view 
    virtual override
    pairExists(tickerTo, tickerFrom)
    returns (uint256) 
    {
        return super.getMarketPrice(side, tickerTo, tickerFrom);
    }
}
