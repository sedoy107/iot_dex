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
        bytes32 ticker;
        uint256 amount;
        uint256 price;
    }

    /**
     * @dev `Order[]` should be pop'able. Simple push is not an option as it increases the index
     * and causes the array to grow forever.
     */
    mapping (bytes32 => mapping (Side => Order[])) private orderBook;

    uint256 nextOrderId = 0;

    event LimitBuyOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed price , uint256 indexed amount);
    event LimitSellOrderCreated (address trader, bytes32 indexed ticker, uint256 indexed price , uint256 indexed amount);
    event BuyOrderFilled (address trader, bytes32 indexed ticker, uint256 indexed price, uint256 indexed amount);
    event SellOrderFilled (address trader, bytes32 indexed ticker, uint256 indexed price, uint256 indexed amount);

    function _getOrderBook (bytes32 ticker, uint8 side) private view returns(Order[] memory) {
        return orderBook[ticker][Side(side)];
    }

    function getAskOrderBook (bytes32 ticker) public view returns(Order[] memory) {
        return _getOrderBook(ticker, uint8(Side.SELL));
    }

    function getBidOrderBook (bytes32 ticker) public view returns(Order[] memory) {
        return _getOrderBook(ticker, uint8(Side.BUY));
    }

    function _createLimitOrder (Side side, bytes32 ticker, uint256 price, uint256 amount) private {
        require(price > 0, "OrderBook: zero price");
        require(amount > 0, "OrderBook: zero amount");
        Order memory order = Order(
            nextOrderId,
            msg.sender,
            side,
            ticker,
            amount,
            price
        );

        nextOrderId++;

        // push to the end mem->storage copy operation
        // [1,1,2,2,3,4] BUY
        // [5,4,3,2,1,1] SELL
        orderBook[ticker][side].push(order);

        // order stil holds the last element

        uint256 len = orderBook[ticker][side].length;

        // Start looping from `[len - 1]` to `[0]`
        // order can be reused as a temp variable
        if (side == Side.BUY) {
            for (uint256 i = len - 1; i > 0; i--) {
                if (orderBook[ticker][side][i - 1].price > orderBook[ticker][side][i].price) {
                    order = orderBook[ticker][side][i];
                    orderBook[ticker][side][i] = orderBook[ticker][side][i - 1];
                    orderBook[ticker][side][i - 1] = order;
                }
            }
        }
        else {
            for (uint256 i = len - 1; i > 0; i--) {
                if (orderBook[ticker][side][i - 1].price < orderBook[ticker][side][i].price) {
                    order = orderBook[ticker][side][i];
                    orderBook[ticker][side][i] = orderBook[ticker][side][i - 1];
                    orderBook[ticker][side][i - 1] = order;
                }
            }
        }
    }

    function createLimitBuyOrder (bytes32 ticker, uint256 price, uint256 amount) external virtual {
        _createLimitOrder(Side.BUY, ticker, price, amount);
        emit LimitBuyOrderCreated(msg.sender, ticker, price, amount);

    }

    function createLimitSellOrder (bytes32 ticker, uint256 price, uint256 amount) external virtual {
        _createLimitOrder(Side.SELL, ticker, price, amount);
        emit LimitSellOrderCreated(msg.sender, ticker, price, amount);

    }

    function createMarketOrder (bytes32 ticker, uint256 amount) external virtual {

    }
}