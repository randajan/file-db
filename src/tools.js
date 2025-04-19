import fs from "fs/promises";


export const readFile = async (pathname, enc="utf8")=>{
    try {
        return await fs.readFile(pathname, enc);
    } catch (err) {
        if (err.code !== "ENOENT") { throw err; }
    }
}

export const removeFile = async (pathname)=>{
    try { await fs.unlink(pathname); } catch {}
}

export const fromJson = (json, errorMessage)=>{
    try { return JSON.parse(json); }
    catch { throw new Error(errorMessage); }
}

export const safeDecrypt = (decrypter, raw, key, errorMessage)=>{
    try { return decrypter(raw, key); }
    catch { throw new Error(errorMessage); }
}


export const setLock = (lock, self, name)=>{
    const hijack = self[name].bind(self);
    self[name] = lock.wrap(hijack);
}

export const setLocks = (lock, self, ...names)=>{
    for (const name of names) {
        setLock(lock, self, name);
    }
}