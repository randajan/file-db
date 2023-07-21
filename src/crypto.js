import CryptoJS from 'crypto-js';
import jet from "@randajan/jet-core";

export const decryptObj = (enc, keys)=>{
    enc = String(enc);
    for (const key of keys) {
        try {
            const json = key ? CryptoJS.AES.decrypt(enc, key).toString(CryptoJS.enc.Utf8) : enc;
            return JSON.parse(json);
        } catch(e) {

        }
    }
};

export const encryptObj = (obj, key="")=>{
    const json = jet.json.to(obj);
    return key ? CryptoJS.AES.encrypt(json, key).toString() : json;
}
