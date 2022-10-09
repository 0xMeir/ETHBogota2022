import type { NextPage } from 'next';
import Head from 'next/head';
import Image from 'next/image';
import Button from '../components/Global/Button';
import { ethers } from 'ethers';
import { Web3Provider } from '@ethersproject/providers';
import { useEffect, useState } from 'react';
import {
  AccountId,
  AssetValue,
  AztecSdk,
  BridgeCallData,
  createAztecSdk,
  EthersAdapter,
  EthereumProvider,
  SdkFlavour,
  AztecSdkUser,
  GrumpkinAddress,
  SchnorrSigner,
  EthAddress,
  TxSettlementTime,
  DefiSettlementTime,
  virtualAssetIdPlaceholder,
} from '@aztec/sdk';

import { randomBytes } from 'crypto';

import { depositEthToAztec, registerAccount } from './utils';

const Home: NextPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hasMetamask, setHasMetamask] = useState(false);
  const [signer, setSigner] = useState<null | SchnorrSigner>(null);
  const [ethereumProvider, setEthereumProvider] =
    useState<null | EthereumProvider>(null);
  const [ethAccount, setEthAccount] = useState<EthAddress | null>(null);
  const [sdk, setSdk] = useState<null | AztecSdk>(null);
  const [account0, setAccount0] = useState<AztecSdkUser | null>(null);
  const [userExists, setUserExists] = useState<boolean>(false);
  const [accountPrivateKey, setAccountPrivateKey] = useState<Buffer | null>(
    null
  );
  const [accountPublicKey, setAccountPublicKey] =
    useState<GrumpkinAddress | null>(null);
  const [spendingSigner, setSpendingSigner] = useState<
    SchnorrSigner | undefined
  >(undefined);
  const [alias, setAlias] = useState('');
  const [amount, setAmount] = useState(0);

  useEffect(() => {
    if (typeof window.ethereum !== 'undefined') {
      setHasMetamask(true);
    }
    window.ethereum.on('accountsChanged', () => location.reload());
  });

  // async function connect() {
  //   setConnecting(true);
  //   if (typeof window.ethereum !== 'undefined') {
  //     try {
  //       // let accounts = await ethereum.request({
  //       //   method: 'eth_requestAccounts',
  //       // });
  //       // console.log(accounts);

  //       // setEthAccount(EthAddress.fromString(accounts[0]));
  //       // console.log(ethAccount);

  //       // const ethersProvider: Web3Provider = new ethers.providers.Web3Provider(
  //       //   window.ethereum
  //       // );
  //       // const ethereumProvider: EthereumProvider = new EthersAdapter(
  //       //   ethersProvider
  //       // );

  //       // let ethSigner = ethersProvider.getSigner();

  //       // let x = EthAddress.fromString(await ethSigner!.getAddress());

  //       // setEthAccount(x);

  //       const provider = new ethers.providers.Web3Provider(window.ethereum);
  //       const ethereumProvider: EthereumProvider = new EthersAdapter(provider);

  //       // Get Metamask ethAccount
  //       await provider.send('eth_requestAccounts', []);
  //       const mmSigner = provider.getSigner();
  //       const mmAddress = EthAddress.fromString(await mmSigner.getAddress());
  //       setEthAccount(mmAddress);

  //       console.log(ethAccount);
  //       //console.log(ethersProvider);

  //       const generateSdk = await createAztecSdk(ethereumProvider, {
  //         serverUrl: 'https://api.aztec.network/aztec-connect-testnet/falafel', // goerli testnet
  //         pollInterval: 1000,
  //         memoryDb: true,
  //         debug: 'bb:*',
  //         flavour: SdkFlavour.PLAIN,
  //         minConfirmation: 1, // ETH block confirmations
  //       });

  //       await generateSdk.run();

  //       console.log('Aztec SDK initialized', generateSdk);
  //       setIsConnected(true);
  //       // setSigner(ethersProvider.getSigner());

  //       const { privateKey } = await generateSdk.generateSpendingKeyPair(
  //         ethAccount!
  //       );
  //       const newSigner = await generateSdk.createSchnorrSigner(privateKey);
  //       setSigner(newSigner);
  //       setEthereumProvider(ethereumProvider);
  //       setSdk(generateSdk);
  //     } catch (e) {
  //       console.log(e);
  //     }
  //   } else {
  //     setIsConnected(false);
  //   }
  //   setConnecting(false);
  // }

  async function connect() {
    setConnecting(true);
    if (typeof window.ethereum !== 'undefined') {
      try {
        let accounts = await ethereum.request({
          method: 'eth_requestAccounts',
        });
        setEthAccount(EthAddress.fromString(accounts[0]));

        const ethersProvider: Web3Provider = new ethers.providers.Web3Provider(
          window.ethereum
        );
        const ethereumProvider: EthereumProvider = new EthersAdapter(
          ethersProvider
        );

        const sdk = await createAztecSdk(ethereumProvider, {
          serverUrl: 'https://api.aztec.network/aztec-connect-testnet/falafel', // goerli testnet
          pollInterval: 1000,
          memoryDb: true,
          debug: 'bb:*',
          flavour: SdkFlavour.PLAIN,
          minConfirmation: 1, // ETH block confirmations
        });

        await sdk.run();

        console.log('Aztec SDK initialized', sdk);
        console.log(ethAccount);

        setIsConnected(true);
        setSigner(ethersProvider.getSigner());
        setEthereumProvider(ethereumProvider);
        setSdk(sdk);
      } catch (e) {
        console.log(e);
      }
    } else {
      setIsConnected(false);
    }
    setConnecting(false);
  }

  async function login() {
    const { publicKey: pubkey, privateKey } = await sdk!.generateAccountKeyPair(
      ethAccount!
    );
    console.log('privacy key', privateKey);
    console.log('public key', pubkey.toString());

    setAccountPrivateKey(privateKey);
    setAccountPublicKey(pubkey);
  }

  async function getSpendingKey() {
    const { privateKey } = await sdk!.generateSpendingKeyPair(ethAccount!);
    const signer = await sdk?.createSchnorrSigner(privateKey);
    console.log('signer added', signer);
    setSpendingSigner(signer);
  }

  //   const elementAdaptor = createElementAdaptor(
  //     ethereumProvider,
  //     "0xFF1F2B4ADb9dF6FC8eAFecDcbF96A2B351680455", // rollup contract
  //     "0xaeD181779A8AAbD8Ce996949853FEA442C2CDB47", // bridge contract
  //     false // mainnet flag
  // );

  async function mint() {
    const bridge = new BridgeCallData(
      23,
      0,
      virtualAssetIdPlaceholder,
      undefined,
      undefined,
      0
    );

    const tokenAssetValue: AssetValue = {
      assetId: 0,
      value: BigInt(2),
    };

    let fee = (await sdk!.getDefiFees(bridge))[DefiSettlementTime.INSTANT];

    const controller = sdk!.createDefiController(
      accountPublicKey!,
      signer!,
      bridge,
      tokenAssetValue,
      fee,
      signer!
    );

    await controller.createProof();
    const txId = await controller.send();
    console.log('View transaction on the block explorer', txId.toString());
  }

  return (
    <div>
      <Head>
        <title>ZK Mint</title>
        <meta name="description" content="Skunks NFTs" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main>
        <div className="custom-container">
          <div className="wrapper">
            <div className="content-wrapper">
              <h1>zkmint</h1>
              <p>Private nft minting on Aztec</p>
              {hasMetamask ? (
                isConnected ? (
                  <div>
                    {sdk ? (
                      <div>
                        {accountPrivateKey ? (
                          <div>
                            {spendingSigner ? (
                              <Button onClick={() => mint()}>Mint</Button>
                            ) : (
                              <Button onClick={() => getSpendingKey()}>
                                Create Spending Key (Signer)
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button onClick={() => login()}>Login</Button>
                        )}
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                ) : (
                  <Button onClick={() => connect()}>Connect Wallet</Button>
                )
              ) : (
                'Please install metamask'
              )}
            </div>
            <div className="img-wrapper">
              <span className="amount">499 available</span>
              <div className="img-thing" />
              <span className="price">Price: 0Ξ</span>
            </div>
          </div>
        </div>
      </main>

      {connecting ? 'Please wait, setting up Aztec' : ''}
    </div>
  );
};

export default Home;
