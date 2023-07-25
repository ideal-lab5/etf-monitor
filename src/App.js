import './App.css';
import { ApiPromise, WsProvider, Keyring } from "@polkadot/api";
import { TypeRegistry, Metadata } from '@polkadot/types';

import React, { useEffect, useState } from 'react';

// TODO: use extension to get account
// https://polkadot.js.org/docs/extension/usage/
function App() {
  const [api, setApi] = useState(null);
  const [registry, setRegistry] = useState(null);

  const [acct, setAcct] = useState(null);
  const [addr, setAddr] = useState('');
  const [signer, setSigner] = useState(null);

  const [host, setHost] = useState('127.0.0.1');
  const [port, setPort] = useState('9944');

  const [slotSecrets, setSlotSecrets] = useState([]) ;


  useEffect(() => {
    let provider = new WsProvider(`ws://${host}:${port}`);;
    const setup = async () => {
      // setup api for blockchain
      const api = await ApiPromise.create({
        provider,
        rpc: {
          etf: {
            identity: {
              description: "Calculate the public key for a given string",
              params: [{
                id: 'Bytes',
              }]
            }
          }
        },
      });
      await api.isReady;
      setApi(api);
      // load ALICE account
      const keyring = new Keyring({ type: 'sr25519' });
      let uriAcct = keyring.addFromUri("//Alice");
      setAcct(uriAcct);

      // subscribe to all new headers (with extended info)
      let data = await api.rpc.state.getMetadata();
      const registry = new TypeRegistry();
      registry.register({PreDigest: {
        slot: 'u64',
        secret: '[u8;32]',
        proof: '([u8;48], [u8;48], [u8;32], [u8;48])'
      }});
      const metadata = new Metadata(registry, data.toHex());
      registry.setMetadata(metadata);
      setRegistry(registry);
      search(api, registry);
    }
    setup();
  }, []);


  async function search(api, registry) {
    api.derive.chain.subscribeNewHeads((header) => {
      // console.log(`#${header.number}: ${header.author}`);
      // read the predigest from each block
      let encodedPreDigest = header.digest.logs[0].toHuman().PreRuntime[1];
      const predigest = registry.createType('PreDigest', encodedPreDigest);
      setSlotSecrets(slotSecrets => [...slotSecrets, predigest.toHuman()]);
    });
  }
  
  return (
    <div className="App">
      <div className='header'>
        EtF Network Monitor Tool
      </div>
      <table className='table'>
        <thead>
          <tr>
            <th>Slot #</th>
            <th>Slot Secret</th>
          </tr>
        </thead>
        <tbody>
        { slotSecrets.map((s, i) => {
          return <tr key = {i}>
            <td>
              { s.slot }
            </td>
            <td>
              { s.secret }
            </td>
          </tr>
        })}
        </tbody>
      </table>
    </div>
  );
}

export default App;
 