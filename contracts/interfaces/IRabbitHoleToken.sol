// SPDX-License-Identifier: BSD-3-Clause-Clear
pragma solidity ^0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {IERC7984} from "openzeppelin-confidential-contracts/contracts/interfaces/IERC7984.sol";
import {externalEuint64, euint64} from "@fhevm/solidity/lib/FHE.sol";

/**
 * @title IRabbitHoleToken
 * @dev RabbitHoleToken hybrid token interface
 */
interface IRabbitHoleToken is IERC20, IERC7984 {
    // Events
    event ConvertedToConfidential(address indexed account, uint256 amount);
    event ConversionRequested(address indexed account, euint64 burntAmount, bytes32 handle);
    event ConversionCompleted(address indexed account, uint64 amount);
    event ConversionCancelled(address indexed account, bytes32 handle);

    // Mode conversion
    function convertToConfidential(uint256 amount) external;

    function prepareConvertToPlain(
        externalEuint64 encryptedAmount,
        bytes calldata inputProof
    ) external returns (euint64 burntAmount, bytes32 handle);

    function finalizeConversion(bytes32 handle, uint64 cleartextAmount, bytes calldata decryptionProof) external;

    function cancelConversion(bytes32 handle) external;

    // Query functions
    function getTotalBalanceHandles(address account) external returns (uint256 plainBalance, bytes32[] memory handles);

    // Management functions
    function mint() external; // Public function, anyone can call, mints 10000 confidential tokens

    function mintTo(address to) external; // Public function, anyone can call

    function burn(uint256 amount) external;
}
