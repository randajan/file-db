import fsp from "fs/promises";

export const _privates = new WeakMap();

export const readFile = async (pathname, enc="utf8")=>{
    try {
        return await fsp.readFile(pathname, enc);
    } catch (err) {
        if (err.code !== "ENOENT") { throw err; }
    }
}

export const readLines = async (pathname, encoding)=>{
    const rawLines = await readFile(pathname, encoding);
    return (rawLines || "").split(/\r?\n/);
}

export const removeFile = async (pathname)=>{
    try { await fsp.unlink(pathname); } catch {}
}

export const fromJson = (json, errorMessage)=>{
    try { return JSON.parse(json); }
    catch { throw new Error(errorMessage); }
}

export const safeDecrypt = (decrypter, raw, key, errorMessage)=>{
    try { return decrypter(raw, key); }
    catch { throw new Error(errorMessage); }
}


export const setThread = (thread, self, name)=>{
    const hijack = self[name].bind(self);
    self[name] = thread.wrap(hijack);
}

export const setThreads = (thread, self, ...names)=>{
    for (const name of names) {
        setThread(thread, self, name);
    }
}