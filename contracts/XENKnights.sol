// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@faircrypto/xen-crypto/contracts/XENCrypto.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "./libs/Strings.sol";

/*
    Sorting in Ethereum
    https://medium.com/bandprotocol/solidity-102-3-maintaining-sorted-list-1edd0a228d83 [*]
    https://stackoverflow.com/questions/64661313/descending-quicksort-in-solidity
    https://gist.github.com/fiveoutofnine/5140b17f6185aacb71fc74d3a315a9da

*/
contract XENKnights {

    using Strings for uint256;

    // PUBLIC CONSTANTS
    string public constant AUTHORS = "@MrJackLevin @ackebom @lbelyaev faircrypto.org";
    uint256 public constant SECS_IN_DAY = 3_600 * 24;
    // used as a unique marker for beginning and end of a linked list
    bytes32 public constant GUARD = keccak256(bytes('guard'));

    // common business logic
    uint256 public constant MAX_WINNERS = 100;

    // PUBLIC MUTABLE STATE
    uint256 public totalPlayers;
    bool public burned;
    // taproot address => total bid amount
    mapping(bytes32 => uint256) public amounts;
    // user address => taproot address => total bid amount
    mapping(address => mapping(bytes32 => uint256)) public userAmounts;

    // PRIVATE STATE

    // linked sorted list of taproot addresses (primary keys)
    //      GUARD => ...
    //      ... => X
    //      X => Y (amounts[Y] >= amounts[X])
    //      Y => ...
    //      ... => GUARD
    mapping(bytes32 => bytes32) private _linkedList;

    // PUBLIC IMMUTABLE STATE

    uint256 public immutable startTs;
    uint256 public immutable endTs;
    // pointer to XEN Stake contract
    IERC20 public immutable xenCrypto;

    // CONSTRUCTOR

    constructor(address xenCrypto_, uint256 startTs_, uint256 durationDays_) {
        require(xenCrypto_ != address(0));
        require(startTs_ >= block.timestamp);
        require(durationDays_ > 0);
        xenCrypto = IERC20(xenCrypto_);
        startTs = startTs_;
        endTs = startTs_ + durationDays_ * SECS_IN_DAY;
        _linkedList[GUARD] = GUARD; // initialize the linked list
    }

    // EVENTS

    event Admitted(address indexed user, string taprootAddress, uint256 amount, uint256 totalAmount);
    event Replaced(string taprootAddress, uint256 amount);
    event Withdrawn(address indexed user, string taprootAddress, uint256 amount);
    event Burned(uint256 amount);

    // PRIVATE HELPERS

    function _canEnter(uint256 amount, string calldata taprootAddress) private view {
        require(msg.sender == tx.origin, 'XenKnights: only EOAs allowed');
        require(block.timestamp > startTs, 'XenKnights: competition not yet started');
        require(block.timestamp < endTs, 'XenKnights: competition already finished');
        require(amount > 0, 'XenKnights: illegal amount');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        require(
            _compareStr(string(bytes(taprootAddress)[0:4]), 'bc1p'),
            'XenKnights: illegal taprootAddress signature'
        );
    }

    function _canWithdraw(string calldata taprootAddress, bytes32 hash) private view {
        require(msg.sender == tx.origin, 'XenKnights: only EOAs allowed');
        require(block.timestamp > endTs, 'XenKnights: competition not yet finished');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        require(
            _compareStr(string(bytes(taprootAddress)[0:4]), 'bc1p'),
            'XenKnights: illegal taprootAddress signature'
        );
        require(amounts[hash] == 0, 'XenKnights: winner cannot withdraw');
        require(userAmounts[msg.sender][hash] > 0, 'XenKnights: nothing to withdraw');
    }

    function _canBurn() private view {
        require(block.timestamp > endTs, 'XenKnights: competition not yet finished');
        require(totalPlayers > 0 && xenCrypto.balanceOf(address(this)) > 0, 'XenKnights: already burned');
    }

    function _compareStr(string memory one, string memory two) private pure returns (bool) {
        return sha256(abi.encodePacked(one)) == sha256(abi.encodePacked(two));
    }

    function _compare(bytes32 one, bytes32 two) private pure returns (bool) {
        //return sha256(abi.encodePacked(one)) == sha256(abi.encodePacked(two));
        return one == two;
    }

    // PUBLIC READ INTERFACE

    // TODO: remove after testing !!!
    function lastIndex() public view returns (bytes32) {
        return _linkedList[GUARD];
    }

    // TODO: remove after testing !!!
    function nextIndex(uint256 amount) public view returns (bytes32) {
        return _findIndex(amount);
    }

    function indexes(bytes32 currentIndex, uint256 amount) public view returns (bytes32, bytes32) {
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
        returns (bytes32[] memory data)
    {
        uint256 len = count > totalPlayers ? totalPlayers : count;
        data = new bytes32[](len);
        bytes32 index = _linkedList[GUARD];
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
        returns (bytes32 candidateIndex)
    {
        candidateIndex = GUARD;
        while (true) {
            if (_verifyIndex(candidateIndex, amount, _linkedList[candidateIndex])) {
                return candidateIndex;
            }
            candidateIndex = _linkedList[candidateIndex];
        }
    }

    function _findIndexes(bytes32 currentIndex, uint256 amount)
        private
        view
        returns (bytes32 prevIndex, bytes32 candidateIndex)
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
    function _verifyIndex(bytes32 prevTokenId, uint256 amount, bytes32 nextTokenId)
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
        bytes32 taprootAddress = keccak256(abi.encodePacked(tokenId));

        uint256 existingAmount = amounts[taprootAddress];
        uint256 totalAmount = existingAmount + newAmount;

        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || totalAmount > minAmount(), 'XenKnights: amount less than minimum');
        bytes32 newIndex;
        bytes32 prevIndex;

        if (existingAmount == 0) {
            // new stake
            newIndex = _findIndex(totalAmount);
            _linkedList[taprootAddress] = _linkedList[newIndex];
            _linkedList[newIndex] = taprootAddress;
            if (totalPlayers < MAX_WINNERS) {
                // room for one more => increase count
                totalPlayers++;
            } else {
                // at capacity => drop the first one (the lowest)
                bytes32 first = _linkedList[GUARD];
                bytes32 second = _linkedList[first];
                delete _linkedList[first];
                uint256 oldAmount = amounts[first];
                delete amounts[first];
                _linkedList[GUARD] = second;
                // emit Replaced(first, oldAmount);
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
    function enterCompetition(uint256 newAmount, string calldata taprootAddress_) external {
        _canEnter(newAmount, taprootAddress_);

        require(xenCrypto.transferFrom(msg.sender, address(this), newAmount), 'XenKnights: could not transfer XEN');

        bytes32 taprootAddress = keccak256(bytes(taprootAddress_));
        uint256 existingAmount = amounts[taprootAddress];
        uint256 totalAmount = existingAmount + newAmount;

        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || totalAmount > minAmount(), 'XenKnights: amount less than minimum');

        bytes32 newIndex;
        bytes32 prevIndex;

        if (existingAmount == 0) {
            // new stake
            newIndex = _findIndex(totalAmount);
            _linkedList[taprootAddress] = _linkedList[newIndex];
            _linkedList[newIndex] = taprootAddress;
            if (totalPlayers < MAX_WINNERS) {
                // room for one more => increase count
                totalPlayers++;
            } else {
                // at capacity => drop the first one (the lowest)
                bytes32 first = _linkedList[GUARD];
                bytes32 second = _linkedList[first];
                delete _linkedList[first];
                uint256 oldAmount = amounts[first];
                delete amounts[first];
                _linkedList[GUARD] = second;
                // emit Replaced(first, oldAmount);
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
        userAmounts[msg.sender][taprootAddress] += newAmount;
        emit Admitted(msg.sender, taprootAddress_, newAmount, totalAmount);
    }

    function withdraw(string calldata taprootAddress_) external {
        bytes32 taprootAddress = keccak256(bytes(taprootAddress_));
        _canWithdraw(taprootAddress_, taprootAddress);

        uint256 amount = userAmounts[msg.sender][taprootAddress];
        require(
            xenCrypto.transfer(msg.sender, amount),
            'XenKnights: error withdrawing'
        );
        delete userAmounts[msg.sender][taprootAddress];
        emit Withdrawn(msg.sender, taprootAddress_, amount);
    }

    function burn() external {
        _canBurn();

        uint256 totalAmount;
        uint256 len = MAX_WINNERS > totalPlayers ? totalPlayers : MAX_WINNERS;
        bytes32 index = _linkedList[GUARD];
        for(uint256 i = 0; i < len; ++i) {
            totalAmount += amounts[index];
            index = _linkedList[index];
        }

        require(
            xenCrypto.transfer(address(0xdead), totalAmount),
            'XenKnights: error burning'
        );
        burned = true;
        emit Burned(totalAmount);
    }
}
