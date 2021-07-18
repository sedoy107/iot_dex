// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;
pragma abicoder v2;

contract OrderBook {
    
    enum Side {
        BUY,
        SELL
    }

    struct Order {
        uint256 id;
        address trader;
        Side side;
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

    function _getOrderBook (bytes32 tickerTo, bytes32 tickerFrom, uint8 side) internal view returns(Order[] memory) {
        return orderBook[tickerTo][tickerFrom][Side(side)];
    }

    function getAskOrderBook (bytes32 tickerTo, bytes32 tickerFrom) external view returns(Order[] memory) {
        return _getOrderBook(tickerTo, tickerFrom, uint8(Side.SELL));
    }

    function getBidOrderBook (bytes32 tickerTo, bytes32 tickerFrom) external view returns(Order[] memory) {
        return _getOrderBook(tickerTo, tickerFrom, uint8(Side.BUY));
    }

    /**
     * @dev creates an order to swap two tokens. 'amount` of tokens
     * `tickerTo` are to beswapped for `tickerFrom` @ `price`
     */
    function _createOrder (Side side, bytes32 tickerTo, bytes32 tickerFrom, uint256 price, uint256 amount) internal {
        require(price > 0, "OrderBook: zero price");
        require(amount > 0, "OrderBook: zero amount");
        Order memory order = Order(
            nextOrderId,
            msg.sender,
            side,
            tickerTo,
            tickerFrom,
            amount,
            price,
            0
        );

        nextOrderId++;

        // push to the end mem->storage copy operation
        // [1,1,2,2,3,4] BUY
        // [5,4,3,2,1,1] SELL
        orderBook[tickerTo][tickerFrom][side].push(order);

        // order stil holds the last element

        uint256 len = orderBook[tickerTo][tickerFrom][side].length;

        // Start looping from `[len - 1]` to `[0]`
        // order can be reused as a temp variable
        if (side == Side.BUY) {
            for (uint256 i = len - 1; i > 0; i--) {
                if (orderBook[tickerTo][tickerFrom][side][i - 1].price > orderBook[tickerTo][tickerFrom][side][i].price) {
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
                if (orderBook[tickerTo][tickerFrom][side][i - 1].price < orderBook[tickerTo][tickerFrom][side][i].price) {
                    order = orderBook[tickerTo][tickerFrom][side][i];
                    orderBook[tickerTo][tickerFrom][side][i] = orderBook[tickerTo][tickerFrom][side][i - 1];
                    orderBook[tickerTo][tickerFrom][side][i - 1] = order;
                }
                else {
                    break;
                }
            }
        }
    }

    function _createLimitOrder (Side side, bytes32 tickerTo, bytes32 tickerFrom, uint256 price, uint256 amount) internal {
        _createOrder(side, tickerTo, tickerFrom, price, amount);
    }

    function createLimitBuyOrder (bytes32 tickerTo, bytes32 tickerFrom, uint256 price, uint256 amount) external {
        // Must have enough
        _createLimitOrder(Side.BUY, tickerTo, tickerFrom, price, amount);

    }

    function createLimitSellOrder (bytes32 tickerTo, bytes32 tickerFrom, uint256 price, uint256 amount) external {
        _createLimitOrder(Side.SELL, tickerTo, tickerFrom, price, amount);

    }

    function _createMarketOrder (Side side, bytes32 tickerTo, bytes32 tickerFrom, uint256 amount) internal {
        uint256 price;
        // If the orderBook is empty then the exchange reate goes 1-to-1
        if (orderBook[tickerTo][tickerFrom][side].length == 0)
            price = 1;
        // Otherwise, use the bset price from the top of the orderBook
        else
            price = orderBook[tickerTo][tickerFrom][side][orderBook[tickerTo][tickerFrom][side].length - 1].price;
        _createOrder(side, tickerTo, tickerFrom, price, amount);
    }

    function createMarketBuyOrder (bytes32 tickerTo, bytes32 tickerFrom, uint256 amount) external {
        _createMarketOrder(Side.BUY, tickerTo, tickerFrom, amount);
    }

    function createMarketSellOrder(bytes32 tickerTo, bytes32 tickerFrom, uint256 amount) external {
        _createMarketOrder(Side.SELL, tickerTo, tickerFrom, amount);
    }
}