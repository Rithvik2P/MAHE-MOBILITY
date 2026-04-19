from Crypto.Cipher import AES
from Crypto.Random import get_random_bytes
from quantcrypt.kem import MLKEM_768
from quantcrypt.cipher import KryptonKEM
from quantcrypt.dss import MLDSA_65

import zipfile
import sys
import hashlib

binpath = sys.argv[1]

def create_deterministic_zip():
    files = ["./aeskey.bin","./ciphertext.enc","./nonce.bin","./tag.bin","./signature.sig"]

    files.sort()


    with zipfile.ZipFile("bundle.zip","w",zipfile.ZIP_DEFLATED) as zf:
        for file in files:
            zip_info = zipfile.ZipInfo(filename=file, date_time=(1980,1,1,0,0,0))
            zip_info.external_attr = 0o644<<16
            zip_info.compress_type = zipfile.ZIP_DEFLATED

            with open(file, "rb") as f:
                zf.writestr(zip_info,f.read())


def getfilehash():
    sha256 = hashlib.sha256()
    with open("bundle.zip","rb") as cmphash:
        while chunk := cmphash.read(8192):
            sha256.update(chunk)
    return sha256.hexdigest()   




kem = MLKEM_768()

# public_key, secret_key = kem.keygen()

dsa = MLDSA_65()

# public_dsa, private_dsa = dsa.keygen()

########################################################################


with open("sigprivatekey.bin","rb") as sigprivatekey:
    private_dsa = sigprivatekey.read()

with open("carpublickey.bin","rb") as carpublickey:
    public_key=carpublickey.read()

signature = dsa.sign(private_dsa,b"Hello")

with open("signature.sig","wb") as signaturefile:
    signaturefile.write(signature)

########################################################################



# with open("sigpublickey.bin","wb") as sigpublickey:
#     sigpublickey.write(public_dsa)

# with open("sigprivatekey.bin","wb") as sigprivatekey:
#     sigprivatekey.write(private_dsa)

# with open("carprivatekey.bin","wb") as carprivatekey:
#     carprivatekey.write(secret_key)

# with open("carpublickey.bin","wb") as carpublickey:
#     carpublickey.write(public_key)


cipher_text, shared_secret = kem.encaps(public_key)


key = shared_secret
cipher = AES.new(key, AES.MODE_GCM)

with open("firmware.txt","rb") as firmware:
    data = firmware.read()

# data = b"Hello"

nonce = cipher.nonce
ciphertext, tag = cipher.encrypt_and_digest(data)

with open("aeskey.bin","wb") as key_file:
    key_file.write(shared_secret)

with open("nonce.bin","wb") as nonce_file:
    nonce_file.write(nonce)

with open("ciphertext.enc","wb") as ciphertext_file:
    ciphertext_file.write(ciphertext)


with open("tag.bin","wb") as tag_file:
    tag_file.write(tag)

with open("myfile.enc","wb") as encryptedfile:
    encryptedfile.write(cipher_text)



create_deterministic_zip()
print(getfilehash())


# print(secret_key)
   

# with open ("mykey.key","rb") as file:
#     key = file.read()

# with open ("nonce.bin",)



# cipher = AES.new(key, AES.MODE_EAX, nonce=nonce)
# plaintext = cipher.decrypt(ciphertext)


# try:
#     cipher.verify(tag)

# except:
#     print("Incorrect key")

# print(plaintext)