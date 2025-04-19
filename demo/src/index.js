import { info, log } from "@randajan/simple-lib/node";
import { FilesDB } from "../../dist/esm/index.mjs";
import CryptoJS from "crypto-js";

export const encrypt = (json, key) => {
    if (!key) { return json; }
    return CryptoJS.AES.encrypt(json, key).toString(); // výstup je string
};

export const decrypt = (raw, key) => {
    if (!key) { return raw; }
    const bytes = CryptoJS.AES.decrypt(raw, key);
    return bytes.toString(CryptoJS.enc.Utf8); // výstup je původní string
};

const fdb = new FilesDB({
    root: info.dir.root + "\\demo\\fdb", // Root directory for the database
    extension: 'fdb', // Optional file extension for the encrypted files
    encrypt,
    decrypt
});


(async ()=>{
    const users = fdb.file("users");
    fdb.setKey("srre");

    const usr = await users.index();
    console.log("A", usr);
    await users.write({ foo:"ssdsfsd-" }, "fodsa");
    console.log("B", await users.index());
    console.log(await fdb.changeKey("srre"));
    console.log("exit")
})();
