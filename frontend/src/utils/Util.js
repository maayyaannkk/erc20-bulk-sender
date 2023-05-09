import { BigNumber, ethers } from 'ethers';
export const supportedNetworks = {
    1: "Ethereum Mainnet",
    5: "Goerli test network",
    11155111: "Sepolia test network",
    59140: "Linea Goerli test network",
    137: "Polygon Mainnet"
}
export const contractAddress = {
    11155111: "0xEE221EcE6dB9F72Fef5F17E22493558d6F3f0225"
}
export function getSupportedNetworks() {
    const arr = [];
    for (const property in supportedNetworks) {
        arr.push(supportedNetworks[property]);
    }
    return arr;
}
export const objectFromInputString = (inputString, decimal) => {
    const regex = /^(0x[a-fA-F0-9]{1,},\s*\d+(\.\d{1,18})?\n?)+$/;

    if (!regex.test(inputString)) {
        console.log('Invalid input string format'); return;
    }

    const lines = inputString.trim().split('\n');
    const addresses = [];
    const amounts = [];
    var total = BigNumber.from("0");
    const addressIndexMap = {};

    for (const line of lines) {
        const [address, amount] = line.split(',').map((str) => str.trim());
        const parsedAmount = BigNumber.from(ethers.utils.parseUnits(amount, decimal));
        total = total.add(parsedAmount);

        if (addressIndexMap[address] > -1) {
            const existingIndex = addressIndexMap[address];
            amounts[existingIndex] = amounts[existingIndex].add(parsedAmount);
        } else {
            addresses.push(address);
            amounts.push(parsedAmount);
            addressIndexMap[address] = addresses.length - 1;
        }
    }

    return [addresses, amounts, total];
}