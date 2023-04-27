import React from 'react';
import { Button } from 'react-bootstrap';

function App() {
  const connectWallet = async () => {
    //TODO
  };

  return (
    <div>
      <h1>ERC20 Bulk Transfer</h1>
      <Button onClick={connectWallet}>Connect to Metamask</Button>
    </div>
  );
}

export default App;
