import React from 'react';
import { useState } from 'react';
import { Container, Card, Col, Row, Button, Form, Spinner, CloseButton } from "react-bootstrap";
import { BigNumber, ethers } from 'ethers';
import { supportedNetworks, contractAddress, objectFromInputString, getSupportedNetworks } from './utils/Util';
import erc20abi from './utils/erc20.abi.json';
import BulkTransferAbi from './utils/BulkTransfer.abi.json'

function App() {

  const [providerAddress, setProviderAddress] = useState('');
  const [networkId, setNetworkId] = useState(0);
  const [provider, setProvider] = useState();
  const [token, setToken] = useState();
  const [parsedData, setParsedData] = useState();
  const [showHelp, setShowHelp] = useState(true);

  const [errorTokenAddress, setErrorTokenAddress] = useState();
  const [errorParseAddress, setErrorParseAddress] = useState();

  const [loadingTokenInfo, setLoadingTokenInfo] = useState(false);
  const [loadingTokenApprove, setLoadingTokenApprove] = useState(false);
  const [loadingTokenSend, setLoadingTokenSend] = useState(false);

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

  function handleTokenSubmit(e) {
    setErrorTokenAddress(null);
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);

    const formJson = Object.fromEntries(formData.entries());
    const tokenAddress = formJson.tokenAddress;

    if (ethers.utils.isAddress(tokenAddress))
      getBalance(tokenAddress);
    else { setErrorTokenAddress("Invalid Token"); setToken(null); }
  }

  const getBalance = async (address) => {
    if (provider) {
      setErrorTokenAddress(null);
      setLoadingTokenInfo(true);

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
        if (!decimal) {
          setErrorTokenAddress("Invalid Token Decimal"); return;
        }
        if (balanceDec > 0)
          setToken(token);
        else setErrorTokenAddress("No balance for the given token");
      } catch (e) { setErrorTokenAddress("Invalid Token"); setToken(null) }

      setLoadingTokenInfo(false);
    }
  };

  function handleAddressParse(e) {
    e.preventDefault();
    setErrorParseAddress(null);

    const form = e.target;
    const formData = new FormData(form);

    const formJson = Object.fromEntries(formData.entries());
    const tokenAddresses = formJson.addresses;

    if (objectFromInputString(tokenAddresses, token.decimal)) {
      const [addresses, amounts, total] = objectFromInputString(tokenAddresses, token.decimal);
      const parsedData = { addresses: addresses, amounts: amounts, total: total }
      if (BigNumber.from(parsedData.total._hex).gt(BigNumber.from(token.balance._hex))) {
        setParsedData(null)
        setErrorParseAddress("Total is more than balance");
      }
      else
        setParsedData(parsedData);
    } else {
      setParsedData(null);
      setErrorParseAddress("Invalid format");
    }

  }

  async function approveErc20Spend() {
    setLoadingTokenApprove(true);
    const erc20Instance = new ethers.Contract(
      token.address,
      erc20abi,
      provider.getSigner(0)
    );
    erc20Instance.approve(contractAddress[networkId], BigNumber.from(parsedData.total).sub(BigNumber.from(token.approvedAmount)))
      .then((tx) => {
        console.log(`Transaction hash: ${tx.hash}`);
        erc20Instance.once("Approval", (owner, spender, amount) => {
          setLoadingTokenApprove(false);
          getBalance(token.address)
        });
      })
      .catch((error) => {
        console.error(`Error approving spend: ${error}`);
        setLoadingTokenApprove(false);
      });;
  }

  function bulkSendTokens() {
    setLoadingTokenSend(true);
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
          setLoadingTokenSend(false);
        });
      })
      .catch((error) => {
        console.error(`Error approving spend: ${error}`);
        setLoadingTokenSend(false);
      });
  }

  window.ethereum.on("accountsChanged", () => connectWallet());
  window.ethereum.on("chainChanged", () => connectWallet());
  window.ethereum.on("disconnect", () => logout());
  function logout() { setProvider(null); setProviderAddress(""); setNetworkId(0); }

  return (
    <div className="App">
      <Container fluid className="text-center">
        <h3 style={{ color: 'white' }}>ERC20 Bulk Transfer
          <Button variant="link" style={{ color: 'white', textDecoration: 'none' }} onClick={() => setShowHelp(!showHelp)}>
            <span aria-hidden="true">&#128712;</span>
          </Button>
        </h3>
        <IntroRow showHelp={showHelp} setShowHelp={setShowHelp} />

        <Row >
          <Col md={2} lg={3}></Col>
          <Col xs={12} md={8} lg={6}>
            <Card
              text={'white'}
              className="custom-card-bg">
              <Card.Body>
                <Card.Title>Wallet Info</Card.Title>
                <Card.Text>
                  {providerAddress ? <b>{providerAddress}</b> : null}
                  {providerAddress && supportedNetworks[networkId] ? <p>Connected to <b>{supportedNetworks[networkId]}</b></p> : providerAddress && networkId > 0 ? <p>Chain Not Supported</p> : null}
                  {!providerAddress ? <Button className='custom-button-bg' onClick={connectWallet}> Connect</Button> : null}
                </Card.Text>
              </Card.Body>
            </Card>
          </Col>
          <Col md={2} lg={3}></Col>
        </Row>
        <br />
        {
          providerAddress && supportedNetworks[networkId] ?
            <>
              <Row>
                <Col md={2} lg={3}></Col>
                <Col xs={12} md={8} lg={6}>
                  <Card
                    text={'white'}
                    className="custom-card-bg">
                    <Card.Body>
                      <Card.Title>Token Details</Card.Title>
                      <Card.Text>
                        <Form onSubmit={handleTokenSubmit}>
                          <Form.Group className="mb-3" controlId="exampleForm.ControlInput1">
                            <Form.Label>Token address</Form.Label>
                            <Form.Control isInvalid={errorTokenAddress ? true : false} name='tokenAddress' type="text" placeholder="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48" />
                            <Form.Control.Feedback type="invalid">
                              {errorTokenAddress}
                            </Form.Control.Feedback>
                          </Form.Group>
                          <Button className='custom-button-bg' type='submit' disabled={loadingTokenInfo} >{loadingTokenInfo ? <Spinner animation="border" size="sm" /> : null}Fetch Token</Button>
                        </Form>
                        {token ? <p>{token.name + " (" + token.symbol + ") " + " - Balance " + token.balanceDecimal}</p> : null}
                      </Card.Text>
                    </Card.Body>
                  </Card>
                </Col>
                <Col md={2} lg={3}></Col>
              </Row>
              <br />
              {token ?
                <>
                  <Row>
                    <Col md={2} lg={3}></Col>
                    <Col xs={12} md={8} lg={6}>
                      <Card
                        text={'white'}
                        className="custom-card-bg">
                        <Card.Body>
                          <Card.Title>Recipients Details</Card.Title>
                          <Card.Text>
                            <Form onSubmit={handleAddressParse}>
                              <Form.Group className="mb-3" controlId="exampleForm.ControlTextarea1">
                                <Form.Label>Enter address and amount separated with comma</Form.Label>
                                <Form.Control isInvalid={errorParseAddress ? true : false} name='addresses' as="textarea" rows={5} placeholder="0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48,20" />
                                <Form.Control.Feedback type="invalid">
                                  {errorParseAddress}
                                </Form.Control.Feedback>
                              </Form.Group>
                              <Button className='custom-button-bg' type='submit'>Parse</Button>
                            </Form>
                            {parsedData ?
                              <>
                                <p>Total - {ethers.utils.formatUnits(parsedData.total._hex, token.decimal).toString()}
                                  &nbsp;
                                  Approved - {ethers.utils.formatUnits(token.approvedAmount, token.decimal).toString()}</p>

                                <br />
                                {BigNumber.from(token.approvedAmount).gte(BigNumber.from(parsedData.total._hex)) ?
                                  <>
                                    <Button className='custom-button-bg' onClick={() => bulkSendTokens()} disabled={loadingTokenSend}>{loadingTokenSend ? <Spinner animation="border" size="sm" /> : null}Send</Button>
                                  </>
                                  :
                                  <>
                                    <Button className='custom-button-bg' onClick={() => approveErc20Spend()} disabled={loadingTokenApprove}>{loadingTokenApprove ? <Spinner animation="border" size="sm" /> : null}Approve</Button>
                                  </>
                                }
                              </>
                              : null}
                          </Card.Text>
                        </Card.Body>
                      </Card>
                    </Col>
                    <Col md={2} lg={3}></Col>
                  </Row>
                </> : null}
            </>
            : null}


      </Container>
    </div >
  );
}

