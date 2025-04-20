import fs from "fs/promises";
import path from "path";
import { _privates } from "../priv";
import { fromJson, readFile, safeDecrypt, setLocks } from "../tools";
import { mapFile, verifyFile } from "../reader";
import createLock from "@randajan/treelock";
import { regenerateFile } from "../regenerator";


export class FileDB {
    constructor(parent, name, options = {}) {
        if (!name) { throw new Error("FileDB requires name"); }
        const _pp = _privates.get(parent);
        const _p = { parent, name };

        _p.status = "init" //ready, unreadable

        _p.root = options.root ?? _pp.root;
        _p.extension = options.extension ?? _pp.extension;
        _p.fullname = `${_pp.name}.${name}`;
        _p.pathname = path.join(_p.root, `${name}.${_p.extension}`);
        _p.encoding = options.encoding ?? _pp.encoding;
        _p.encrypt = options.encrypt ?? _pp.encrypt;
        _p.decrypt = options.decrypt ?? _pp.decrypt;
        _p.getId = options.getId ?? _pp.getId;
        _p.key = options.key ?? _pp.key;
        const ttl = _p.timeout = options.timeout ?? 500;
        _p.thread = createLock({ name, ttl });

        const msg = `${_p.fullname} has unreadable`;
        _p.decode = line => {
            if (!line) { return; }
            const json = safeDecrypt(_p.decrypt, line, _p.key, `${msg} record > ${line} <`);
            return fromJson(json, `${msg} record > ${json} <`);
        }

        _p.encode = (rec, key) => {
            const json = JSON.stringify(rec);
            return _p.encrypt(json, key ?? _p.key);
        }

        const enumerable = true;
        Object.defineProperties(this, {
            parent: { value: parent },
            name: { enumerable, value: _p.name },
            fullname: { enumerable, value: _p.fullname },
            pathname: { enumerable, value: _p.pathname },
            thread: { enumerable, value: _p.thread }
        });

        setLocks(_p.thread, this, "write", "lock");

        _privates.set(this, _p);
    }

    async verify() { return verifyFile(this); }

    async write(record) {
        const { pathname, parent } = this;
        const { encode } = _privates.get(this);

        const line = await encode(record);
        await fs.appendFile(pathname, line + "\n", parent.encoding);
    }

    async map(exe) { return mapFile(this, exe); }

    async collect(collector, exe) {
        await this.map((rec, id) => exe(collector, rec, id));
        return collector;
    }

    async reduce(initialValue, exe) {
        let res = initialValue;
        await this.map(async (rec, id) => res = await exe(res, rec, id));
        return res;
    }

    async values() { return this.map(rec => rec); }
    async keys() { return this.map((rec, id) => id); }
    async entries() { return this.map((rec, id) => [id, rec]); }
    async index() { return this.collect({}, (c, rec, id) => c[id] = rec); }

    async unlock(key) {
        const _p = _privates.get(this);
        _p.keys.add(key);
        return this;
    }

    async lock(newKey) { return regenerateFile(this, true, newKey); }
    async optimize() { return regenerateFile(this); }
}
