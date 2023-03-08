// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@faircrypto/xen-stake/contracts/XENStake.sol";
import "@faircrypto/xen-stake/contracts/libs/StakeInfo.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

/*
    Sorting in Ethereum
    https://medium.com/bandprotocol/solidity-102-3-maintaining-sorted-list-1edd0a228d83 [*]
    https://stackoverflow.com/questions/64661313/descending-quicksort-in-solidity
    https://gist.github.com/fiveoutofnine/5140b17f6185aacb71fc74d3a315a9da

*/
contract XENKnights {

    using StakeInfo for uint256;
    using Strings for uint256;

    // PUBLIC CONSTANTS
    string public constant AUTHORS = "@MrJackLevin @ackebom @lbelyaev faircrypto.org";
    uint256 public constant SECS_IN_DAY = 3_600 * 24;
    // used as a unique marker for beginning and end of a linked list
    string public constant GUARD = 'guard'; // 0xFF..F, not a valid tokenId

    // common business logic
    uint256 public constant STAKE_TERM_DAYS = 1_000;
    uint256 public constant MAX_WINNERS = 100;

    // PUBLIC MUTABLE STATE
    uint256 public totalPlayers;
    // taproot address => total stake amount
    mapping(string => uint256) public amounts;
    // tokenId =>  taproot address
    mapping(uint256 => string) public wallets;

    // PRIVATE STATE

    // linked sorted list of tokenIds
    // GUARD => X
    // X => Y (Y >= X)
    // Y => ...
    // ... => GUARD
    mapping(string => string) private _linkedList;

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
        _linkedList[GUARD] = GUARD; // initialize the linked list
    }

    // EVENTS

    event Admitted(address indexed user, string taprootAddress, uint256 tokenId, uint256 amount);
    event Replaced(string taprootAddress, uint256 amount);

    // PRIVATE HELPERS

    function _checkIfEligible(uint256 tokenId, string calldata taprootAddress) private view {
        require(msg.sender == tx.origin, 'XenKnights: only EOAs allowed');
        require(block.timestamp > startTs, 'XenKnights: competition not yet started');
        require(block.timestamp < endTs, 'XenKnights: competition already finished');
        require(tokenId > 0, 'XenKnights: illegal tokenId');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        require(
            _compare(string(bytes(taprootAddress)[0:4]), 'b1cp'),
            'XenKnights: illegal taprootAddress signature'
        );
        require(
            // bytes(wallets[tokenId]).length == 0 || _compare(wallets[tokenId], taprootAddress),
            bytes(wallets[tokenId]).length == 0,
            'XenKnights: tokenId already used'
        );
        require(
            IERC721(address(xenStake)).ownerOf(tokenId) == msg.sender,
            'XenKnights: not the tokenId owner'
        );
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

    function _compare(string memory one, string memory two) private pure returns (bool) {
        return sha256(abi.encodePacked(one)) == sha256(abi.encodePacked(two));
    }

    // PUBLIC READ INTERFACE

    // TODO: remove after testing !!!
    function lastIndex() public view returns (string memory) {
        return _linkedList[GUARD];
    }

    // TODO: remove after testing !!!
    function nextIndex(uint256 amount) public view returns (string memory) {
        return _findIndex(amount);
    }

    function indexes(string memory currentIndex, uint256 amount) public view returns (string memory, string memory) {
        return _findIndexes(currentIndex, amount);
    }

    function minAmount() public view returns (uint256) {
        return amounts[_linkedList[GUARD]];
    }

    /**
     * @dev Returns `count` first tokenIds by lowest amount
     */
    function leaderboard(uint256 count)
        external
        view
        returns (string[] memory data)
    {
        uint256 len = count > totalPlayers ? totalPlayers : count;
        data = new string[](len);
        string memory index = _linkedList[GUARD];
        for(uint256 i = 0; i < len; ++i) {
            data[i] = index;
            index = _linkedList[index];
        }
    }

    // PRIVATE HELPERS

    /**
     * @dev Finds and returns list insertion position based on `amount` value
     */
    function _findIndex(uint256 amount)
        private
        view
        returns (string memory candidateIndex)
    {
        candidateIndex = GUARD;
        while (true) {
            if (_verifyIndex(candidateIndex, amount, _linkedList[candidateIndex])) {
                return candidateIndex;
            }
            candidateIndex = _linkedList[candidateIndex];
        }
    }

    function _findIndexes(string memory currentIndex, uint256 amount)
        private
        view
        returns (string memory prevIndex, string memory candidateIndex)
    {
        prevIndex = GUARD;
        candidateIndex = GUARD;
        bool found = false;
        while (true) {
            if (_compare(_linkedList[prevIndex], currentIndex)) {
                found = true;
            }
            if (_verifyIndex(candidateIndex, amount, _linkedList[candidateIndex])) {
                return (prevIndex, candidateIndex);
            }
            if (!found) prevIndex = candidateIndex;
            candidateIndex = _linkedList[candidateIndex];
        }
    }

    /**
     * @dev Verifies insertion position based on `amount` value
     */
    function _verifyIndex(string memory prevTokenId, uint256 amount, string memory nextTokenId)
        private
        view
        returns (bool)
    {
        return (_compare(prevTokenId, GUARD) || amounts[prevTokenId] < amount) &&
        (_compare(nextTokenId, GUARD) || amount <= amounts[nextTokenId]);
    }

    // PUBLIC TX INTERFACE

    // TODO: remove after testing !!!
    function enterCompetition0(uint256 tokenId, uint256 newAmount) external {
        string memory taprootAddress = tokenId.toString();

        uint256 existingAmount = amounts[taprootAddress];
        uint256 totalAmount = existingAmount + newAmount;

        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || totalAmount > minAmount(), 'XenKnights: amount less than minimum');
        string memory newIndex;
        string memory prevIndex;

        if (existingAmount == 0) {
            // new stake
            wallets[tokenId] = taprootAddress;
            newIndex = _findIndex(totalAmount);
            _linkedList[taprootAddress] = _linkedList[newIndex];
            _linkedList[newIndex] = taprootAddress;
            if (totalPlayers < MAX_WINNERS) {
                // room for one more => increase count
                totalPlayers++;
            } else {
                // at capacity => drop the first one (the lowest)
                string memory first = _linkedList[GUARD];
                string memory second = _linkedList[first];
                delete _linkedList[first];
                uint256 oldAmount = amounts[first];
                delete amounts[first];
                _linkedList[GUARD] = second;
                emit Replaced(first, oldAmount);
            }
        } else {
            // existing stake: possibly move position inside the list
            (prevIndex, newIndex) = _findIndexes(taprootAddress, totalAmount);
            if (!_compare(newIndex, taprootAddress)) {
                _linkedList[prevIndex] = _linkedList[taprootAddress];
                _linkedList[taprootAddress] = _linkedList[newIndex];
                _linkedList[newIndex] = taprootAddress;
            }
        }

        amounts[taprootAddress] = totalAmount;
    }

    /**
     * @dev Attempt to enter competition based on eligible XEN Stake identified by `tokenId`
     * @dev Additionally, `taprootAddress` is supplied and stored along with tokenId
     */
    function enterCompetition(uint256 tokenId, string calldata taprootAddress) external {
        _checkIfEligible(tokenId, taprootAddress);

        uint256 newAmount = _checkStakeGetAmount(tokenId);
        uint256 existingAmount = amounts[taprootAddress];
        uint256 totalAmount = existingAmount + newAmount;

        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || totalAmount > minAmount(), 'XenKnights: amount less than minimum');
        string memory newIndex;
        string memory prevIndex;

        if (existingAmount == 0) {
            // new stake
            wallets[tokenId] = taprootAddress;
            newIndex = _findIndex(totalAmount);
            _linkedList[taprootAddress] = _linkedList[newIndex];
            _linkedList[newIndex] = taprootAddress;
            if (totalPlayers < MAX_WINNERS) {
                // room for one more => increase count
                totalPlayers++;
            } else {
                // at capacity => drop the first one (the lowest)
                string memory first = _linkedList[GUARD];
                string memory second = _linkedList[first];
                delete _linkedList[first];
                uint256 oldAmount = amounts[first];
                delete amounts[first];
                _linkedList[GUARD] = second;
                emit Replaced(first, oldAmount);
            }
        } else {
            // existing stake: possibly move position inside the list
            (prevIndex, newIndex) = _findIndexes(taprootAddress, totalAmount);
            if (!_compare(newIndex, taprootAddress)) {
                _linkedList[prevIndex] = _linkedList[taprootAddress];
                _linkedList[taprootAddress] = _linkedList[newIndex];
                _linkedList[newIndex] = taprootAddress;
            }
        }

        amounts[taprootAddress] = totalAmount;
        emit Admitted(msg.sender, taprootAddress, tokenId, totalAmount);
    }
}
