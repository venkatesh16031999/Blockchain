// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract Slot {
	uint256 private number; // slot - 0

	// .slot is an very important to identify the slot number of storage variable
	// without hardcoding the slot number

	// the slot number can be hardcoded as 0x00 or 0 to achieve the same behaviour

	function getNumberByYul() external view returns (uint256 _number) {
		assembly {
			// loads a value from the slot 0 which is "number"
			_number := sload(number.slot)
		}
	}

	function setNumberByYul(uint256 _number) external {
		assembly {
			// stores a value into the slot 0 which is "number"
			sstore(number.slot, _number)
		}
	}

	function setNumber(uint256 _number) external {
		// solidity standard to store a variable
		number = _number;
	}

	function getNumber() external view returns (uint256) {
		// solidity standard to load a variable
		return number;
	}
}
