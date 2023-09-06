// SPDX-License-Identifier: MIT
pragma solidity 0.8.18;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/token/ERC20/ERC20Upgradeable.sol";
import "@openzeppelin/contracts-upgradeable/access/AccessControlEnumerableUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "../helpers/Errors.sol";
import "../helpers/Validation.sol";
import "../interface/IERC6551Manager.sol";

/// @title Arcadians Points Contract
/// @author Venkatesh R
/// @notice This contract is used to provide a on-chain points for the NFTs via ERC6551 token bound account
contract ArcadiansPoints is
    Initializable,
    ERC20Upgradeable,
    AccessControlEnumerableUpgradeable,
    ReentrancyGuardUpgradeable,
    UUPSUpgradeable,
    Errors
{
    // Access control roles
    bytes32 public constant MINTER_ROLE = keccak256("MINTER_ROLE");
    bytes32 public constant BURNER_ROLE = keccak256("BURNER_ROLE");
    bytes32 public constant MANAGER_ROLE = keccak256("MANAGER_ROLE");

    // ERC6551 Manager contract to use token bound account features
    IERC6551Manager public erc6551ManagerContract;

    uint256 public maxPointsPerNFT;

    // Arcadians levels
    enum ArcadiansLevel {
        Novice,
        Sparkbearer,
        Shardspeaker,
        Guidestar,
        Fatesmith
    }

    event ArcadiansPointsIncreased(
        address indexed userAddress,
        address indexed arcadiansContractAddress,
        uint256 indexed tokenId,
        address tokenBoundAccountAddress,
        uint256 totalPoints,
        uint256 points
    );

    event ArcadiansPointsDecreased(
        address indexed userAddress,
        address indexed arcadiansContractAddress,
        uint256 indexed tokenId,
        address tokenBoundAccountAddress,
        uint256 totalPoints,
        uint256 points
    );

    event ArcadiansLevelUpgraded(
        address indexed userAddress,
        address indexed arcadiansContractAddress,
        uint256 indexed tokenId,
        address tokenBoundAccountAddress,
        ArcadiansLevel levelFrom,
        ArcadiansLevel levelTo
    );

    event ArcadiansLevelDowngraded(
        address indexed userAddress,
        address indexed arcadiansContractAddress,
        uint256 indexed tokenId,
        address tokenBoundAccountAddress,
        ArcadiansLevel levelFrom,
        ArcadiansLevel levelTo
    );

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    function initialize(
        string memory _name,
        string memory _symbol,
        address _erc6551ManagerContractAddress
    ) public initializer {
        __ERC20_init(_name, _symbol);
        __AccessControlEnumerable_init();
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

        maxPointsPerNFT = 61000 * 1e18;
    }

    /// @notice Configure the max NFT points
	/// @param _points maximum supported points
	function configureMaxPointsPerNFT(uint256 _points)
		external
		virtual
		onlyRole(MANAGER_ROLE)
	{
		if (_points <= maxPointsPerNFT) {
			revert InvalidPoints();
		}
		maxPointsPerNFT = _points;	
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

    /// @notice Mints a SBT arcadians points for the NFT's token bound account
    /// @param _arcadianContractAddress NFT contract address
    /// @param _tokenId NFT token ID
    /// @param _points The number of points to be minted
    function mint(
        address _arcadianContractAddress,
        uint256 _tokenId,
        uint256 _points
    ) external virtual nonReentrant onlyRole(MINTER_ROLE) {
        Validation.checkForZeroAddress(_arcadianContractAddress);

        address _arcadianTokenBoundAccount = erc6551ManagerContract
            .getTokenBoundAccount(_arcadianContractAddress, _tokenId);

        ArcadiansLevel _previousLevel = _getArcadianLevel(
            balanceOf(_arcadianTokenBoundAccount)
        );

        _mint(_arcadianTokenBoundAccount, _points);

        uint256 currentPoints = balanceOf(_arcadianTokenBoundAccount);

        ArcadiansLevel _currentLevel = _getArcadianLevel(
            currentPoints
        );

        if (currentPoints > maxPointsPerNFT) {
			revert MaximumPointsReached();
		}

        if (_currentLevel != _previousLevel) {
            emit ArcadiansLevelUpgraded(
                msg.sender,
                _arcadianContractAddress,
                _tokenId,
                _arcadianTokenBoundAccount,
                _previousLevel,
                _currentLevel
            );
        }

        emit ArcadiansPointsIncreased(
            msg.sender,
            _arcadianContractAddress,
            _tokenId,
            _arcadianTokenBoundAccount,
            currentPoints, 
			_points
        );
    }

    /// @notice Burns a SBT arcadians points from the NFT's token bound account
    /// @param _arcadianContractAddress NFT contract address
    /// @param _tokenId NFT token ID
    /// @param _points The number of points to be minted
    function burn(
        address _arcadianContractAddress,
        uint256 _tokenId,
        uint256 _points
    ) external virtual nonReentrant onlyRole(BURNER_ROLE) {
        Validation.checkForZeroAddress(_arcadianContractAddress);

        address _arcadianTokenBoundAccount = erc6551ManagerContract
            .getTokenBoundAccount(_arcadianContractAddress, _tokenId);

        ArcadiansLevel _previousLevel = _getArcadianLevel(
            balanceOf(_arcadianTokenBoundAccount)
        );

        _burn(_arcadianTokenBoundAccount, _points);

        uint256 currentPoints = balanceOf(_arcadianTokenBoundAccount);

        ArcadiansLevel _currentLevel = _getArcadianLevel(
            currentPoints
        );

        if (_currentLevel != _previousLevel) {
            emit ArcadiansLevelDowngraded(
                msg.sender,
                _arcadianContractAddress,
                _tokenId,
                _arcadianTokenBoundAccount,
                _previousLevel,
                _currentLevel
            );
        }

        emit ArcadiansPointsDecreased(
            msg.sender,
            _arcadianContractAddress,
            _tokenId,
            _arcadianTokenBoundAccount,
            currentPoints,
			_points
        );
    }

    /// @notice Retrieve's the arcadians NFT level name based on the enum index
    /// @param _level Arcadians levels enum index
    /// @return levelName Arcadian NFT level name based on the arcadians points
    function getArcadiansLevelName(ArcadiansLevel _level)
        external
        pure
        virtual
        returns (string memory levelName)
    {
        if (ArcadiansLevel.Guidestar == _level) {
            levelName = "Guidestar";
        } else if (ArcadiansLevel.Fatesmith == _level) {
            levelName = "Fatesmith";
        } else if (ArcadiansLevel.Shardspeaker == _level) {
            levelName = "Shardspeaker";
        } else if (ArcadiansLevel.Sparkbearer == _level) {
            levelName = "Sparkbearer";
        } else {
            levelName = "Novice";
        }
    }

    /// @notice Retrieve the Arcadian NFT's level based on the arcadians points
    /// @param _arcadianContractAddress NFT contract address
    /// @param _tokenId NFT token ID
    /// @return arcadianLevel Arcadian NFT's level
    /// @return arcadianPoints Arcadian NFT's total points
    function getArcadianLevel(
        address _arcadianContractAddress,
        uint256 _tokenId
    )
        external
        view
        virtual
        returns (ArcadiansLevel arcadianLevel, uint256 arcadianPoints)
    {
        Validation.checkForZeroAddress(_arcadianContractAddress);

        address _arcadianTokenBoundAccount = erc6551ManagerContract
            .getTokenBoundAccount(_arcadianContractAddress, _tokenId);

        arcadianPoints = balanceOf(_arcadianTokenBoundAccount);
        arcadianLevel = _getArcadianLevel(arcadianPoints);
    }

    /// @notice Retrieve the Arcadian NFT's level based on the arcadians points
    /// @param _arcadianPoints NFT's arcadian points
    /// @return arcadianLevel Arcadian NFT's level
    function _getArcadianLevel(uint256 _arcadianPoints)
        internal
        pure
        virtual
        returns (ArcadiansLevel arcadianLevel)
    {
        uint256 points = _arcadianPoints / 1e18;
        if (points < 1200) {
            arcadianLevel = ArcadiansLevel.Novice;
        } else if (points >= 1200 && points < 3600) {
            arcadianLevel = ArcadiansLevel.Sparkbearer;
        } else if (points >= 3600 && points < 11400) {
            arcadianLevel = ArcadiansLevel.Shardspeaker;
        } else if (points >= 11400 && points < 39000) {
            arcadianLevel = ArcadiansLevel.Guidestar;
        } else if (points >= 39000) {
            arcadianLevel = ArcadiansLevel.Fatesmith;
        }
    }

    function _beforeTokenTransfer(
        address _from,
        address _to,
        uint256 _points
    ) internal virtual override {
        if (_from != address(0) && _to != address(0)) {
            revert TokenTransferNotAllowed();
        }

        super._beforeTokenTransfer(_from, _to, _points);
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
