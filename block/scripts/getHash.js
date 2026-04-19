const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const contract = await ethers.getContractAt(
    "FirmwareRegistry",
    contractAddress
  );

  const version = "1.0";

  const hash = await contract.getHash(version);

  console.log("Hash from blockchain:", hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});