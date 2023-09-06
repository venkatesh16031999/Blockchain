// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../helpers/Errors.sol";
import "../helpers/Validation.sol";
import "../interface/IERC6551Registry.sol";

/// @title ERC6551Manager contract
/// @author Venkatesh
/// @notice This contract is used to manage the ERC6551 funtionalities
contract ERC6551Manager is
    Initializable,
    AccessControlEnumerableUpgradeable,
    UUPSUpgradeable,
    Errors
{
    // Access control roles
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // Use 0 as salt - It is officially used by tokenbound.orgs
    uint256 public erc6551Salt;

    // check the implementation contracts from here => https://docs.tokenbound.org/contracts/deployments
    address public erc6551ImplementationAddress;

    // check the registry contracts from here => https://docs.tokenbound.org/contracts/deployments
    address public erc6551RegistryAddress;

    // NFT contract address => true/false
    mapping(address => bool) public supportedNFTContracts;

    // ERC721 interface id to check the ERC721 compatibility
    bytes4 private constant INTERFACE_ID_ERC721 = 0x80ac58cd;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        address _registryAddress,
        address _implementationAddress,
        uint256 _salt
    ) public initializer {
        __AccessControlEnumerable_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);

        Validation.checkForZeroAddress(_registryAddress);
        Validation.checkForZeroAddress(_implementationAddress);

        erc6551RegistryAddress = _registryAddress;
        erc6551ImplementationAddress = _implementationAddress;
        erc6551Salt = _salt;
    }

    /// @notice Configure the supported NFT contracts
    /// @param _nftContractAddress NFT contract address
    /// @param _state true/false to enable or disable nft contract
    function configureNFTContract(address _nftContractAddress, bool _state)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        Validation.checkForZeroAddress(_nftContractAddress);
        Validation.checkSupportsInterface(
            _nftContractAddress,
            INTERFACE_ID_ERC721
        );
        supportedNFTContracts[_nftContractAddress] = _state;
    }

    /// @notice Configure the ERC 6551 registry contract address to lookup/create TBA
    /// @param _registryAddress ERC 6551 registry contract address
    function setupERC6551Registry(address _registryAddress)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        Validation.checkForZeroAddress(_registryAddress);
        erc6551RegistryAddress = _registryAddress;
    }

    /// @notice Configure the ERC 6551 implementation contract address for TBA
    /// @param _implementationAddress ERC 6551 implementation contract address
    function setupERC6551Implementation(address _implementationAddress)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        Validation.checkForZeroAddress(_implementationAddress);
        erc6551ImplementationAddress = _implementationAddress;
    }

    /// @notice Configure the salt for the creation and lookup of token bound account
    /// @param _salt ERC 6551 salt value (zero is officially used)
    function setupERC6551Salt(uint256 _salt)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        erc6551Salt = _salt;
    }

    /// @notice Determine or retrieve the NFT's token bound account address
    /// @param _nftContractAddress NFT contract address
    /// @param _tokenId NFT token ID
    /// @return tokenBoundAccountAddress NFT's token bound address
    function getTokenBoundAccount(address _nftContractAddress, uint256 _tokenId)
        external
        view
        virtual
        returns (address tokenBoundAccountAddress)
    {
        Validation.checkForZeroAddress(_nftContractAddress);
        Validation.checkForZeroAddress(erc6551RegistryAddress);
        Validation.checkForZeroAddress(erc6551ImplementationAddress);
        _checkNFTContractSupport(_nftContractAddress);

        IERC6551Registry _tokenBoundRegistry = IERC6551Registry(
            erc6551RegistryAddress
        );

        tokenBoundAccountAddress = _tokenBoundRegistry.account(
            erc6551ImplementationAddress,
            _getChainId(),
            _nftContractAddress,
            _tokenId,
            erc6551Salt
        );
    }

    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(AccessControlEnumerableUpgradeable)
        returns (bool)
    {
        return super.supportsInterface(_interfaceId);
    }

    /// @notice Checks if the NFT contract is supported or not
    /// @param _contractAddress NFT contract address
    function _checkNFTContractSupport(address _contractAddress)
        internal
        view
        virtual
    {
        if (!supportedNFTContracts[_contractAddress]) {
            revert NFTContractNotSupported();
        }
    }

    /// @notice Retrieve the chain id of the network where the contract is deployed
    /// @return id chain id of the network
    function _getChainId() internal view virtual returns (uint256 id) {
        assembly {
            id := chainid()
        }
    }

    function _authorizeUpgrade(address _newImplementation)
        internal
        virtual
        override
        onlyRole(MANAGER_ROLE)
    {}

    /// @notice Used to check the contract version
    /// @return v returns the contract version
    function version() external pure virtual returns (uint256 v) {
        v = 1;
    }
}
