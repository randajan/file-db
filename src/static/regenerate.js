import fsp from "fs/promises";
import { _privates, removeFile } from ".";
import { mapFile } from "./map";

const _regenerateFile = async (file, isReKey, newKey, currentKey)=>{
    const _p = _privates.get(file);
    const { fullname, pathname, encoding } = _p;

    if (isReKey && _p.key && currentKey !== _p.key) {
        throw new Error(`${fullname} rekey failed. CurrentKey is invalid`);
    }

    const key = isReKey ? newKey : _p.key;

    const encode = (body, id)=>_p.encode(id, body, key);
    const tmpPath = `${pathname}.tmp`;

    const res = {
        isOk:true,
        exit:ok=>{
            if (!ok) { return removeFile(tmpPath); }
            if (isReKey) { _p.key = key; }
            return fsp.rename(tmpPath, pathname);
        }
    }

    try {
        const lines = await mapFile(file, encode);
        await fsp.writeFile(tmpPath, lines.join("\n") + "\n", encoding);
    } catch(err) {
        res.isOk = false;
        res.error = err.message || err;
    }

    return res;
}

export const regenerateFile = async (file, isReKey, newKey, currentKey)=>{
    const res = await _regenerateFile(file, isReKey, newKey, currentKey);
    await res.exit(res.isOk);
    if (!res.isOk) { throw res.error; }
}

export const regenerateFiles = async (fdb, isReKey, newKey, currentKey)=>{
    const errors = [];

    const act = await fdb.map(async (file, name)=>{
        const r = await _regenerateFile(file, isReKey, newKey, currentKey);
        if (!r.isOk) { errors.push([name, r.error]); }
        return r;
    });

    const isOk = !errors.length;
    await Promise.all(act.map(r=>r.exit(isOk)));

    if (isOk && isReKey) { _privates.get(fdb).key = newKey; }
    
    return isOk ? { isOk } : { isOk, errors };
}