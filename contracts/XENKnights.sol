// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@faircrypto/xen-stake/contracts/XENStake.sol";
import "@faircrypto/xen-stake/contracts/libs/StakeInfo.sol";

contract XENKnights {

    using StakeInfo for uint256;
    using Array for uint256[];

    // PUBLIC CONSTANTS
    string public constant AUTHORS = "@MrJackLevin @ackebom @lbelyaev faircrypto.org";
    uint256 public constant SECS_IN_DAY = 3_600 * 24;

    // common business logic
    uint256 public constant STAKE_TERM_DAYS = 1_000;

    // PUBLIC MUTABLE STATE
    uint256[] public tokenIds;
    // tokenId => stake amount
    mapping(uint256 => uint256) public amounts;
    // tokenId => taproot wallet address
    mapping(uint256 => string) public wallets;

    // PUBLIC IMMUTABLE STATE
    uint256 public immutable startTs;
    uint256 public immutable endTs;

    // pointer to XEN Stake contract
    XENStake public immutable xenStake;

    // CONSTRUCTOR

    constructor(address xenStake_, uint256 startTs_, uint256 durationDays_) {
        require(xenStake_ != address(0));
        require(startTs_ > block.timestamp);
        require(durationDays_ > 0);
        xenStake = XENStake(xenStake_);
        startTs = startTs_;
        endTs = startTs_ + durationDays_ * SECS_IN_DAY;
    }

    // EVENTS

    event Admitted(address indexed user, uint256 tokenId, uint256 amount, string taprootAddress);

    // PRIVATE HELPERS

    function _checkIfEligible(uint256 tokenId, string calldata taprootAddress) private view {
        require(block.timestamp > startTs, 'XenKnights: competition not yet started');
        require(block.timestamp < endTs, 'XenKnights: competition already finished');
        require(tokenId > 0, 'XenKnights: illegal tokenId');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        require(bytes(taprootAddress)[0] == bytes('b1cp')[0], 'XenKnights: illegal taprootAddress signature');
        require(bytes(wallets[tokenId]).length == 0, 'XenKnights: tokenId already in play');
        require(IERC721(address(xenStake)).ownerOf(tokenId) == msg.sender, 'XenKnights: not the tokenId owner');
    }

    function _checkStakeGetAmount(uint256 tokenId) private view returns (uint256) {
        uint256 stakeInfo = xenStake.stakeInfo(tokenId);
        require(stakeInfo > 0, 'XenKnights: no XEN Stake found for tokenId');
        (uint256 term, uint256 maturityTs, uint256 amount, , , ) = stakeInfo.decodeStakeInfo();
        require(term == STAKE_TERM_DAYS, 'XenKnights: stake term incorrect');
        uint256 stakeTs = maturityTs - term * SECS_IN_DAY;
        require(stakeTs > startTs, 'XenKnights: stake made before startTs');
        return amount;
    }

    // PUBLIC READ INTERFACE

    function totalPlaying() external view returns (uint256) {
        return tokenIds.length;
    }

    function quickSort(uint256[] memory arr, uint256[] memory arr2) public pure returns (uint256[] memory sorted) {
        if (arr.length > 1) {
            quickPart(arr, arr2, 0, int(arr.length - 1));
        }
        sorted = arr2;
    }

    function quickPart(uint256[] memory arr, uint256[] memory arr2, int left, int right) internal pure {
        int i = left;
        int j = right;
        if (i == j) return;
        uint pivot = arr[uint(left + (right - left) / 2)];
        while (i <= j) {
            while (arr[uint(i)] > pivot) i++;
            while (pivot > arr[uint(j)]) j--;
            if (i <= j) {
                (arr[uint(i)], arr[uint(j)]) = (arr[uint(j)], arr[uint(i)]);
                (arr2[uint(i)], arr2[uint(j)]) = (arr2[uint(j)], arr2[uint(i)]);
                i++;
                j--;
            }
        }
        if (left < j)
            quickPart(arr, arr2, left, j);
        if (i < right)
            quickPart(arr, arr2, i, right);
    }

    // TODO: remove after testing !!!
    function leaderboard0(uint256[] memory arr, uint256[] memory arr2) external view returns (uint256[] memory data) {
        uint256[] memory toks = new uint256[](arr.length);
        for (uint i = 0; i < arr.length; i++) {
            toks[i] = arr[i];
        }
        quickSort(arr, arr2);
        data = new uint256[](100);
        for (uint j = 0; j < 100; j++) {
            data[j] = arr2[j];
        }
    }

    function leaderboard() external view returns (uint256[] memory data) {
        uint256[] memory amts = new uint256[](tokenIds.length);
        data = new uint256[](tokenIds.length);
        for (uint i = 0; i < tokenIds.length; i++) {
            amts[i] = amounts[tokenIds[i]];
            data[i] = tokenIds[i];
        }
        quickSort(amts, data);
    }

    // PUBLIC TX INTERFACE

    // TODO: remove after testing !!!
    function enterCompetition0(uint256 tokenId, uint256 amount) external {
        amounts[tokenId] = amount;
        tokenIds.push(tokenId);
    }

    function enterCompetition(uint256 tokenId, string calldata taprootAddress) external {
        _checkIfEligible(tokenId, taprootAddress);
        uint256 amount = _checkStakeGetAmount(tokenId);

        amounts[tokenId] = amount;
        wallets[tokenId] = taprootAddress;
        tokenIds.push(tokenId);

        emit Admitted(msg.sender, tokenId, amount, taprootAddress);
    }

}
