import Head from 'next/head'
import Image from 'next/image'
import { Inter } from 'next/font/google'
import styles from '@/styles/Home.module.css'
import { BigNumber, Contract, providers,utils } from 'ethers';
import Web3Modal from 'web3modal';
import { subgraphQuery } from '../utils';
import { RANDOM_GAME_NFT_CONTRACT_ADDRESS, abi} from '../constants';
import { FETCH_CREATED_GAME } from '../queries';
import React,{ useState, useEffect, useRef } from 'react';
const inter = Inter({ subsets: ['latin'] })

export default function Home() {
  const zero = BigNumber.from("0");
  //WalletConnected keeps track of whhether the wallet is connected or not
  const [walletConnected, setWalletConnected] = useState(false);
  // loading is set to true when we are waiting for a transaction to get mined
  const [loading, setLoading] = useState(false);
  //Boolean to keep track of the whether connected account is owner or not.
  const [isOwner, setIsOwner] = useState(false);
  //EntryFee is the ether required to enter a game.
  const [entryFee, setEntryFee] = useState(zero);
  //maxPlayer is the maximum number of players required to play the game.
  const [maxPlayers, setMaxPlayers] =  useState(0);
  //Check if the game has started or not.
  const [gameStarted, setGameStarted] = useState(false);
  //players that joined 
  const [players, setPlayers] = useState([]);

  //Winner of the Game.
  const [winner, setWinner] = useState();
  
  // Keep a track of all the logs for a given game.
  const[logs, setLogs] = useState([]);
  
  const web3ModalRef = useRef();

  //Force update is used to force react to rerender the page when we want to.
  //So here we will force update to show new Logs.

  const forceUpdate = React.useReducer(() => ({}), {})[1];
  
  const connectWallet = async() => {
    try {
      await getProviderOrSigner();
      setWalletConnected(true);
    } catch (error) {
      console.log(error,"error from connectWallet");
    }
  }
  
  const getProviderOrSigner = async(needSigner = false) => {
    const provider = await web3ModalRef.current.connect();
    const web3Provider = new providers.Web3Provider(provider);
    const {chainId} = await web3Provider.getNetwork();

    if(chainId !== 80001){
      window.alert("Change the network to Mumbai");
      throw new Error("Change the network to Mumbai");
    }
    if(needSigner){
      const signer = web3Provider.getSigner();
      return signer;
    }
    return web3Provider;
  }
  //StartGame :- It's called by the owner to start the game.
  const startGame = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const randomGameNFTContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        signer,
      );
      setLoading(true);
      const tx  = await randomGameNFTContract.startGame(maxPlayers,entryFee);
      console.log(entryFee,"EntryFee from startGame");
      await tx.wait();
      setLoading(false);
    } catch (error) {
      console.log(error, "Error from the StartGame");
      setLoading(false);
    }
  } 
   
  //JoinGame is called by the player to join the Game.

  const JoinGame = async() => {
    try {
      const signer = await getProviderOrSigner(true);
      const randomGameNFTContract = new Contract(
        RANDOM_GAME_NFT_CONTRACT_ADDRESS,
        abi,
        signer
      );
      setLoading(true);
      const tx = await randomGameNFTContract.joinGame({ value : entryFee});
      console.log(entryFee,"EntryFee");
      await tx.wait();
      setLoading(false);
    } catch (error) {
      console.log(error,"Error from joinGame");
      setLoading(false);
    }
  }

 const checkIfGameStarted = async() => {
  try {
    const provider = await getProviderOrSigner();
    //We connected here using provider as we are reading the state from the Blockchain.
    const randomGameNFTContract = new Contract(
      RANDOM_GAME_NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );

    //read the gameStarted boolean from the contract.
    const _gameStarted = await randomGameNFTContract.gameStarted();
    const _gameArray = await subgraphQuery(FETCH_CREATED_GAME());
    const _game = _gameArray.games[0];
    let _logs = [];
    if(_gameStarted){
      _logs = [`Game has started with ID : ${_game.id}`];
      if(_game.players && _game.players.length > 0){
       _logs.push(`${_game.players.length}/${_game.maxPlayers} already joined 👀`);
       _game.players.forEach((player) => {
        _logs.push(`${player} joined 🏃`);
       });
      }
      setEntryFee(BigNumber.from(_game.entryFee));
      setMaxPlayers(_game.maxPlayers);

    } else if (!gameStarted && _game.winner){
      _logs = [`Last game has ended with ID : ${_game.id}`,
          `Winner is : ${_game.winner} 🎉`,
          `Waiting for host to start new Game....` 
    ];
    setWinner(_game.winner);
    }
    setLogs(_logs);
    setPlayers(_game.players);
    setGameStarted(_gameStarted);
    forceUpdate();
  } catch (error) {
    console.log(error,"Error from checkIfGameStarted");
  }

 }

 //GetOwner: calls the contract to retrieve the owner.
 const getOwner = async() => {
  try {
    const provider = await getProviderOrSigner();
    const randomnGameNFTContract = new Contract(
      RANDOM_GAME_NFT_CONTRACT_ADDRESS,
      abi,
      provider
    );
    //Call the owner function from the Contract.
    const _owner = await randomnGameNFTContract.owner();
    const signer = await getProviderOrSigner(true);
    const address = await signer.getAddress();
    if(address.toLowerCase() === _owner.toLowerCase()){
      setIsOwner(true);
    }
  } catch (error) {
   console.log(error, "Error from getOwner");
  }
 }
 useEffect(() => {
 if(!walletConnected){
  web3ModalRef.current = new Web3Modal({
    network: "mumbai",
    providerOptions: {},
    disableInjectedProvider: false,
  });
  connectWallet();
  getOwner();
  checkIfGameStarted();
  setInterval(() => {
    checkIfGameStarted();
  }, 2000);
 }
 }, [walletConnected]);

 const renderButton = () => {
  if(!walletConnected){
    return(
      <button onClick={connectWallet} className={styles.button}>Connect your wallet</button>
    );
  }
  if(loading){
    return <button className={styles.button}>Loading...</button>
  }
  if(gameStarted){
    if(players.length === maxPlayers){
      return (
        <button className={styles.button} disabled>Choosing winner....</button>
      );
    }
  
  return (
    <div>
      <button className={styles.button} onClick={JoinGame}>Join Game </button>
    </div>
  );
}
if(isOwner && !gameStarted){
  return(
    <div>
      <input 
        type = "number"
        className={styles.input}
        onChange = { (e) => {
          setEntryFee(e.target.value >= 0
          ? utils.parseEther(e.target.value.toString()) : zero)
        }}
        placeholder="Entry Fee (ETH)"
      />
      <input 
        type="number"
        className={styles.input}
        onChange={(e) => {
          setMaxPlayers(e.target.value ?? 0);
        }}
        placeholder="Max players"
      />
      <button className={styles.button} onClick={startGame}>Start Game</button> 
    </div>
  );
 }
 }
  return (
    <>
      <Head>
        <title>LW3Punks</title>
        <meta name="description" content="Generated by create next app" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
     <div className={styles.main}>
       <div>
        <h1 className={styles.title}>Welcome to Random winner game</h1>
        <div>
          It's a lottery game where a winner is chosen at random and wins the 
          entire lottery pool
        </div>
        {renderButton()}
        {logs && 
        logs.map((log, index) => {
          <div className={styles.log} key={index}>{log}</div>
        })}
       </div>
       <div>
        <img src="./randomWinner.png" alt="Ranom Winner Game" />
       </div>
     </div>
     <footer>Made with &#10084; by Mahima</footer>
    </>
  )
}
