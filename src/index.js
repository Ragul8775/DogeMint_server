import express from "express";
import NFT from "./model/nftSchema.js"
import cors from 'cors';
import bodyParser from "body-parser";
import {Connection, PublicKey, Keypair, SystemProgram, Transaction, LAMPORTS_PER_SOL} from "@solana/web3.js";
import 'dotenv/config';
import { Metaplex, keypairIdentity, bundlrStorage, toMetaplexFile } from "@metaplex-foundation/js";

import { mongooseConnect } from "./lib/mongoConnect.js";

const port = 8000;
const app = express();



app.use(express.json());
app.use(express.json());
app.use(bodyParser.json())
app.use(cors({
  origin: 'http://localhost:3000' // Allow only your frontend URL to access the backend
}));

const connection = new Connection("https://tiniest-fluent-water.solana-devnet.quiknode.pro/428929c7ca1602c0468b72fd69f26e28a5dc65f6/","finalized");
const secretKey = Uint8Array.from(Object.values(JSON.parse(process.env.SOLANA_SECRET_KEY)))
const wallet = Keypair.fromSecretKey(secretKey) 
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet))
async function checkBalance() {
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(wallet.publicKey)
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
}

async function saveNFT(creatorPublicKey, nftAddress){
  try {
    await mongooseConnect()
    const nftDocument = new NFT({
      nfts: new Map([[creatorPublicKey, nftAddress]])
    });
    await nftDocument.save()
    console.log("NFT Saved SuccessFully")
  } catch (error) {
    console.error('Failed to save NFT:', error);
  }
}



app.post('/api/prepare-mint',async (req,res)=>{
  console.log('Received data:', req.body);
  const { metaUri, name, symbol, sellerFee, creators } = req.body;
  
  checkBalance();
  try {
    const creatorsWithPublicKey = creators.map(creator => ({
      ...creator,
      address: new PublicKey(creator.address)
  }));
    const { nft } = await metaplex.nfts().create({
        uri: metaUri,
        name,
        symbol,
        sellerFeeBasisPoints: sellerFee,
        creators: creatorsWithPublicKey,
        isMutable: true
    });

    console.log(nft)
    if (nft.address !== undefined) {
      console.log(
        `Minted NFT: https://explorer.solana.com/address/${nft.address}?cluster=devnet`
      );
     const mongoRes= await saveNFT(nft.address,creatorsWithPublicKey)
      res.status(200).json(mongoRes)
}  }catch (error) {
    console.error('Failed to prepare mint:', error);
    res.status(500).json({ error: 'Failed to prepare mint', details: error.message });
  }

})
app.get('/', async (req, res) => {
  try {
    await mongooseConnect();
      const nfts = await NFT.find({});
      res.json(nfts);
  } catch (error) {
      res.status(500).json({ message: error.message });
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
