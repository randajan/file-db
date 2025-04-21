import fsp from "fs/promises";
import { _privates, removeFile } from ".";
import { mapFile } from "./map";

const _regenerateFile = async (file, isReKey, key)=>{
    const _p = _privates.get(file);
    const { pathname, encoding } = _p;

    key = isReKey ? key : _p.key;

    const encode = (body, id)=>_p.encode(id, body, key);
    const tmpPath = `${pathname}.tmp`;

    const res = {
        isOk:true,
        exit:ok=>{
            if (!ok) { return removeFile(tmpPath); }
            _p.key = key;
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

export const regenerateFile = async (file, isReKey, key)=>{
    const res = await _regenerateFile(file, isReKey, key);
    await res.exit(res.isOk);
    if (!res.isOk) { throw res.error; }
}

export const regenerateFiles = async (fdb, isReKey, key)=>{
    const errors = [];

    const act = await fdb.map(async (file, name)=>{
        const r = await _regenerateFile(file, isReKey, key);
        if (!r.isOk) { errors.push([name, r.error]); }
        return r;
    });

    const isOk = !errors.length;
    await Promise.all(act.map(r=>r.exit(isOk)));
    
    return isOk ? { isOk } : { isOk, errors };
}