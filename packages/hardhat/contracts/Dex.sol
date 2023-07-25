// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/utils/math/Math.sol";

contract Errors {
	error InsufficientFundsError();
	error ZeroAddressError();
	error InvalidLiquidityFunds();
	error InvalidSharesToMint();
	error InvalidSharesToBurn();
	error TokenTransferFailed();
	error InvalidToken();
}

contract Dex is Errors {
	uint256 private reserve1;
	uint256 private reserve2;

	IERC20 public token1;
	IERC20 public token2;

	uint256 public totalLiquidity;
	mapping(address => uint256) private totalSharesByUser;

	constructor(address _tokenAddress1, address _tokenAddress2) {
		if (_tokenAddress1 == address(0) || _tokenAddress2 == address(0)) {
			revert ZeroAddressError();
		}
		token1 = IERC20(_tokenAddress1);
		token2 = IERC20(_tokenAddress2);
	}

	function _mintShares(address _address, uint256 _amount) internal {
		totalSharesByUser[_address] += _amount;
		totalLiquidity += _amount;
	}

	function _burnShares(address _address, uint256 _amount) internal {
		totalSharesByUser[_address] -= _amount;
		totalLiquidity -= _amount;
	}

	function _updateReserves(uint256 _amount1, uint256 _amount2) internal {
		reserve1 = _amount1;
		reserve2 = _amount2;
	}

	function addLiquidity(uint256 _amount1, uint256 _amount2)
		external
		returns (uint256 shares)
	{
		if (_amount1 <= 0 || _amount2 <= 0) {
			revert InsufficientFundsError();
		}

		if (reserve1 > 0 || reserve2 > 0) {
			if (reserve1 * _amount2 != reserve2 * _amount1) {
				revert InvalidLiquidityFunds();
			}
		}

		if (totalLiquidity == 0) {
			shares = Math.sqrt(_amount1 * _amount2);
		} else {
			// formula to calculate shares is: (dx / x) * T = s
			shares = Math.min(
				(_amount1 * totalLiquidity) / reserve1,
				(_amount2 * totalLiquidity) / reserve2
			);
		}

		if (shares <= 0) {
			revert InvalidSharesToMint();
		}

		_mintShares(msg.sender, shares);

		_updateReserves(
			token1.balanceOf(address(this)) + _amount1,
			token2.balanceOf(address(this)) + _amount2
		);

		bool success1 = token1.transferFrom(
			msg.sender,
			address(this),
			_amount1
		);
		bool success2 = token2.transferFrom(
			msg.sender,
			address(this),
			_amount2
		);

		if (!success1 || !success2) {
			revert TokenTransferFailed();
		}
	}

	function removeLiquidity(uint256 _shares)
		external
		returns (uint256 _amount1, uint256 _amount2)
	{
		if (_shares <= 0) {
			revert InvalidSharesToBurn();
		}

		// formula to remove liquidity: dx = (s * x) / T and dy = (s * y) / T

		_amount1 = (_shares * reserve1) / totalLiquidity;
		_amount2 = (_shares * reserve2) / totalLiquidity;

		if (_amount1 <= 0 || _amount2 <= 0) {
			revert InvalidLiquidityFunds();
		}

		_burnShares(msg.sender, _shares);

		_updateReserves(
			token1.balanceOf(address(this)) - _amount1,
			token2.balanceOf(address(this)) - _amount2
		);

		bool success1 = token1.transfer(msg.sender, _amount1);
		bool success2 = token2.transfer(msg.sender, _amount2);

		if (!success1 || !success2) {
			revert TokenTransferFailed();
		}
	}

	function swap(address _tokenAddress, uint256 _amount)
		external
		returns (uint256 amountOut)
	{
		if (
			_tokenAddress != address(token1) && _tokenAddress != address(token2)
		) {
			revert InvalidToken();
		}

		if (_amount <= 0) {
			revert InsufficientFundsError();
		}

		(
			IERC20 tokenIn,
			uint256 reserveIn,
			IERC20 tokenOut,
			uint256 reserveOut
		) = _tokenAddress == address(token1)
				? (token1, reserve1, token2, reserve2)
				: (token2, reserve2, token1, reserve1);

		// formula to swap a token is: dy = ydx / (x + dx)

		uint256 amountInWithFee = (_amount * 997) / 1000; // 0.3 percent fees

		amountOut =
			(reserveOut * amountInWithFee) /
			(reserveIn + amountInWithFee);

		if (amountOut <= 0) {
			revert InvalidLiquidityFunds();
		}

		bool success1 = tokenIn.transferFrom(
			msg.sender,
			address(this),
			_amount
		);
		bool success2 = tokenOut.transfer(msg.sender, amountOut);

		if (!success1 || !success2) {
			revert TokenTransferFailed();
		}

		_updateReserves(
			token1.balanceOf(address(this)),
			token2.balanceOf(address(this))
		);
	}
}
