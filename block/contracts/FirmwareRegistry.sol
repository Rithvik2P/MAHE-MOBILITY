pragma solidity ^0.8.0;

contract FirmwareRegistry {

    mapping(string => string) private firmwareHashes;
    mapping(string => bool) private versionExists;

    string public latest;
    function getLatestVersion() public view returns (string memory){
        return latest;
    }



    function storeHash(string memory version, string memory hash) public {
        require(!versionExists[version], "Version already exists");
    
        firmwareHashes[version] = hash;
        versionExists[version] = true;
        latest = version;
        

    }

    function getHash(string memory version) public view returns (string memory) {
        require(versionExists[version], "Version Not Found");
        return firmwareHashes[version];
    }

   
}