import { _privates, readLines } from ".";


export const mapFile = async (file, exe) => {
    const _p = _privates.get(file);
    const { pathname, decode, encoding, getId, key } = _p;
    const seen = new Set();
    const result = [];

    const lines = await readLines(pathname, encoding);

    try {
        for (let i = lines.length - 1; i >= 0; i--) {
            const rec = decode(lines[i], key);
            if (!rec) { continue; }
            const id = getId(rec);
            if (seen.has(id)) { continue; }
            seen.add(id);
            result.push(exe(rec, id));
        }
    } catch(err) {
        _p.isReadable = false;
        _p.error = err;
        throw err;
    }

    _p.isReadable = true;
    delete _p.error;

    return Promise.all(result.reverse());
}