import fs from "fs/promises";
import { _privates } from "./priv";
import { removeFile } from "./tools";
import { mapFile } from "./mapper";

const regenerateFile = async (file, encode)=>{
    const { pathname, parent } = file
    const tmpPath = `${pathname}.tmp`;

    const res = {
        isOk:true,
        exit:ok=>ok ? fs.rename(tmpPath, pathname) : removeFile(tmpPath)
    }

    try {
        const lines = await mapFile(file, encode);
        await fs.writeFile(tmpPath, lines.join("\n") + "\n", parent.encoding);
    } catch(err) {
        res.isOk = false;
        res.error = err.message || err;
    }

    return res;
}

export const regenerateFiles = async (fdb, key)=>{
    const _p = _privates.get(fdb);
    const rekey = (key !== undefined && key !== _p.key);
    
    const errors = [];


    const act = await fdb.map(async (file, name)=>{
        const encode = (raw, id)=>_p.encode(file, raw, id, key);
        const r = await regenerateFile(file, encode);
        if (!r.isOk) { errors.push([name, r.error]); }
        if (!rekey) { await r.exit(r.isOk); }
        return r;
    });

    const isOk = !errors.length;
    if (rekey) { await Promise.all(act.map(r=>r.exit(isOk))); }
    
    if (!isOk) { return errors; }
}