// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/ERC721Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC721/extensions/ERC721URIStorageUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/CountersUpgradeable.sol";
import "../helpers/Errors.sol";
import "../helpers/Validation.sol";
import "../interface/IERC6551Manager.sol";

/// @title Arcadians Soulbound Token
/// @author Venkatesh
/// @notice This contract is used to provide SBT for the users
contract ArcadiansBadge is
    Initializable,
    ERC721Upgradeable,
    ERC721URIStorageUpgradeable,
    AccessControlUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    Errors
{
    using CountersUpgradeable for CountersUpgradeable.Counter;

    CountersUpgradeable.Counter internal tokenIdCounter;

    string public baseURI;

    // badgeType => boolean
    mapping(string => bool) public supportedBadgeTypes;

    // user address => badgeType => boolean
    mapping(address => mapping(string => bool)) public userBadges;

    // ERC6551 Manager contract to use token bound account features
    IERC6551Manager public erc6551ManagerContract;

    // Access control roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address _erc6551ManagerContractAddress
    ) public initializer {
        __ERC721_init(_name, _symbol);
        __ERC721URIStorage_init();
        __AccessControl_init();
        __ReentrancyGuard_init();
        __UUPSUpgradeable_init();

        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(MINTER_ROLE, msg.sender);
        _grantRole(BURNER_ROLE, msg.sender);
        _grantRole(MANAGER_ROLE, msg.sender);

        Validation.checkForZeroAddress(_erc6551ManagerContractAddress);

        erc6551ManagerContract = IERC6551Manager(
            _erc6551ManagerContractAddress
        );
    }

    /// @notice Configure the erc6551Manager contract
    /// @param _erc6551ManagerContractAddress manager contract address
    function configureERC6551Manager(address _erc6551ManagerContractAddress)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        Validation.checkForZeroAddress(_erc6551ManagerContractAddress);
        erc6551ManagerContract = IERC6551Manager(
            _erc6551ManagerContractAddress
        );
    }

    /// @notice Configure supported badge types
    /// @param _badgeType Badge type
    function configureBadgeType(string calldata _badgeType, bool _state)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        supportedBadgeTypes[_badgeType] = _state;
    }

    /// @notice Mints a SBT badge for the users
    /// @dev SBT uses a custom base token URI
    /// @param _arcadianContractAddress Arcadians Contract Address
    /// @param _arcadianTokenId Arcadians Token Id
    /// @param _badgeType badge type
    function mint(
        address _arcadianContractAddress,
        uint256 _arcadianTokenId,
        string calldata _badgeType
    ) external virtual nonReentrant onlyRole(MINTER_ROLE) {
        Validation.checkForZeroAddress(_arcadianContractAddress);

        if (!supportedBadgeTypes[_badgeType]) {
            revert BadgeNotSupported();
        }

        address _arcadianTokenBoundAccount = erc6551ManagerContract
            .getTokenBoundAccount(_arcadianContractAddress, _arcadianTokenId);

        if (userBadges[_arcadianTokenBoundAccount][_badgeType]) {
            revert DuplicateBadgesNotAllowed();
        }

        userBadges[_arcadianTokenBoundAccount][_badgeType] = true;
        tokenIdCounter.increment();
        _safeMint(_arcadianTokenBoundAccount, tokenIdCounter.current());
        _setTokenURI(tokenIdCounter.current(), _badgeType);
    }

    /// @notice Burns a SBT badge from the users
    /// @dev SBT uses a custom base token URI
    /// @param _tokenId SBT Token Id
    /// @param _badgeType badge type
    function burn(uint256 _tokenId, string calldata _badgeType)
        external
        virtual
        nonReentrant
        onlyRole(BURNER_ROLE)
    {
        if (!supportedBadgeTypes[_badgeType]) {
            revert BadgeNotSupported();
        }

        userBadges[ERC721Upgradeable.ownerOf(_tokenId)][_badgeType] = false;
        _burn(_tokenId);
    }

    function _burn(uint256 _tokenId)
        internal
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
    {
        super._burn(_tokenId);
    }

    /// @notice Sets a baseToken URI for SBT
    /// @dev baseTokenURI will override the tokenURI
    /// @param _baseUri this is a base token URI and act as a prefix for all the token URI
    function setBaseURI(string calldata _baseUri)
        external
        virtual
        onlyRole(MANAGER_ROLE)
    {
        if (bytes(_baseUri).length <= 0) {
            revert InvalidBaseURI();
        }

        baseURI = _baseUri;
    }

    /// @notice Get baseToken URI of the SBT
    /// @dev baseTokenURI will override the tokenURI
    /// @return baseURI returns the base token URI
    function _baseURI()
        internal
        view
        virtual
        override(ERC721Upgradeable)
        returns (string memory)
    {
        return baseURI;
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _tokenId,
        uint256 _batchSize
    ) internal virtual override(ERC721Upgradeable) {
        if (_from != address(0) && _to != address(0)) {
            revert TokenTransferNotAllowed();
        }

        super._beforeTokenTransfer(_from, _to, _tokenId, _batchSize);
    }

    /// @notice Get token URI of the SBT
    /// @dev TokenURI is override
    /// @return baseURI returns the token URI of the SBT
    function tokenURI(uint256 _tokenId)
        public
        view
        virtual
        override(ERC721Upgradeable, ERC721URIStorageUpgradeable)
        returns (string memory)
    {
        return super.tokenURI(_tokenId);
    }

    function supportsInterface(bytes4 _interfaceId)
        public
        view
        virtual
        override(
            ERC721Upgradeable,
            ERC721URIStorageUpgradeable,
            AccessControlUpgradeable
        )
        returns (bool)
    {
        return super.supportsInterface(_interfaceId);
    }

    function _authorizeUpgrade(address newImplementation)
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
