// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {BridgeTestBase} from "./../../aztec/base/BridgeTestBase.sol";
import {AztecTypes} from "../../../aztec/libraries/AztecTypes.sol";

import {IERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {MintBridge} from "../../../bridges/mintbridge/MintBridge.sol";
import {ErrorLib} from "../../../bridges/base/ErrorLib.sol";

/**
 * @notice The purpose of this test is to test the bridge in an environment that is as close to the final deployment
 *         as possible without spinning up all the rollup infrastructure (sequencer, proof generator etc.).
 */
contract MintBridgeTest is BridgeTestBase {

    address private constant BENEFICIARY = address(11);

    MintBridge internal bridge;

    uint256 private id;

    function setUp() public {

        bridge = new MintBridge(address(ROLLUP_PROCESSOR));

        vm.label(address(bridge), "Mint Bridge");

        // Impersonate the multi-sig to add a new bridge
        vm.startPrank(MULTI_SIG);

        // List the bridge with a gasLimit of 120k
        // WARNING: If you set this value too low the interaction will fail for seemingly no reason!
        // OTOH if you se it too high bridge users will pay too much
        ROLLUP_PROCESSOR.setSupportedBridge(address(bridge), 120000);

        vm.stopPrank();

        // Fetch the id of the bridge
        id = ROLLUP_PROCESSOR.getSupportedBridgesLength();

        // Set the rollupBeneficiary on BridgeTestBase so that it gets included in the proofData
        setRollupBeneficiary(BENEFICIARY);
    }

    // @dev In order to avoid overflows we set _depositAmount to be uint96 instead of uint256.
    function MintBridgeE2ETest(uint96 _depositAmount) public {
        vm.warp(block.timestamp + 1 days);

        // Use the helper function to fetch the support AztecAsset for ETH
        AztecTypes.AztecAsset memory ethAsset = getRealAztecAsset(address(0));

        AztecTypes.AztecAsset memory nftAsset = AztecTypes.AztecAsset({
            id: 1000, // Irrelevant - is ignored when computing criteria
            erc20Address: address(0),
            assetType: AztecTypes.AztecAssetType.VIRTUAL
        });

        // Computes the encoded data for the specific bridge interaction
        uint256 bridgeCallData = encodeBridgeCallData(id, ethAsset, emptyAsset, nftAsset, emptyAsset, 0);

        // Execute the rollup with the bridge interaction. Ensure that event as seen above is emitted.
        (uint256 outputValueA, uint256 outputValueB, bool isAsync) = sendDefiRollup(bridgeCallData, _depositAmount);

        // Note: Unlike in unit tests there is no need to manually transfer the tokens - RollupProcessor does this

        // Check the output values are as expected

        assertEq(outputValueA, 0, "Non-zero outputValueA");
        assertFalse(isAsync, "Bridge is not synchronous");
    }
}
