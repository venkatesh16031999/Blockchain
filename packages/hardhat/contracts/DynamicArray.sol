// SPDX-License-Identifier: MIT
pragma solidity 0.8.17;

contract YulDynamicArray {
	// storage variable
	uint256[] private array;

	/** Dynamic array consist of
	 * One slot for the pointer
	 * One slot for the the length
	 * One slot for each element
	 */

	function arrayLengthByYul() public view returns (uint256 len) {
		assembly {
			// Access the slot which contains the length of the array by default.
			len := sload(array.slot)
		}
	}

	function getElementByYul(uint256 index)
		public
		view
		returns (uint256 element)
	{
		uint256 slot;

		assembly {
			// .slot will return the storage slot of the variable
			slot := array.slot
		}

		// To access the array element, hash the variable slot which returns the initial
		// location of the array element in storage layout
		bytes32 location = keccak256(abi.encode(slot));

		assembly {
			// Using the storage location, add the index and load the storage
			// layout to retrieve the array element
			element := sload(add(location, index))
		}
	}

	function setElementByYul(uint256 index, uint256 value) public {
		uint256 slot;

		assembly {
			// .slot will return the storage slot of the variable
			slot := array.slot
		}

		bytes32 location = keccak256(abi.encode(slot));

		assembly {
			// Using the storage location + array index, set the value
			sstore(add(location, index), value)
		}
	}
}
