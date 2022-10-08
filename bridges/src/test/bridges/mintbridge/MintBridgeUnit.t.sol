// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {BridgeTestBase} from "./../../aztec/base/BridgeTestBase.sol";
import {AztecTypes} from "../../../aztec/libraries/AztecTypes.sol";

// Example-specific imports
import {IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {MintBridge} from "../../../bridges/mintbridge/MintBridge.sol";
import {ErrorLib} from "../../../bridges/base/ErrorLib.sol";

// @notice The purpose of this test is to directly test convert functionality of the bridge.
contract MintBridgeUnitTest is BridgeTestBase {

    address private constant BENEFICIARY = address(11);

    address private rollupProcessor;
    // The reference to the bridge
    MintBridge private bridge;

    // @dev This method exists on RollupProcessor.sol. It's defined here in order to be able to receive ETH like a real
    //      rollup processor would.
    function receiveEthFromBridge(uint256 _interactionNonce) external payable {}

    function setUp() public {
        // In unit tests we set address of rollupProcessor to the address of this test contract
        rollupProcessor = address(this);

        // Deploy a new example bridge
        bridge = new MintBridge(rollupProcessor);

        // Set ETH balance of bridge and BENEFICIARY to 0 for clarity (somebody sent ETH to that address on mainnet)
        vm.deal(address(bridge), 0);
        vm.deal(BENEFICIARY, 0);

        // Use the label cheatcode to mark the address with "Mint Bridge" in the traces
        vm.label(address(bridge), "Mint Bridge");
    }

    function testInvalidCaller(address _callerAddress) public {
        vm.assume(_callerAddress != rollupProcessor);
        // Use HEVM cheatcode to call from a different address than is address(this)
        vm.prank(_callerAddress);
        vm.expectRevert(ErrorLib.InvalidCaller.selector);
        bridge.convert(emptyAsset, emptyAsset, emptyAsset, emptyAsset, 0, 0, 0, address(0));
    }

    function testInvalidInputAssetType() public {
        vm.expectRevert(ErrorLib.InvalidInputA.selector);
        bridge.convert(emptyAsset, emptyAsset, emptyAsset, emptyAsset, 0, 0, 0, address(0));
    }

    function testExampleBridgeUnitTestFixed() public {
        testMintUnitTest(10 ether);
    }

    // @notice The purpose of this test is to directly test convert functionality of the bridge.
    // @dev In order to avoid overflows we set _depositAmount to be uint96 instead of uint256.
    function testMintUnitTest(uint96 _depositAmount) public {
        vm.warp(block.timestamp + 1 days);

        // Define input and output assets
        AztecTypes.AztecAsset memory inputAssetA = AztecTypes.AztecAsset({
            id: 0,
            erc20Address: address(0),
            assetType: AztecTypes.AztecAssetType.ETH
        });

        AztecTypes.AztecAsset memory outputAssetA = AztecTypes.AztecAsset({
            id: 1000, // Irrelevant - is ignored when computing criteria
            erc20Address: address(0),
            assetType: AztecTypes.AztecAssetType.VIRTUAL
        });

        (uint256 outputValueA, uint256 outputValueB, bool isAsync) = bridge.convert(
            inputAssetA, // _inputAssetA - definition of an input asset
            emptyAsset, // _inputAssetB - not used so can be left empty
            outputAssetA, // _outputAssetA - in this example equal to input asset
            emptyAsset, // _outputAssetB - not used so can be left empty
            _depositAmount, // _totalInputValue - an amount of input asset A sent to the bridge
            0, // _interactionNonce
            0, // _auxData - not used in the example bridge
            BENEFICIARY // _rollupBeneficiary - address, the subsidy will be sent to
        );

        assertTrue(!isAsync, "Bridge is incorrectly in an async mode");

    }
}
