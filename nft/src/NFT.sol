// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "solmate/tokens/ERC721.sol";
import "@openzeppelin/contracts/utils/Strings.sol";

contract NFT is ERC721 {
    uint256 public currentTokenId;

    string public baseTokenURI =
        "https://bafybeighak7n5qxop5cuz2hcnyqweq6sdsczdahhzhnjqmbt7sm5qecf4y.ipfs.dweb.link/Zkunks-metadata/";

    constructor(string memory _name, string memory _symbol)
        ERC721(_name, _symbol)
    {}

    function mint() public payable returns (uint256) {
        uint256 newItemId = ++currentTokenId;
        _safeMint(msg.sender, newItemId);
        return newItemId;
    }

    function _baseURI() internal view virtual override returns (string memory) {
        rjeturn baseTokenURI;
    }

    function tokenURI(uint256 id)
        public
        view
        virtual
        override
        returns (string memory)
    {
        return Strings.toString(id);
    }
}
