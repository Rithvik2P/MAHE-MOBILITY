// const { ethers } = require("ethers");

// const ver = "v3.0"

// async function getAuthorizedHash(version) {
//     const provider = new ethers.JsonRpcProvider("http://10.198.247.164:8545/");
//     const contractAddress = "0x5fbdb2315678afecb367f032d93f642f64180aa3";
//     const abi = ["function getHash(string memory version) public view returns (string memory)", "function getLatestVersion() public view returns(string memory)"];
//     const contract = new ethers.Contract(contractAddress, abi, provider);

//     const latestCheck = await contract.getLatestVersion();
    
//     if(ver!=latestCheck){
//         console.log("Version not latest, abort");
//         return;
//     }

//     try {
//         const officialHash = await contract.getHash(version);
        
//         if (!officialHash || officialHash === "") {
//             console.error("No record found for this version!");
//             return null;
//         }

//         console.log(`Official Hash for ${version}: ${officialHash}`);
//         return officialHash;
//     } catch (error) {
//         console.error("Fetch failed:", error.message);
//     }
// }

// getAuthorizedHash(ver);

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////


const OTHER_MACHINE_IP = '10.198.247.254';  // ← replace with actual IP

const res = await fetch(`http://${OTHER_MACHINE_IP}:3000/getmanifest`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ /* any data their endpoint expects */ }),
});

const data = await res.json();
console.log(data);

////////////////////////////////////////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////
