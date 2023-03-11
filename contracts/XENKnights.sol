// SPDX-License-Identifier: MIT
pragma solidity ^0.8.10;

import "@faircrypto/xen-crypto/contracts/XENCrypto.sol";
import "@faircrypto/xen-crypto/contracts/interfaces/IBurnRedeemable.sol";
import "@faircrypto/xen-crypto/contracts/interfaces/IBurnableToken.sol";
import "@openzeppelin/contracts/utils/introspection/ERC165.sol";
import "./libs/Strings.sol";

/*
    Sorting in Ethereum
    https://medium.com/bandprotocol/solidity-102-3-maintaining-sorted-list-1edd0a228d83 [*]
    https://stackoverflow.com/questions/64661313/descending-quicksort-in-solidity
    https://gist.github.com/fiveoutofnine/5140b17f6185aacb71fc74d3a315a9da

*/
contract XENKnights is ERC165, IBurnRedeemable {

    using Strings for uint256;

    // PUBLIC CONSTANTS
    string public constant AUTHORS = "@MrJackLevin @ackebom @lbelyaev faircrypto.org";
    uint256 public constant SECS_IN_DAY = 3_600 * 24;
    // used as a unique marker for beginning and end of a linked list
    string public constant GUARD = 'guard'; // 0xFF..F, not a valid tokenId

    // common business logic
    uint256 public constant MAX_WINNERS = 100;

    // PUBLIC MUTABLE STATE
    uint256 public totalPlayers;
    // taproot address => total stake amount
    mapping(string => uint256) public amounts;

    // PRIVATE STATE

    // linked sorted list of tokenIds
    // GUARD => X
    // X => Y (Y >= X)
    // Y => ...
    // ... => GUARD
    mapping(string => string) private _linkedList;
    string private _current = '';

    // PUBLIC IMMUTABLE STATE

    uint256 public immutable startTs;
    uint256 public immutable endTs;
    // pointer to XEN Stake contract
    IBurnableToken public immutable xenCrypto;

    // CONSTRUCTOR

    constructor(address xenCrypto_, uint256 startTs_, uint256 durationDays_) {
        require(xenCrypto_ != address(0));
        require(startTs_ > block.timestamp);
        require(durationDays_ > 0);
        xenCrypto = IBurnableToken(xenCrypto_);
        startTs = startTs_;
        endTs = startTs_ + durationDays_ * SECS_IN_DAY;
        _linkedList[GUARD] = GUARD; // initialize the linked list
    }

    // EVENTS

    event Admitted(address indexed user, string taprootAddress, uint256 amount, uint256 totalAmount);
    event Replaced(string taprootAddress, uint256 totalAmount);

    // PRIVATE HELPERS

    function _checkIfEligible(uint256 amount, string calldata taprootAddress) private view {
        require(msg.sender == tx.origin, 'XenKnights: only EOAs allowed');
        require(block.timestamp > startTs, 'XenKnights: competition not yet started');
        require(block.timestamp < endTs, 'XenKnights: competition already finished');
        require(amount > 0, 'XenKnights: illegal amount');
        require(bytes(taprootAddress).length == 62, 'XenKnights: illegal taprootAddress length');
        require(
            _compare(string(bytes(taprootAddress)[0:4]), 'b1cp'),
            'XenKnights: illegal taprootAddress signature'
        );
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
    function enterCompetition(uint256 newAmount, string calldata taprootAddress) external {
        require(bytes(_current).length == 0, 'XenKnights: illegal state');
        _checkIfEligible(newAmount, taprootAddress);

        uint256 existingAmount = amounts[taprootAddress];
        uint256 totalAmount = existingAmount + newAmount;

        // Check if we are below min and revert
        require(totalPlayers < MAX_WINNERS || totalAmount > minAmount(), 'XenKnights: amount less than minimum');

        _current = taprootAddress;
        xenCrypto.burn(msg.sender, newAmount);
    }

    // IERC165 IMPLEMENTATION

    /**
        @dev confirms support for IERC-165 and IBurnRedeemable interfaces
     */
    function supportsInterface(bytes4 interfaceId) public view virtual override returns (bool) {
        return
        interfaceId == type(IBurnRedeemable).interfaceId ||
        super.supportsInterface(interfaceId);
    }

    // IBurnRedeemable interface method(s)

    function onTokenBurned(address user, uint256 amount) external {
        require(bytes(_current).length != 0, 'XenKnights: illegal state on burn');

        uint256 existingAmount = amounts[_current];
        uint256 totalAmount = existingAmount + amount;
        string memory newIndex;
        string memory prevIndex;

        if (existingAmount == 0) {
            // new stake
            newIndex = _findIndex(totalAmount);
            _linkedList[_current] = _linkedList[newIndex];
            _linkedList[newIndex] = _current;
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
            (prevIndex, newIndex) = _findIndexes(_current, totalAmount);
            if (!_compare(newIndex, _current)) {
                _linkedList[prevIndex] = _linkedList[_current];
                _linkedList[_current] = _linkedList[newIndex];
                _linkedList[newIndex] = _current;
            }
        }

        amounts[_current] = totalAmount;
        _current = '';
        emit Admitted(user, _current, amount, totalAmount);
    }

}
