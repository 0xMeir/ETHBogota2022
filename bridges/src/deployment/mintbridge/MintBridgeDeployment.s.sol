// SPDX-License-Identifier: Apache-2.0
// Copyright 2022 Aztec.
pragma solidity >=0.8.4;

import {BaseDeployment} from "../base/BaseDeployment.s.sol";
import {MintBridgeContract} from "../../bridges/mintbridge/MintBridge.sol";

contract MintBridgeDeployment is BaseDeployment {
    function deploy() public returns (address) {
        emit log("Deploying mint bridge");

        vm.broadcast();
        MintBridgeContract bridge = new MintBridgeContract(ROLLUP_PROCESSOR);

        emit log_named_address("Mint bridge deployed to", address(bridge));

        return address(bridge);
    }

    function deployAndList() public {
        address bridge = deploy();
        uint256 addressId = listBridge(bridge, 250000);
        emit log_named_uint("Mint bridge address id", addressId);
    }
}