export default App;

function IntroRow({ showHelp, setShowHelp }) {
  return (
    showHelp ?
      <>
        <Row >
          <Col></Col>

          <Col xs={12} md={8} lg={6}>
            <Card
              text={'white'}
              className="custom-card-bg">
              <Card.Body>
                <Card.Header>
                  <Button variant="link" className="float-right" onClick={() => setShowHelp(!showHelp)}>
                    <span aria-hidden="true">&times;</span>
                  </Button>
                  <Card.Title>Welcome to Token BulkSender</Card.Title>
                </Card.Header>
                <Card.Text>
                  This DAPP is used to send ERC20 tokens to many addresses in one transaction which can help user to save transaction fee
                  {/* <p style={{ color: 'white' }}>Supported networks - {getSupportedNetworks().join(", ")}</p> */}
                </Card.Text>
                <Container fluid>
                  <Row >
                    <Col xs={4}>
                      <h5>Step 1</h5>
                      <p>Connect to your Metamask wallet using the correct chain associated with the token you want to send</p>
                    </Col>
                    <Col xs={4}>
                      <h5>Step 2</h5>
                      <p>Enter the ERC20 token address and fetch the information. Limit distribution to a maximum of 500 addresses</p>
                    </Col>
                    <Col xs={4}>
                      <h5>Step 3</h5>
                      <p>Copy and paste the destination wallet address(s) with the number of tokens to send and then parse and approve and send</p>
                    </Col>
                  </Row>
                </Container>
              </Card.Body>
            </Card>
          </Col>

          <Col ></Col>
        </Row>
        <br /></> : null
  );
}
