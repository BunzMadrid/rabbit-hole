// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {Ownable2Step, Ownable} from "@openzeppelin/contracts/access/Ownable2Step.sol";
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";
import {FHE, externalEuint64, euint64, ebool} from "@fhevm/solidity/lib/FHE.sol";
import {ZamaEthereumConfig} from "@fhevm/solidity/config/ZamaConfig.sol";
import {IERC7984} from "openzeppelin-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {ERC7984} from "openzeppelin-confidential-contracts/contracts/token/ERC7984/ERC7984.sol";

/**
 * @title RabbitHoleToken
 * @dev Hybrid token contract supporting dual-mode ERC20 and ERC7984 with free conversion between modes
 */
contract RabbitHoleToken is ZamaEthereumConfig, IERC20, IERC20Metadata, ERC7984, Ownable2Step {
    // ERC20 plaintext balance
    mapping(address => uint256) private _plainBalances;

    // ERC20 allowances
    mapping(address => mapping(address => uint256)) private _allowances;

    // Total supply (always in plaintext for tracking)
    uint256 private _totalSupply;

    // Token information
    string private _name;
    string private _symbol;
    uint8 private constant _decimals = 6;

    // Conversion request counter
    uint256 private _conversionCounter;

    // Conversion request struct
    struct ConversionRequest {
        address requester;
        euint64 burntAmount;
        bytes32 handle;
        bool isPending;
        uint256 timestamp;
    }

    // Conversion request mapping: conversionId => ConversionRequest
    mapping(uint256 => ConversionRequest) private _conversionRequests;
    // User's conversion request list
    mapping(address => uint256[]) private _userConversions;
    // Handle to conversionId mapping (for finalizeConversion)
    mapping(bytes32 => uint256) private _handleToConversionId;

    // Events
    event ConvertedToConfidential(address indexed account, uint256 amount);
    event ConversionRequested(
        uint256 indexed conversionId,
        address indexed account,
        euint64 burntAmount,
        bytes32 handle
    );
    event ConversionCompleted(uint256 indexed conversionId, address indexed account, uint64 amount);
    event ConversionCancelled(uint256 indexed conversionId, address indexed account, bytes32 handle);

    constructor(
        address owner,
        uint256 initialSupply,
        string memory name_,
        string memory symbol_,
        string memory tokenURI_
    ) ERC7984(name_, symbol_, tokenURI_) Ownable(owner) {
        _name = name_;
        _symbol = symbol_;
        _totalSupply = initialSupply;

        // Allocate initial supply as plaintext balance to owner
        if (initialSupply > 0) {
            _plainBalances[owner] = initialSupply;
            emit Transfer(address(0), owner, initialSupply);
        }
    }

    // ==================== ERC20 Standard Interface Implementation ====================

    function name() public view override(IERC20Metadata, ERC7984) returns (string memory) {
        return _name;
    }

    function symbol() public view override(IERC20Metadata, ERC7984) returns (string memory) {
        return _symbol;
    }

    function decimals() public pure override(IERC20Metadata, ERC7984) returns (uint8) {
        return _decimals;
    }

    function totalSupply() public view override returns (uint256) {
        return _totalSupply;
    }

    function balanceOf(address account) public view override returns (uint256) {
        return _plainBalances[account];
    }

    function transfer(address to, uint256 amount) public override returns (bool) {
        _transferPlain(msg.sender, to, amount);
        return true;
    }

    function allowance(address owner, address spender) public view override returns (uint256) {
        return _allowances[owner][spender];
    }

    function approve(address spender, uint256 amount) public override returns (bool) {
        _approvePlain(msg.sender, spender, amount);
        return true;
    }

    function transferFrom(address from, address to, uint256 amount) public override returns (bool) {
        uint256 currentAllowance = _allowances[from][msg.sender];
        if (currentAllowance != type(uint256).max) {
            require(currentAllowance >= amount, "RabbitHole: insufficient allowance");
            unchecked {
                _approvePlain(from, msg.sender, currentAllowance - amount);
            }
        }
        _transferPlain(from, to, amount);
        return true;
    }

    // ==================== Mode Conversion Functions ====================

    /**
     * @dev Convert plaintext balance to encrypted balance
     * @param amount Amount to convert
     */
    function convertToConfidential(uint256 amount) public {
        require(amount > 0, "RabbitHole: amount must be greater than zero");
        require(_plainBalances[msg.sender] >= amount, "RabbitHole: insufficient plain balance");

        // Deduct plaintext balance
        _plainBalances[msg.sender] -= amount;

        // Increase encrypted balance
        euint64 encryptedAmount = FHE.asEuint64(uint64(amount));
        _mint(msg.sender, encryptedAmount);

        emit ConvertedToConfidential(msg.sender, amount);
        emit Transfer(msg.sender, address(0), amount); // ERC20 event: indicates plaintext token "burn"
    }

    /**
     * @dev Step 1: Prepare to convert encrypted tokens to plaintext tokens
     * @param encryptedAmountInput Encrypted amount input to convert
     * @param inputProof Input proof
     * @return conversionId Unique ID of the conversion request
     * @return handle Handle of the conversion request (for off-chain decryption)
     */
    function prepareConvertToPlain(
        bytes calldata encryptedAmountInput,
        bytes calldata inputProof
    ) public returns (uint256 conversionId, bytes32 handle) {
        // Process encrypted input using FHE.fromExternal
        externalEuint64 externalAmount = externalEuint64.wrap(bytes32(encryptedAmountInput));
        euint64 encryptedAmount = FHE.fromExternal(externalAmount, inputProof);

        // Immediately burn encrypted balance (critical: prevents double-spending)
        euint64 burntAmount = _burn(msg.sender, encryptedAmount);

        // Prepare public decryption (v0.9 mode)
        FHE.makePubliclyDecryptable(burntAmount);

        // Return handle for off-chain decryption
        handle = FHE.toBytes32(burntAmount);

        // Generate new conversionId
        conversionId = ++_conversionCounter;

        // Record conversion request
        _conversionRequests[conversionId] = ConversionRequest({
            requester: msg.sender,
            burntAmount: burntAmount,
            handle: handle,
            isPending: true,
            timestamp: block.timestamp
        });

        // Record user's conversion request
        _userConversions[msg.sender].push(conversionId);

        // Record handle to conversionId mapping
        _handleToConversionId[handle] = conversionId;

        emit ConversionRequested(conversionId, msg.sender, burntAmount, handle);
    }

    /**
     * @dev Step 2: Complete encrypted-to-plaintext conversion (called by user after off-chain decryption)
     * @param handle Request handle (returned from prepareConvertToPlain)
     * @param cleartextAmount Decrypted plaintext amount (obtained from publicDecrypt)
     * @param decryptionProof Decryption proof (obtained from publicDecrypt)
     */
    function finalizeConversion(bytes32 handle, uint64 cleartextAmount, bytes calldata decryptionProof) public {
        uint256 conversionId = _handleToConversionId[handle];
        require(conversionId != 0, "RabbitHole: invalid handle");

        ConversionRequest storage request = _conversionRequests[conversionId];
        require(request.requester == msg.sender, "RabbitHole: unauthorized");
        require(request.isPending, "RabbitHole: already finalized");

        // Mark as completed
        request.isPending = false;

        // Delete handle mapping
        delete _handleToConversionId[handle];

        // Verify decryption result
        bytes32[] memory handles = new bytes32[](1);
        handles[0] = handle;
        bytes memory cleartexts = abi.encode(cleartextAmount);
        FHE.checkSignatures(handles, cleartexts, decryptionProof);

        // Increase plaintext balance
        if (cleartextAmount > 0) {
            _plainBalances[msg.sender] += cleartextAmount;
            emit ConversionCompleted(conversionId, msg.sender, cleartextAmount);
            emit Transfer(address(0), msg.sender, cleartextAmount);
        }
    }

    /**
     * @dev Cancel conversion request and refund encrypted tokens (if decryption fails or user doesn't want to continue)
     * @param conversionId ID of the conversion request
     */
    function cancelConversion(uint256 conversionId) public {
        ConversionRequest storage request = _conversionRequests[conversionId];
        require(request.requester == msg.sender, "RabbitHole: unauthorized");
        require(request.isPending, "RabbitHole: already finalized");

        euint64 burntAmount = request.burntAmount;
        require(FHE.isInitialized(burntAmount), "RabbitHole: invalid amount");

        // Mark as cancelled
        request.isPending = false;

        // Delete handle mapping
        delete _handleToConversionId[request.handle];

        // Refund encrypted tokens
        _mint(msg.sender, burntAmount);

        emit ConversionCancelled(conversionId, msg.sender, request.handle);
    }

    /**
     * @dev Get all conversion request IDs for a user
     * @param account User address
     * @return Array of conversion request IDs
     */
    function getUserConversions(address account) public view returns (uint256[] memory) {
        return _userConversions[account];
    }

    /**
     * @dev Get details of a specific conversion request
     * @param conversionId Conversion request ID
     * @return requester Requester address
     * @return handle Conversion handle
     * @return isPending Whether it's pending
     * @return timestamp Creation time
     */
    function getConversionInfo(
        uint256 conversionId
    ) public view returns (address requester, bytes32 handle, bool isPending, uint256 timestamp) {
        ConversionRequest memory request = _conversionRequests[conversionId];
        return (request.requester, request.handle, request.isPending, request.timestamp);
    }

    /**
     * @dev Get decryption handles for a conversion request (for frontend retry decryption)
     * @param conversionId Conversion request ID
     * @return handles Array of handles containing data to be decrypted
     */
    function getConversionHandles(uint256 conversionId) public view returns (bytes32[] memory handles) {
        ConversionRequest memory request = _conversionRequests[conversionId];
        require(request.requester != address(0), "RabbitHole: invalid conversion");
        require(request.isPending, "RabbitHole: not pending");

        // Return handle for frontend decryption
        handles = new bytes32[](1);
        handles[0] = request.handle;
        return handles;
    }

    /**
     * @dev Get user's pending conversion requests
     * @param account User address
     * @return pendingIds Array of pending conversion request IDs
     */
    function getUserPendingConversions(address account) public view returns (uint256[] memory pendingIds) {
        uint256[] memory allIds = _userConversions[account];
        uint256 pendingCount = 0;

        // First calculate pending count
        for (uint256 i = 0; i < allIds.length; i++) {
            if (_conversionRequests[allIds[i]].isPending) {
                pendingCount++;
            }
        }

        // Create result array
        pendingIds = new uint256[](pendingCount);
        uint256 index = 0;

        // Fill pending IDs
        for (uint256 i = 0; i < allIds.length; i++) {
            if (_conversionRequests[allIds[i]].isPending) {
                pendingIds[index++] = allIds[i];
            }
        }

        return pendingIds;
    }

    // ==================== Query Functions ====================

    /**
     * @dev Get account's total balance (plaintext + encrypted balance requiring decryption)
     * Note: Returns handles that need off-chain decryption
     */
    function getTotalBalanceHandles(address account) public returns (uint256 plainBalance, bytes32[] memory handles) {
        plainBalance = _plainBalances[account];

        euint64 encryptedBalance = confidentialBalanceOf(account);
        if (FHE.isInitialized(encryptedBalance)) {
            // Ensure contract has access permission
            FHE.allowThis(encryptedBalance);
            FHE.makePubliclyDecryptable(encryptedBalance);
            handles = new bytes32[](1);
            handles[0] = FHE.toBytes32(encryptedBalance);
        } else {
            handles = new bytes32[](0);
        }
    }

    // ==================== Management Functions ====================

    /**
     * @dev Mint confidential tokens (public function, anyone can call)
     * Mints 10000 confidential tokens to the caller each time
     */
    function mint() public {
        // Use smaller units for uint64 compatibility
        // 10000 * 10^6 = 10,000,000,000 (about 10 billion, within uint64 range)
        uint256 amount = 10000 * 10 ** 6; // 10000 tokens (6 decimals)

        _totalSupply += amount;

        // Mint as confidential tokens
        euint64 encryptedAmount = FHE.asEuint64(uint64(amount));
        _mint(msg.sender, encryptedAmount);

        emit Transfer(address(0), msg.sender, amount);
    }

    /**
     * @dev Mint confidential tokens to a specific address (public function, anyone can call)
     * @param to Recipient address
     */
    function mintTo(address to) public {
        require(to != address(0), "RabbitHole: mint to zero address");

        // Use smaller units for uint64 compatibility
        uint256 amount = 10000 * 10 ** 6; // 10000 tokens (6 decimals)

        _totalSupply += amount;

        // Mint as confidential tokens
        euint64 encryptedAmount = FHE.asEuint64(uint64(amount));
        _mint(to, encryptedAmount);

        emit Transfer(address(0), to, amount);
    }

    /**
     * @dev Burn tokens (from plaintext balance)
     * @param amount Amount to burn
     */
    function burn(uint256 amount) public {
        require(_plainBalances[msg.sender] >= amount, "RabbitHole: insufficient balance");

        _plainBalances[msg.sender] -= amount;
        _totalSupply -= amount;

        emit Transfer(msg.sender, address(0), amount);
    }

    // ==================== Internal Functions ====================

    function _transferPlain(address from, address to, uint256 amount) private {
        require(from != address(0), "RabbitHole: transfer from zero address");
        require(to != address(0), "RabbitHole: transfer to zero address");
        require(_plainBalances[from] >= amount, "RabbitHole: insufficient balance");

        _plainBalances[from] -= amount;
        _plainBalances[to] += amount;

        emit Transfer(from, to, amount);
    }

    function _approvePlain(address owner, address spender, uint256 amount) private {
        require(owner != address(0), "RabbitHole: approve from zero address");
        require(spender != address(0), "RabbitHole: approve to zero address");

        _allowances[owner][spender] = amount;
        emit Approval(owner, spender, amount);
    }

    // ==================== Compatibility Overrides ====================

    /**
     * @dev Check if interface is supported
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
            interfaceId == type(IERC20).interfaceId ||
            interfaceId == type(IERC20Metadata).interfaceId ||
            interfaceId == type(IERC7984).interfaceId ||
            super.supportsInterface(interfaceId);
    }
}
