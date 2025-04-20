import { _privates } from "./priv";
import { readFile } from "./tools";


export const readLines = async (pathname, encoding)=>{
    const rawLines = await readFile(pathname, encoding);
    return (rawLines || "").split(/\r?\n/);
}

export const verifyFile = async (file)=>{
    const { pathname, parent } = file;
    const { decode } = _privates.get(file);
    const lines = await readLines(pathname, parent.encoding);
    decode(lines[0]);
    return true;
}

export const mapFile = async (file, exe) => {
    const { pathname, parent } = file;
    const { decode, getId } = _privates.get(file);
    const seen = new Set();
    const result = [];

    const lines = await readLines(pathname, parent.encoding);

    for (let i = lines.length - 1; i >= 0; i--) {
        const rec = decode(lines[i]);
        if (!rec) { continue; }
        const id = getId(rec);
        if (seen.has(id)) { continue; }
        seen.add(id);
        result.push(exe(rec, id));
    }

    return Promise.all(result);
}