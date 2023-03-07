// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@faircrypto/xen-stake/contracts/XENStake.sol";
import "@faircrypto/xen-stake/contracts/libs/StakeInfo.sol";

/*
    Sorting in Ethereum
    https://medium.com/bandprotocol/solidity-102-3-maintaining-sorted-list-1edd0a228d83 [*]
    https://stackoverflow.com/questions/64661313/descending-quicksort-in-solidity
    https://gist.github.com/fiveoutofnine/5140b17f6185aacb71fc74d3a315a9da

*/
contract XENKnights {

    using StakeInfo for uint256;

    // PUBLIC CONSTANTS
    string public constant AUTHORS = "@MrJackLevin @ackebom @lbelyaev faircrypto.org";
    uint256 public constant SECS_IN_DAY = 3_600 * 24;
    // used as a unique marker for beginning and end of a linked list
    uint256 public constant GUARD = 2 ** 256 -1; // 0xFF..F, not a valid tokenId

    // common business logic
    uint256 public constant STAKE_TERM_DAYS = 1_000;
    uint256 public constant MAX_WINNERS = 100;
    // TODO: do we need that, beyond natural limit of XEN stake ???
    uint256 public constant MIN_STAKE_AMOUNT = 1;

    // PUBLIC MUTABLE STATE
    uint256 public totalPlayers;
    // tokenId => stake amount
    mapping(uint256 => uint256) public amounts;
    // tokenId => taproot wallet address
    mapping(uint256 => string) public wallets;

    // PRIVATE STATE

    // linked sorted list of tokenIds
    // GUARD => X
    // X => Y (Y >= X)
    // Y => ...
    // ... => GUARD
    mapping(uint256 => uint256) private _tokenIds;

    // PUBLIC IMMUTABLE STATE

    uint256 public immutable startTs;
    uint256 public immutable endTs;
    uint256 public immutable admissionPrice;

    // pointer to XEN Stake contract
    XENStake public immutable xenStake;

    // CONSTRUCTOR

    constructor(address xenStake_, uint256 startTs_, uint256 durationDays_, uint256 admissionPrice_) {
        require(xenStake_ != address(0));
        require(startTs_ > block.timestamp);
        require(durationDays_ > 0);
        // TODO: reinstate for production !!!
        // require(admissionPrice_ > 0);
        xenStake = XENStake(xenStake_);
        startTs = startTs_;
        endTs = startTs_ + durationDays_ * SECS_IN_DAY;
        admissionPrice = admissionPrice_;
        _tokenIds[GUARD] = GUARD; // initialize the linked list
    }

    // EVENTS

    event Admitted(address indexed user, uint256 tokenId, uint256 amount, string taprootAddress);
    event Replaced(uint256 tokenId, uint256 amount);

    // PRIVATE HELPERS

    function _checkIfEligible(uint256 tokenId, string calldata taprootAddress) private view {
        require(msg.value > admissionPrice, 'XenKnights: value below min');
        require(block.timestamp > startTs, 'XenKnights: competition not yet started');
        require(block.timestamp < endTs, 'XenKnights: competition already finished');
        require(tokenId > 0, 'XenKnights: illegal tokenId');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        // TODO: optimize !!!
        require(bytes(taprootAddress)[0] == bytes('b1cp')[0], 'XenKnights: illegal taprootAddress signature');
        require(bytes(taprootAddress)[1] == bytes('b1cp')[1], 'XenKnights: illegal taprootAddress signature');
        require(bytes(taprootAddress)[2] == bytes('b1cp')[2], 'XenKnights: illegal taprootAddress signature');
        require(bytes(taprootAddress)[3] == bytes('b1cp')[3], 'XenKnights: illegal taprootAddress signature');
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

    /*
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
    */

    /*
    function sort(uint256[] calldata _input) external pure returns (uint256[] memory) {
        _buildMaxHeap(_input);
        uint256 length = _input.length;
        unchecked {
            for (uint256 i = length - 1; i > 0; --i) {
                _swap(_input, 0, i);
                _heapify(_input, i, 0);
            }
        }
        return _input;
    }

    function _buildMaxHeap(uint256[] memory _input) internal pure {
        uint256 length = _input.length;
        unchecked {
            for (uint256 i = (length >> 1) - 1; i > 0; --i) {
                _heapify(_input, length, i);
            }
            _heapify(_input, length, 0);
        }
    }

    function _heapify(uint256[] memory _input, uint256 _n, uint256 _i) internal pure {
        unchecked {
            uint256 max = _i;
            uint256 left = (_i << 1) + 1;
            uint256 right = (_i << 1) + 2;

            if (left < _n && _input[left] > _input[max]) {
                max = left;
            }

            if (right < _n && _input[right] > _input[max]) {
                max = right;
            }

            if (max != _i) {
                _swap(_input, _i, max);
                _heapify(_input, _n, max);
            }
        }
    }

    function _swap(uint256[] memory _input, uint256 _i, uint256 _j) internal pure {
        (_input[_i], _input[_j]) = (_input[_j], _input[_i]);
    }
    */

    /*
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
    */

    // TODO: remove after testing !!!
    function lastIndex() public view returns (uint256) {
        return _tokenIds[GUARD];
    }

    // TODO: remove after testing !!!
    function nextIndex(uint256 amount) public view returns (uint256) {
        return _findIndex(amount);
    }

    function minAmount() public view returns (uint256) {
        return amounts[_tokenIds[GUARD]];
    }

    /**
     * @dev Returns `count` first tokenIds by lowest amount
     */
    function leaderboard(uint256 count)
        external
        view
        returns (uint256[] memory data)
    {
        uint256 len = count > totalPlayers ? totalPlayers : count;
        data = new uint256[](len);
        uint256 index = _tokenIds[GUARD];
        for(uint256 i = 0; i < len; ++i) {
            data[i] = index;
            index = _tokenIds[index];
        }
    }

    // PRIVATE HELPERS

    /**
     * @dev Finds and returns list insertion position based on `amount` value
     */
    function _findIndex(uint256 amount)
        private
        view
        returns (uint256 candidateTokenId)
    {
        candidateTokenId = GUARD;
        while (true) {
            if (_verifyIndex(candidateTokenId, amount, _tokenIds[candidateTokenId])) {
                return candidateTokenId;
            }
            candidateTokenId = _tokenIds[candidateTokenId];
        }
    }

    /**
     * @dev Verifies insertion position based on `amount` value
     */
    function _verifyIndex(uint256 prevTokenId, uint256 amount, uint256 nextTokenId)
        private
        view
        returns (bool)
    {
        return (prevTokenId == GUARD || amounts[prevTokenId] < amount) &&
        (nextTokenId == GUARD || amount <= amounts[nextTokenId]);
    }

    // PUBLIC TX INTERFACE

    // TODO: remove after testing !!!
    function enterCompetition0(uint256 tokenId, uint256 amount) external {
        require(totalPlayers < MAX_WINNERS || amount > amounts[lastIndex()], 'XenKnights: below the threshold');

        uint256 index = _findIndex(amount);
        amounts[tokenId] = amount;
        _tokenIds[tokenId] = _tokenIds[index];
        _tokenIds[index] = tokenId;
        if (totalPlayers < MAX_WINNERS) {
            // room for one more
            totalPlayers++;
        } else {
            // at capacity - add new and drop the first one
            uint256 first = _tokenIds[GUARD];
            uint256 second = _tokenIds[first];
            delete _tokenIds[first];
            _tokenIds[GUARD] = second;
        }
    }

    /**
     * @dev Attempt to enter competition based on eligible XEN Stake identified by `tokenId`
     * @dev Additionally, `taprootAddress` is supplied and stored along with tokenId
     */
    function enterCompetition(uint256 tokenId, string calldata taprootAddress) payable external {
        _checkIfEligible(tokenId, taprootAddress);
        uint256 amount = _checkStakeGetAmount(tokenId);
        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || amount > amounts[lastIndex()], 'XenKnights: below the threshold');

        wallets[tokenId] = taprootAddress;
        uint256 index = _findIndex(amount);
        amounts[tokenId] = amount;
        _tokenIds[tokenId] = _tokenIds[index];
        _tokenIds[index] = tokenId;
        if (totalPlayers < MAX_WINNERS) {
            // room for one more => increase count
            totalPlayers++;
        } else {
            // at capacity => drop the first one (the lowest)
            uint256 first = _tokenIds[GUARD];
            uint256 second = _tokenIds[first];
            delete _tokenIds[first];
            _tokenIds[GUARD] = second;
            emit Replaced(first, amounts[first]);
        }

        emit Admitted(msg.sender, tokenId, amount, taprootAddress);
    }
}
