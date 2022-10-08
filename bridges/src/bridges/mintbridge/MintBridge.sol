// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {AztecTypes} from "../../aztec/libraries/AztecTypes.sol";
import {ErrorLib} from "../base/ErrorLib.sol";
import {BridgeBase} from "../base/BridgeBase.sol";

contract MintBridge is BridgeBase {

    //later we can map auxdata to nft contracts during a one time set up
    address NFTContract = 0x0;

    mapping (uint256 => uint256) public owners;
    
    constructor(address _rollupProcessor) BridgeBase(_rollupProcessor) {}

    function convert(
        AztecTypes.AztecAsset calldata _inputAssetA,
        AztecTypes.AztecAsset calldata,
        AztecTypes.AztecAsset calldata _outputAssetA,
        AztecTypes.AztecAsset calldata,
        uint256 _totalInputValue,
        uint256 _interactionNonce,
        uint64 _auxData,
        address _rollupBeneficiary
    )
        external
        payable
        override(BridgeBase)
        onlyRollup
        returns (
            uint256 outputValueA,
            uint256,
            bool
        )
    {

        /*
            Mint
            input ETH -> output VIRTUAL

            Redeem
            input VIRTUAL -> output doesn't matter, manually transfer the NFT
        */
        if (_inputAssetA.assetType == AztecTypes.AztecAssetType.ETH && _outputAssetA.assetType == AztecTypes.AztecAssetType.VIRTUAL){

            // later we can support any NFT contract by mapping the _ausData to a set NFT contract address 
            // (_auxData is uint64 and at least uint160 is required to contain a full address)

            uint256 NFTId = IERC721(NFTContract).mint();

            owners[_interactionNonce] = NFTId;

            // this should automatically mint the virtual asset

            return (1, 0, false);
        } else if (_inputAssetA.assetType == AztecTypes.AztecAssetType.Virtual){
        
            uint256 NFTId = owners[_inputAssetA.assetId]; //  `assetId` is currently assigned as `_interactionNonce`

            IERC721(NFTContract).transferFrom(address(0), msg.sender, NFTId); // transfer the NFT from the bridge contract to the owner.

            return (0, 0, false);
        } else {
            revert ErrorLib.InvalidInputA();
        }
    }
}