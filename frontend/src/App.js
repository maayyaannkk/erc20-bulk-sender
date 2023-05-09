import React from 'react';
import { Button } from 'react-bootstrap';
import { useState } from 'react';
import { BigNumber, ethers } from 'ethers';
import { supportedNetworks, contractAddress, objectFromInputString, getSupportedNetworks } from './utils/Util';
import erc20abi from './utils/erc20.abi.json';
import BulkTransferAbi from './utils/BulkTransfer.abi.json'

function App() {
  const [providerAddress, setProviderAddress] = useState('');
  const [networkId, setNetworkId] = useState(0);
  const [provider, setProvider] = useState();
  const [token, setToken] = useState();
  const [loading, setLoading] = useState(false);
  const [parsedData, setParsedData] = useState();

  const connectWallet = async () => {
    if (providerAddress) { logout(); return; }
    if (window.ethereum) {
      try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await window.ethereum.enable();
        const signer = provider.getSigner();
        const address = await signer.getAddress();
        setProvider(provider);
        setProviderAddress(address);
        setNetworkId((await provider.getNetwork()).chainId);
      } catch (error) {
        console.error(error);
      }
    } else {
      console.log('Please install MetaMask!');
    }
  };

  const getBalance = async (address) => {
    if (provider) {
      setLoading(true);

      const erc20Instance = new ethers.Contract(
        address,
        erc20abi,
        provider.getSigner(0)
      );
      try {
        const balance = await erc20Instance.balanceOf(providerAddress);
        const approvedAmount = await erc20Instance.allowance(providerAddress, contractAddress[networkId]);
        const decimal = await erc20Instance.decimals();
        const name = await erc20Instance.name();
        const symbol = await erc20Instance.symbol();
        const balanceDec = ethers.utils.formatUnits(balance._hex, decimal);
        const token = { address: address, balance: balance, balanceDecimal: balanceDec, decimal: decimal, name: name, symbol: symbol, approvedAmount: approvedAmount }
        setToken(token);
      } catch (e) { console.log(e); setToken(null) }

      setLoading(false);
    }
  };

  function handleTokenSubmit(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const formJson = Object.fromEntries(formData.entries());
    const tokenAddress = formJson.tokenAddress;

    if (ethers.utils.isAddress(tokenAddress))
      getBalance(tokenAddress);
    else { console.log("invalid"); setToken(null); }
  }

  function handleAddressParse(e) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const formJson = Object.fromEntries(formData.entries());
    const tokenAddresses = formJson.addresses;

    if (objectFromInputString(tokenAddresses,token.decimal)) {
      const [addresses, amounts, total] = objectFromInputString(tokenAddresses,token.decimal);
      const parsedData = { addresses: addresses, amounts: amounts, total: total }
      if (BigNumber.from(parsedData.total._hex).gt(BigNumber.from(token.balance._hex)))
        setParsedData(null)
      else
        setParsedData(parsedData);
    } else
      setParsedData(null);
  }

  function bulkSendTokens() {
    const bulkSendTokensInstance = new ethers.Contract(
      contractAddress[networkId],
      BulkTransferAbi,
      provider.getSigner(0)
    );
    bulkSendTokensInstance.sendBulk(parsedData["addresses"], parsedData["amounts"], token.address)
      .then((tx) => {
        console.log(`Transaction hash: ${tx.hash}`);
        bulkSendTokensInstance.once("SendBulk", (recipients, amounts, tokenAddress) => {
          getBalance(token.address)
        });
      })
      .catch((error) => {
        console.error(`Error approving spend: ${error}`);
      });
  }

  async function approveErc20Spend() {
    const erc20Instance = new ethers.Contract(
      token.address,
      erc20abi,
      provider.getSigner(0)
    );
    erc20Instance.approve(contractAddress[networkId], BigNumber.from(parsedData.total).sub(BigNumber.from(token.approvedAmount)))
      .then((tx) => {
        console.log(`Transaction hash: ${tx.hash}`);
        erc20Instance.once("Approval", (owner, spender, amount) => {
          getBalance(token.address)
        });
      })
      .catch((error) => {
        console.error(`Error approving spend: ${error}`);
      });;
  }

  window.ethereum.on("accountsChanged", () => connectWallet());
  window.ethereum.on("chainChanged", () => connectWallet());
  window.ethereum.on("disconnect", () => logout());
  function logout() { setProvider(null); setProviderAddress(""); setNetworkId(0); }

  return (
    <div>
      <h1>ERC20 Bulk Transfer</h1>
      <h3>Supported networks - {getSupportedNetworks().join(", ")}</h3>
      <h3>Step 1 &gt; Step 2 &gt; Step 3</h3>
      {providerAddress ? <h4>{providerAddress}</h4> : null}
      {providerAddress && supportedNetworks[networkId] ? <h4>{supportedNetworks[networkId]}</h4> : providerAddress && networkId > 0 ? <h4>Chain Not Supported</h4> : null}
      <Button onClick={connectWallet}>{providerAddress ? "Dis" : ""}Connect Metamask</Button>

      {
        providerAddress && supportedNetworks[networkId] ?
          <>
            <form onSubmit={handleTokenSubmit}>
              <br /><br />
              <input name='tokenAddress' type='text' placeholder='enter token address' size="50"></input>
              &nbsp;
              <input type='text' placeholder='decimal' value={token ? token.decimal : ''} readOnly={true} size="5"></input>
              <br />
              <Button type='submit'>Fetch token info</Button>
            </form>
            <br />
            {token ? token.name + " (" + token.symbol + ") " + " - Balance " + token.balanceDecimal : null}
            <br /><br />
            {token ?
              <><form onSubmit={handleAddressParse}>
                <textarea name='addresses' type='text' placeholder='enter address and amount separated with comma' rows="4" cols="80"></textarea>
                <br />
                <Button type='submit'>Parse</Button>
              </form>
                {parsedData ?
                  <>
                    <p>Total - {ethers.utils.formatUnits(parsedData.total._hex, token.decimal).toString()}</p>
                    <p>Approved - {ethers.utils.formatUnits(token.approvedAmount, token.decimal).toString()}</p>

                    <br />
                    {BigNumber.from(token.approvedAmount).gte(BigNumber.from(parsedData.total._hex)) ?
                      <>
                        <Button onClick={() => bulkSendTokens()}>Send</Button>
                      </>
                      :
                      <>
                        <Button onClick={() => approveErc20Spend()}>Approve</Button>
                      </>
                    }
                  </>
                  : null}
              </>
              : null}
          </>
          : null
      }

    </div>
  );
}

export default App;
