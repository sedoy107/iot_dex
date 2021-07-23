// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

contract OrderBook {
    
    enum Side {
        BUY,
        SELL
    }

    /**
    * @dev OrderType. 
    * OrderBook contract won't handle IOC, FOK, MOC order types.
    * Such order types should be implemented in the Dex contract.
    *
    * - MARKET
    *   Filled immediately against resting orders at the current best available price.
    *   If the order is filled partially the rest of the amount remains in the order book
    *   and continue being filled at the market price as new limit orders arrive.  
    *
    * - LIMIT
    *   Filled at or better than a specified price. Any quantity that is not filled
    *   rests on the continuous order book until it is filled or canceled. 
    *
    * - LIMIT: Immediate-or-Cancel (IOC)
    *   Filled immediately at or better than a specified price. 
    *   Any quantity that is not filled immediately is canceled and 
    *   does not rest on the continuous order book.
    *
    * - LIMIT: Fill-Or-Kill (FOK)
    *   Filled immediately at or better than a specified price. 
    *   If the order cannot be filled in full immediately, the entire quantity is canceled. 
    *   The order does not rest on the continuous order book.
    *
    * - LIMIT: Maker-or-Cancel (MOC)
    *   Rests on the continuous order book at a specified price. 
    *   If any quantity can be filled immediately, the entire order is canceled.
    */
    enum OrderType {
        MARKET, 
        LIMIT, 
        IOC,
        FOK, 
        MOC
    }

    struct Order {
        uint256 id;
        Side side;
        OrderType orderType;
        address trader;
        bytes32 ticker1;
        bytes32 ticker2;
        uint256 amount;
        uint256 price;
        uint256 filled;
    }

    /**
     * @dev `Order[]` should be pop'able. Simple push is not an option as it increases the index
     * and causes the array to grow forever.
     */
    mapping (bytes32 => mapping (bytes32 => mapping (Side => Order[]))) internal orderBook;

    uint256 internal nextOrderId = 0;

    function getOrderBook(
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    view 
    returns(Order[] memory)
    {
        return orderBook[tickerTo][tickerFrom][side];
    }

    function getMarketPrice (
        Side side, 
        bytes32 tickerTo, 
        bytes32 tickerFrom
    ) 
    public 
    view 
    returns (uint256) 
    {
        require(orderBook[tickerTo][tickerFrom][side].length > 0, "Market is not available");
        
        uint256 topIndex = orderBook[tickerTo][tickerFrom][side].length - 1;
        return orderBook[tickerTo][tickerFrom][side][topIndex].price;
    }

    /**
     * @dev creates an order to swap two tokens:
     *  `amount` of tokens `tickerTo` are to be swapped for tokens `tickerFrom` @ `price`
     *
     *  If `price` == 0 then it is  a market order.
     *  Market order will not be created if the trading pair order book doesn't have orders.
     */
    function createOrder (
        Side side, 
        OrderType orderType,
        bytes32 tickerTo, 
        bytes32 tickerFrom, 
        uint256 price, 
        uint256 amount
    )
    public virtual returns (uint256)
    {
        require(amount > 0, "OrderBook: zero amount");
        if (orderType != OrderType.MARKET)
            require(price > 0, "OrderBook: Limit order cannot have zero price");

        if (orderType == OrderType.MARKET) {
            price = getMarketPrice(side, tickerTo, tickerFrom);
        }

        Order memory order = Order(
            nextOrderId,
            side,
            orderType,
            msg.sender,
            tickerTo,
            tickerFrom,
            amount,
            price,
            0
        );

        nextOrderId++;

        orderBook[tickerTo][tickerFrom][side].push(order);

        uint256 len = orderBook[tickerTo][tickerFrom][side].length;

        // Start looping from `[len - 1]` to `[0]` 
        // order can be reused as a temp variable
        if (side == Side.BUY) {
            for (uint256 i = len - 1; i > 0; i--) {
                if (
                    orderBook[tickerTo][tickerFrom][side][i - 1].price > 
                    orderBook[tickerTo][tickerFrom][side][i].price
                )
                {
                    order = orderBook[tickerTo][tickerFrom][side][i];
                    orderBook[tickerTo][tickerFrom][side][i] = orderBook[tickerTo][tickerFrom][side][i - 1];
                    orderBook[tickerTo][tickerFrom][side][i - 1] = order;
                }
                else {
                    break;
                }
            }
        }
        else {
            for (uint256 i = len - 1; i > 0; i--) {
                if (
                    orderBook[tickerTo][tickerFrom][side][i - 1].price < 
                    orderBook[tickerTo][tickerFrom][side][i].price
                )
                {
                    order = orderBook[tickerTo][tickerFrom][side][i];
                    orderBook[tickerTo][tickerFrom][side][i] = orderBook[tickerTo][tickerFrom][side][i - 1];
                    orderBook[tickerTo][tickerFrom][side][i - 1] = order;
                }
                else {
                    break;
                }
            }
        }

        return len - 1;
    }
}