const contractAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  const contract = await ethers.getContractAt(
    "FirmwareRegistry",
    contractAddress
  );

  const version = "1.0";
  const hash = "abc123securehash";

  const tx = await contract.storeHash(version, hash);
  await tx.wait();

  console.log("Hash stored successfully");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});