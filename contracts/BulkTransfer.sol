// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract BulkTransfer is Ownable {
    function sendBulk(
        address[] calldata recipients,
        uint256[] calldata amounts,
        address tokenAddress
    ) external {
        require(recipients.length == amounts.length, "Invalid input");

        IERC20 token = IERC20(tokenAddress);
        uint total = 0;
        for (uint256 i = 0; i < amounts.length; i++) {
            total += amounts[i];
        }

        require(
            token.allowance(msg.sender, address(this)) >= total,
            "Invalid allowance"
        );

        for (uint256 i = 0; i < recipients.length; i++) {
            require(
                token.transferFrom(msg.sender, recipients[i], amounts[i]),
                "Transfer failed"
            );
        }
        emit SendBulk(recipients, amounts, tokenAddress);
    }

    event SendBulk(
        address[] recipients,
        uint256[] amounts,
        address tokenAddress
    );
}
