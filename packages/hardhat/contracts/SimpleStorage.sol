// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

import "@openzeppelin/contracts/access/Ownable.sol";

contract SimpleStorage is Ownable {
	string public word = "Initial Word";

	function setWord(string memory _word) external onlyOwner {
		word = _word;
	}
}
