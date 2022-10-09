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

  async function connect() {
    setConnecting(true);
    if (typeof window.ethereum !== 'undefined') {
      try {
        // let accounts = await ethereum.request({
        //   method: 'eth_requestAccounts',
        // });
        // console.log(accounts);

        // setEthAccount(EthAddress.fromString(accounts[0]));
        // console.log(ethAccount);

        // const ethersProvider: Web3Provider = new ethers.providers.Web3Provider(
        //   window.ethereum
        // );
        // const ethereumProvider: EthereumProvider = new EthersAdapter(
        //   ethersProvider
        // );

        // let ethSigner = ethersProvider.getSigner();

        // let x = EthAddress.fromString(await ethSigner!.getAddress());

        // setEthAccount(x);

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const ethereumProvider: EthereumProvider = new EthersAdapter(provider);

        // Get Metamask ethAccount
        await provider.send('eth_requestAccounts', []);
        const mmSigner = provider.getSigner();
        const mmAddress = EthAddress.fromString(await mmSigner.getAddress());
        setEthAccount(mmAddress);

        console.log(ethAccount);
        //console.log(ethersProvider);

        const generateSdk = await createAztecSdk(ethereumProvider, {
          serverUrl: 'https://api.aztec.network/aztec-connect-testnet/falafel', // goerli testnet
          pollInterval: 1000,
          memoryDb: true,
          debug: 'bb:*',
          flavour: SdkFlavour.PLAIN,
          minConfirmation: 1, // ETH block confirmations
        });

        await generateSdk.run();

        console.log('Aztec SDK initialized', generateSdk);
        setIsConnected(true);
        // setSigner(ethersProvider.getSigner());

        const { privateKey } = await generateSdk.generateSpendingKeyPair(
          ethAccount!
        );
        const newSigner = await generateSdk.createSchnorrSigner(privateKey);
        setSigner(newSigner);
        setEthereumProvider(ethereumProvider);
        setSdk(generateSdk);
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

  async function initUsersAndPrintBalances() {
    let account0 = (await sdk!.userExists(accountPublicKey!))
      ? await sdk!.getUser(accountPublicKey!)
      : await sdk!.addUser(accountPrivateKey!);

    setAccount0(account0!);

    if (await sdk?.isAccountRegistered(accountPublicKey!)) setUserExists(true);

    await account0.awaitSynchronised();
    // Wait for the SDK to read & decrypt notes to get the latest balances
    console.log(
      'zkETH balance',
      sdk!.fromBaseUnits(
        await sdk!.getBalance(account0.id, sdk!.getAssetIdBySymbol('ETH'))
      )
    );
  }

  async function getSpendingKey() {
    const { privateKey } = await sdk!.generateSpendingKeyPair(ethAccount!);
    const signer = await sdk?.createSchnorrSigner(privateKey);
    console.log('signer added', signer);
    setSpendingSigner(signer);
  }

  async function registerNewAccount() {
    const depositTokenQuantity: bigint = ethers.utils
      .parseEther(amount.toString())
      .toBigInt();
    const recoverySigner = await sdk!.createSchnorrSigner(randomBytes(32));
    let recoverPublicKey = recoverySigner.getPublicKey();
    let txId = await registerAccount(
      accountPublicKey!,
      alias,
      accountPrivateKey!,
      spendingSigner!.getPublicKey(),
      recoverPublicKey,
      EthAddress.ZERO,
      depositTokenQuantity,
      TxSettlementTime.NEXT_ROLLUP,
      ethAccount!,
      sdk!
    );
    console.log('registration txId', txId);
    console.log(
      'lookup tx on explorer',
      `https://aztec-connect-testnet-explorer.aztec.network/goerli/tx/${txId.toString()}`
    );
  }

  async function depositEth() {
    const depositTokenQuantity: bigint = ethers.utils
      .parseEther(amount.toString())
      .toBigInt();

    let txId = await depositEthToAztec(
      ethAccount!,
      accountPublicKey!,
      depositTokenQuantity,
      TxSettlementTime.NEXT_ROLLUP,
      sdk!
    );

    console.log('deposit txId', txId);
    console.log(
      'lookup tx on explorer',
      `https://aztec-connect-testnet-explorer.aztec.network/goerli/tx/${txId.toString()}`
    );
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
      fee
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
                  <Button onClick={() => mint()}>Mint</Button>
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
      {sdk ? (
        <div>
          {accountPrivateKey ? (
            <button onClick={() => initUsersAndPrintBalances()}>
              Init User / Log Balance
            </button>
          ) : (
            <button onClick={() => login()}>Login</button>
          )}
          {spendingSigner && !userExists ? (
            <form>
              <label>
                Alias:
                <input
                  type="text"
                  value={alias}
                  onChange={(e) => setAlias(e.target.value)}
                />
              </label>
            </form>
          ) : (
            ''
          )}
          {!spendingSigner && account0 ? (
            <button onClick={() => getSpendingKey()}>
              Create Spending Key (Signer)
            </button>
          ) : (
            ''
          )}
          {spendingSigner ? (
            <div>
              <form>
                <label>
                  Deposit Amount:
                  <input
                    type="number"
                    step="0.000000000000000001"
                    min="0.01"
                    value={amount}
                    onChange={(e) => setAmount(e.target.valueAsNumber)}
                  />
                  ETH
                </label>
              </form>
              {!userExists ? (
                <button onClick={() => registerNewAccount()}>
                  Register Alias + Deposit ≥0.1 ETH
                </button>
              ) : (
                ''
              )}
            </div>
          ) : (
            ''
          )}
          {spendingSigner && account0 ? (
            <button onClick={() => depositEth()}>Deposit ETH</button>
          ) : (
            ''
          )}
          <button onClick={() => console.log('sdk', sdk)}>Log SDK</button>
        </div>
      ) : (
        ''
      )}
    </div>
  );
};

export default Home;
