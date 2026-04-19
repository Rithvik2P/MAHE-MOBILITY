async function main() {
  const Contract = await ethers.getContractFactory("FirmwareRegistry");
  const contract = await Contract.deploy();

  await contract.waitForDeployment();

  console.log("Contract deployed at:", contract.target);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});