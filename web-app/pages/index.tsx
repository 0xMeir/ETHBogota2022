import type { NextPage } from 'next';
import { ethers } from 'ethers';
import { JsonRpcSigner, Web3Provider } from '@ethersproject/providers';
import { useEffect, useState } from 'react';
import {
  AccountId,
  AztecSdk,
  AssetValue,
  createAztecSdk,
  EthersAdapter,
  EthereumProvider,
  SdkFlavour,
  AztecSdkUser,
  GrumpkinAddress,
  SchnorrSigner,
  EthAddress,
  TxSettlementTime,
  virtualAssetIdPlaceholder,
  BridgeCallData,
  DefiSettlementTime,
} from '@aztec/sdk';

import { randomBytes } from 'crypto';

import { depositEthToAztec, registerAccount } from './utils';

import Confetti from 'react-confetti';
import Button from '../components/Global/Button';
import Image from 'next/image';

const bridgeReadAbi = [
  {
    inputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
    stateMutability: 'view',
    type: 'function',
    name: 'owners',
    outputs: [
      {
        internalType: 'uint256',
        name: '',
        type: 'uint256',
      },
    ],
  },
];

const Home: NextPage = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [hasMetamask, setHasMetamask] = useState(false);
  const [signer, setSigner] = useState<null | JsonRpcSigner>(null);
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
  const [virtualAssetId, setVirtualAssetId] = useState(0);
  const [activeImg, setActiveImg] = useState(1);
  const [paused, setPaused] = useState(false);
  const [intervalSpeed, setIntervalSpeed] = useState(1000);
  const [minted, setMinted] = useState(false);
  const [quanity, setQuanity] = useState(499);

  const baseuri =
    'https://bafybeighak7n5qxop5cuz2hcnyqweq6sdsczdahhzhnjqmbt7sm5qecf4y.ipfs.dweb.link/Zkunks-metadata/';

  async function getNFTData(id) {
    return fetch(`${baseuri}${id}.json`)
      .then((response) => response.json())
      .then((responseJson) => {
        return responseJson;
      })
      .catch((error) => {
        console.error(error);
      });
  }

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

  async function initUsersAndPrintBalances() {
    let account0 = (await sdk!.userExists(accountPublicKey!))
      ? await sdk!.getUser(accountPublicKey!)
      : await sdk!.addUser(accountPrivateKey!);

    setAccount0(account0!);

    console.log(account0);

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

  async function mint() {
    const nftBridge = new BridgeCallData(
      44,
      0,
      virtualAssetIdPlaceholder,
      undefined,
      undefined,
      0
    );

    let bridge = nftBridge;

    const tokenAssetValue: AssetValue = {
      assetId: 0,
      value: 1000000000000000n,
    };

    const fee = (await sdk.getDefiFees(bridge))[DefiSettlementTime.INSTANT];
    console.log(
      'create defi controller',
      accountPublicKey,
      spendingSigner,
      bridge,
      tokenAssetValue,
      fee
    );
    console.log('signer', signer, spendingSigner);
    const controller = sdk!.createDefiController(
      accountPublicKey!,
      spendingSigner!,
      bridge,
      tokenAssetValue,
      fee
    );
    await controller.createProof();
    const txId = await controller.send();
    console.log(
      'View transaction on the block explorer',
      `tx/${txId.toString()}`
    );
  }
  async function getBalance() {
    let balance = sdk.fromBaseUnits(
      await sdk.getBalance(accountPublicKey, sdk.getAssetIdBySymbol('ETH'))
    );

    let spendableAccountSum = sdk.fromBaseUnits({
      assetId: 0,
      value: await sdk.getSpendableSum(accountPublicKey, 0, false),
    });

    let spendableSpendingKeySum = sdk.fromBaseUnits({
      assetId: 0,
      value: await sdk.getSpendableSum(accountPublicKey, 0, true),
    });

    let pendingSpendingKeySum = sdk.fromBaseUnits({
      assetId: 0,
      value: await sdk.getSpendableSum(accountPublicKey, 0, true, false),
    });

    const padding = 50;

    console.log(`Total zkETH Balance:`.padEnd(padding, ' '), balance);
    console.log(
      'Spendable base account zkETH Balance:'.padEnd(padding, ' '),
      spendableAccountSum
    );
    console.log(
      'Spendable registered account zkETH Balance:'.padEnd(padding, ' '),
      spendableSpendingKeySum
    );
    console.log(
      'Pending registered account zkETH Balance:'.padEnd(padding, ' '),
      pendingSpendingKeySum
    );

    const defiTxs = await sdk.getDefiTxs(accountPublicKey);

    console.log(defiTxs);

    let interactionNonces = [];

    for (var i = 0; i < defiTxs.length; i++) {
      if (defiTxs[i].interactionResult.interactionNonce) {
        interactionNonces.push(defiTxs[i].interactionResult.interactionNonce);
      }
    }
    console.log('nonces', interactionNonces);

    let realNftIds = [];
    for (var i = 0; i < interactionNonces.length; i++) {
      let myNftId = await mapVirtualAssetToNFT(interactionNonces[i]);
      console.log('NFT ID Result', myNftId);
      if (myNftId > 0) {
        realNftIds.push(myNftId);
      }
    }
    console.log('Nft ids', realNftIds);

    loadNFTs(realNftIds);
  }

  async function mapVirtualAssetToNFT(id) {
    const bridgeAddress = '0xb6cd5313407f9930229a64336495121ba5b3a248';
    const bridgeContract = new ethers.Contract(
      bridgeAddress,
      bridgeReadAbi,
      signer
    );
    const nftId = await bridgeContract.owners(id);
    console.log('Mapping for ', id, nftId.toNumber());
    return nftId.toNumber();
  }

  async function sanityCheckIfNFTExists() {
    const nftAddress = '0x2A4B8866C05b087D3779e200aa6f928B4C846A02';
    const nftContract = new ethers.Contract(nftAddress, nftABI, signer);
    //const newNFT = await nftContract.mint();
    // console.log("new ft",  newNFT)
    const nftId = await nftContract.currentTokenId();
    const nftname = await nftContract.name();
    console.log('NFT id sanity check', nftId.toNumber(), nftname);
  }
  async function getSpendingKey() {
    const { privateKey } = await sdk!.generateSpendingKeyPair(ethAccount!);
    const signer = await sdk?.createSchnorrSigner(privateKey);
    console.log('signer added', signer);
    setSpendingSigner(signer);
  }

  useEffect(() => {
    const interval = setInterval(() => {
      if (!paused) {
        if (activeImg === 20) {
          setActiveImg(1);
          console.log('restart');
        } else {
          setActiveImg(activeImg + 1);
          console.log('going');
        }
      }
    }, intervalSpeed);

    return () => clearInterval(interval);
  }, [activeImg, paused]);

  return (
    <div>
      <main>
        {minted && <Confetti />}
        <div className="custom-container">
          <div className="wrapper">
            <div className="content-wrapper">
              {/* <h1>zkmint</h1> */}
              <Image
                src="/imgs/logo.png"
                width={300}
                height={200}
                objectFit="contain"
              />
              <p>Private nft minting on Aztec</p>
              {/* {hasMetamask ? (
                isConnected ? (
                  <div>
                    {sdk ? (
                      <div>
                        {accountPrivateKey ? (
                          <div>
                            {account0 ? (
                              <div>
                                {spendingSigner ? (
                                  <Button onClick={() => mint()}>Mint</Button>
                                ) : (
                                  <Button onClick={() => getSpendingKey()}>
                                    Generate my spending key
                                  </Button>
                                )}
                              </div>
                            ) : (
                              <Button
                                onClick={() => initUsersAndPrintBalances()}
                              >
                                Init
                              </Button>
                            )}
                          </div>
                        ) : (
                          <Button onClick={() => login()}>Log in</Button>
                        )}
                      </div>
                    ) : (
                      ''
                    )}
                  </div>
                ) : (
                  <Button onClick={() => connect()}>Connect to Aztec</Button>
                )
              ) : (
                'Please install metamask'
              )} */}
              <div>
                {hasMetamask ? (
                  isConnected ? (
                    ''
                  ) : (
                    <Button onClick={() => connect()}>Connect to Aztec</Button>
                  )
                ) : (
                  'Please install metamask'
                )}
                {connecting ? 'Please wait, setting up Aztec' : ''}
                {sdk ? (
                  <div>
                    {accountPrivateKey && !account0 ? (
                      <Button onClick={() => initUsersAndPrintBalances()}>
                        Initialize
                      </Button>
                    ) : (
                      ''
                    )}
                    {!accountPrivateKey ? (
                      <Button onClick={() => login()}>Connect Wallet</Button>
                    ) : (
                      ''
                    )}
                    {spendingSigner && account0 ? (
                      <>
                        {minted ? (
                          <Button>Export to L1</Button>
                        ) : (
                          <Button onClick={() => mint()}>Mint my NFT</Button>
                        )}
                        {/* <Button onClick={() => getBalance()}>
                          Get Balance
                        </Button> */}
                      </>
                    ) : (
                      ''
                    )}
                    {spendingSigner && account0 && virtualAssetId ? (
                      <Button onClick={() => mapVirtualAssetToNFT()}>
                        retrieve NFT ID
                      </Button>
                    ) : (
                      ''
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
                      <Button onClick={() => getSpendingKey()}>
                        Create My Spending Key
                      </Button>
                    ) : (
                      ''
                    )}
                  </div>
                ) : (
                  ''
                )}
              </div>
            </div>
            <div className="img-wrapper">
              {minted ? (
                <span className="amount">Your zkNFT</span>
              ) : (
                <span className="amount">{quanity} available</span>
              )}

              <div className="img-thing">
                <Image
                  src={`/imgs/${activeImg}.png`}
                  layout="fill"
                  objectFit="cover"
                />
              </div>
              {!minted && <span className="price">Price: 0Ξ</span>}
            </div>
          </div>
        </div>
      </main>

      {connecting ? 'Please wait, setting up Aztec' : ''}
    </div>
  );
};

export default Home;
