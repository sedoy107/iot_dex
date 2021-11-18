// SPDX-License-Identifier: MIT

pragma solidity ^0.8.0;

import "../node_modules/@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "../node_modules/@openzeppelin/contracts/utils/math/SafeMath.sol";
import "../node_modules/@openzeppelin/contracts/access/Ownable.sol";

interface IERC20_Custom {
    function decimals() external view returns (uint8);
}

contract Wallet is Ownable {

    using SafeMath for uint256;

    bytes32 constant ethTicker = 0x4554480000000000000000000000000000000000000000000000000000000000;
    uint8 constant ethDecimals = 18;
    address constant ethAddress = 0x0000000000000000000000000000000000000000;

    struct Token {
        bytes32 ticker;
        address tokenAddress;
        uint8 decimals;
    }

    mapping (bytes32 => Token) public tokenMapping;
    Token[] public tokenList;

    mapping (address => mapping(bytes32 => uint256)) public balances;

    constructor() {
        tokenMapping[ethTicker] = Token(ethTicker, ethAddress, ethDecimals);
        tokenList.push(tokenMapping[ethTicker]);
    }

    modifier tokenExists(bytes32 ticker) {
        require(tokenMapping[ticker].decimals != 0, "Wallet: token does not exits");
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
        require(tokenMapping[ticker].decimals == 0, "Wallet: token already exists");
        uint8 decimals = ticker == ethTicker ? ethDecimals : IERC20_Custom(tokenAddress).decimals();
        tokenMapping[ticker] = Token(ticker, tokenAddress, decimals);
        tokenList.push(tokenMapping[ticker]);
    }

    /** 
    * @dev Get token list
    * 
    */
    function getTokenList() public view returns (Token[] memory){
        return tokenList;
    }
    
    /** 
    * @dev Deposit ether to the wallet for `msg.sender`'s account
    * 
    * Requirements:
    *
    * - `msg.sender` cannot be equal to this(address).
    */
    function deposit() external payable {
        require(address(this) != msg.sender, "Wallet: can't send ether to itself");

        balances[msg.sender][ethTicker] += msg.value;
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
    * - `msg.sender` MUST have a sufficient balance of ether to withdraw.
    */
    function withdraw(uint256 amount) external {
        require(balances[msg.sender][ethTicker] >= amount, "Wallet: insufficient ether balance");

        balances[msg.sender][ethTicker] = balances[msg.sender][ethTicker].sub(amount);
        payable(address(msg.sender)).transfer(amount);
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
        require(balances[msg.sender][ticker] >= amount, "Wallet: insufficient token balance");

        balances[msg.sender][ticker] = balances[msg.sender][ticker].sub(amount);
        IERC20(tokenMapping[ticker].tokenAddress).transfer(msg.sender, amount);
    }
}