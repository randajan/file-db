import fs from "fs/promises";
import path from "path";
import { _privates } from "../priv";
import { readFile, setLocks } from "../tools";
import { mapFile } from "../mapper";


export class FileDB {
    constructor(parent, name, lock) {
        if (!name) { throw new Error("FileDB requires name");  }

        const fullname = `${name}.${parent.extension}`;
        const pathname = path.join(parent.root, fullname);

        const enumerable = true;
        Object.defineProperties(this, {
            parent:{ value:parent },
            name:{ enumerable, value:name },
            fullname:{ enumerable, value:fullname },
            pathname:{ enumerable, value:pathname },
        });
        
        setLocks(lock, this, "isReadable", "write", "map");
    }

    async isReadable() {
        const { decode } = _privates.get(this.parent);

        const raw = await readFile(pathname, parent.encoding);
        if (!raw) { return true; }
        const line = raw.split(/\r?\n/)[0];
        if (!line) { return true; }
        const [id, ...frags] = line.split(/\t/);
        try { await decode(this, frags.join(""), id); }
        catch { return false; }
        return true;
    }

    async write(record, id) {
        const { pathname, parent } = this;
        const { encode } = _privates.get(parent);

        const line = await encode(this, record, id);
        await fs.appendFile(pathname, line + "\n", parent.encoding);
    }

    async map(exe) {
        return mapFile(this, exe);
    }

    async collect(collector, exe) {
        await this.map((rec, id)=>exe(collector, rec, id));
        return collector;
    }

    async reduce(initialValue, exe) {
        let res = initialValue;
        await this.map(async (rec, id)=>res = await exe(res, rec, id));
        return res;
    }

    async values() { return this.map(rec=>rec); }
    async keys() { return this.map((rec, id)=>id); }
    async entries() { return this.map((rec, id)=>[id, rec]); }
    async index() { return this.collect({}, (c, rec, id)=>c[id] = rec); }
}
