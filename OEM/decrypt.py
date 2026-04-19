from Crypto.Cipher import AES
from quantcrypt.kem import MLKEM_512


kem = MLKEM_512()

with open("myfile.enc","rb") as ciphertext:
    cipher_text = ciphertext.read()

with open("aeskey.bin","rb") as key_file:
    key = key_file.read()

shared_secret_copy = kem.decaps(key,cipher_text)


with open("nonce.bin","rb") as nonce_file:
    nonce = nonce_file.read()

with open("ciphertext.enc","rb") as ciphertext_file:
    ciphertext = ciphertext_file.read()

with open("tag.bin","rb") as tag_file:
    tag = tag_file.read()


cipher = AES.new(shared_secret_copy, AES.MODE_EAX, nonce=nonce)
plaintext = cipher.decrypt(ciphertext)

try:
    cipher.verify(tag)

except:
    print("Incorrect key")

print(plaintext.decode())

with open("update.txt","wb") as newupdate:
    newupdate.write(plaintext)


