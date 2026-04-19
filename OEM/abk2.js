// Machine 3: vehicle-client.js
const fs = require('fs');
const { Readable } = require('stream');
const { finished } = require('stream/promises');

async function downloadFile() {
    const url = "http://10.198.247.254:3000/getbundle";
    const destination = "./firmwareNew.zip";

    console.log("Starting download...");
    const response = await fetch(url);

    if (!response.ok) throw new Error(`Unexpected response ${response.statusText}`);

    const fileStream = fs.createWriteStream(destination);
    
    await finished(Readable.fromWeb(response.body).pipe(fileStream));

    console.log("Download complete! Saved to:", destination);
}

downloadFile();