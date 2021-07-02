// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

contract Wallet is Ownable {

    using SafeMath for uint256;

    struct Token {
        bytes32 ticker;
        address tokenAddress;
    }
    mapping (bytes32 => Token) public tokenMapping;
    bytes32[] public tokenList;

    mapping (address => mapping(bytes32 => uint256)) public balances;

    modifier tokenExists(bytes32 ticker) {
        require(tokenMapping[ticker].tokenAddress != address(0), "Wallet: token does not exits");
        _;
    }

    /** 
    * @dev Adds token to the wallet
    * 
    * Requirements:
    *
    * - `onlyOwner` can add a `token`
    * - 
    */
    function addToken(bytes32 ticker, address tokenAddress) external onlyOwner {
        tokenMapping[ticker] = Token(ticker, tokenAddress);
        tokenList.push(ticker);
    }

    /** 
    * @dev Deposit tokens to the wallet for `msg.sender`'s account
    * 
    * Requirements:
    *
    * - `msg.sender` cannot be equal to `tokenAddress`.
    * - Token `ticker` MUST be present in `tokenMapping`.
    */
    function deposit(uint256 amount, bytes32 ticker) external tokenExists(ticker) {
        require(tokenMapping[ticker].tokenAddress != msg.sender, "Wallet: can't send tokens to itself");

        balances[msg.sender][ticker] = balances[msg.sender][ticker].add(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transferFrom(msg.sender, address(this), amount);
    }

    /** 
    * @dev Withdraw token @ `tokenAddress` contract for `msg.sender`'s account.
    * 
    * Requirements:
    *
    * - `msg.sender` MUST have a sufficient balance of tokens being withdrawn.
    * - Token `ticker` MUST be present in `tokenMapping`.
    */
    function withdraw(uint256 amount, bytes32 ticker) external tokenExists(ticker) {
        require(balances[msg.sender][ticker] >= amount, "Wallet: insufficient balance");

        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }
}