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

const corsOptions = {
  origin: 'https://doge-mint-client-2289.vercel.app', // or use ['https://example1.com', 'https://example2.com'] to allow multiple origins
  optionsSuccessStatus: 200 // some legacy browsers (IE11, various SmartTVs) choke on 204
};

app.use(express.json());
app.use(express.json());
app.use(bodyParser.json())
app.use(cors(corsOptions));

const connection = new Connection("https://tiniest-fluent-water.solana-devnet.quiknode.pro/428929c7ca1602c0468b72fd69f26e28a5dc65f6/","finalized");
const secretKey = Uint8Array.from(Object.values(JSON.parse(process.env.SOLANA_SECRET_KEY)))
const wallet = Keypair.fromSecretKey(secretKey) 
const metaplex = Metaplex.make(connection).use(keypairIdentity(wallet))
async function checkBalance() {
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(wallet.publicKey)
  console.log(`Balance: ${balance / LAMPORTS_PER_SOL} SOL`);
}

async function saveNFT(creatorPublicKey, nftAddress) {
  const publicKeyString = creatorPublicKey.toString();  // Ensure this is a string
  const nftId = nftAddress.toString();  // Ensure this is also a string

  try {
    await mongooseConnect();  // Ensure this connection function is properly awaited and set up

    // Use the $set operator to update the map correctly
    const updateData = {
      $set: {
        [`nfts.${publicKeyString}`]: nftId  // Properly use the string keys in the map
      }
    };

    // Attempt to update an existing document or insert a new one if none exists
    const result = await NFT.updateOne({}, updateData, { upsert: true });
    console.log("Data Updated Successfully", result);

    // If you were using a save method on a document it's not necessary here as updateOne handles it.
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

   
    if (nft.address !== undefined) {
    
        const nftExpolorer= `https://explorer.solana.com/address/${nft.address}?cluster=devnet`
        console.log("PublicKey:",creators[0].address)
        await saveNFT(nft.address,creators[0].address);
      res.status(200).json({
        explorer:nftExpolorer,
        nftAddress:nft.address
      })
}  }catch (error) {
    console.error('Failed to prepare mint:', error);
    res.status(500).json({ error: 'Failed to prepare mint', details: error.message });
  }

})
app.get('/getMint-history', async (req, res) => {
  try {
    await mongooseConnect();
      const nfts = await NFT.find({});
      console.log(nfts[0].nfts)
      res.status(200).json({"nfts":nfts[0].nfts});
  } catch (error) {
      res.status(500).json({"Error in finding the nfts": error.message });
  }
});
app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
