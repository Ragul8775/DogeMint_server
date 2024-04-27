import mongoose from "mongoose";
const Schema = mongoose.Schema;

const NFTSchema = new Schema({
  nfts: { 
    type: Map, 
    of: String, 
    required: true
  },
});

const NFT = mongoose.model('NFT', NFTSchema);

export default NFT;