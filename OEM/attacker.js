const express = require('express');
const app=express();
app.use(express.json());
const path = require('path');
const { ethers } = require("ethers");
const { LangEn } = require('ethers');

const { spawn } = require('child_process');
const { resolve } = require('dns');


const provider = new ethers.JsonRpcProvider("http://10.198.247.164:8545/");

const privateKey = "0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d";
const wallet = new ethers.Wallet(privateKey, provider);

const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";

const abi = [
  "function storeHash(string memory version, string memory hash) public","function getLatestVersion() public view returns(string memory)","function getHash(string memory version) public view returns (string memory)"
];
const contract = new ethers.Contract(contractAddress, abi, wallet);

let latestCheck = "1";


let localversion = ""
let localhash = ""
// const pythonprocess = spawn('python3', ['encrypt.py','firmware.txt'])


async function getUpdate() {
  latestCheck = await contract.getLatestVersion();
}

async function authorizeUpdate(version) {


    const filehash = await new Promise((resolve,reject)=>{

          const pythonprocess = spawn('python3', ['encrypt.py','firmware.txt'])


          let filehash = ""
            pythonprocess.stdout.on('data',(data)=>{
              filehash+=data.toString();      
          })
          pythonprocess.stderr.on('data', (data) => {
            console.error(`Python Error: ${data}`);
        });

        pythonprocess.on("close",(code)=>{
          if(code==0){
            resolve(filehash.trim())
          }
          else{
            reject(new Error("Not working"))
          }
      })
    })


    console.log(filehash)
    console.log(`Sending hash for ${version} to blockchain...`);
    const tx = await contract.storeHash(version, filehash);
    await tx.wait();
    console.log("Update successfully authorized on-chain!");
}

// authorizeUpdate("1.0","sdjhfd");

app.post('/getmanifest',async(req,res)=>{
  try{
    // authorizeUpdate(localversion);
    latestCheck = await contract.getLatestVersion();
    officialHash = await contract.getHash(latestCheck);
    localhash = officialHash;
    console.log(latestCheck);
    console.log(officialHash);
    res.status(200).json({
      version:latestCheck,
      bundleHash:"officiadsafdsfasdflHash",
    })
  }
  catch(e){
    res.status(500).json({
      version:"Version not found",
      bundleHash:"null",
    })
    console.log(e.message)
  }
})

app.get('/getbundle',async(req,res)=>{
  try{
    const file = `${__dirname}/bundle.zip`;
    res.download(file,'bundle.zip');
  }
  catch(e){
    console.log(e.getMessage());
  }
})

app.post('/push-update',async(req,res)=>{
  const apikey = req.get('apikey');
  const version = req.get('version');
  localversion = version;
  if(apikey=="0x1234"){
    authorizeUpdate(version);
    return res.status(200).json({success:"True"})
  }
  else{
    return res.status(404).json({success:"False"})
  }
})

app.listen(3000, ()=>console.log("Running on port 3000"));

// authorizeUpdate("1.0")

