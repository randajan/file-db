import { info, log } from "@randajan/simple-lib/node";
import createFileDB from "../../dist/esm/index.mjs";
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

const fdb = createFileDB({
    dir: info.dir.root + "\\demo\\fdb", // Root directory for the database
    extension: 'fdb', // Optional file extension for the encrypted files
    encrypt,
    decrypt,
    on:({name, ram}, state)=>{ console.log(name, state, ram); }
});

const users = fdb.link("users");
const tasks = fdb.link("tasks");


(async ()=>{
    console.log("xxx", await fdb.unlock());

    await Promise.all([
        ...Array(100).fill("").map((_, i)=>users.write("user"+i, { id:"user"+i, value:"value"+i })),
        ...Array(100).fill("").map((_, i)=>tasks.write("task"+i, { id:"task"+i, value:"value"+i }))
    ]);

    console.log("B", await users.index());
    //console.log(await fdb.addKey("srre"));
    await fdb.optimize();
    console.log("exit")
})();
