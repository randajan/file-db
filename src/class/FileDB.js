import fsp from "fs/promises";
import fs from "fs";
import path from "path";
import createLock from "@randajan/treelock";

import { _privates, fromJson, safeDecrypt, setThreads } from "../static";
import { mapFile } from "../static/map";
import { regenerateFile } from "../static/regenerate";
import { verifyFile } from "../static/verify";


export class FileDB {
    constructor(parent, name, options = {}) {
        if (!name) { throw new Error("FileDB requires name"); }
        const _pp = _privates.get(parent);
        const _p = { parent, name };
        
        _p.dir = options.dir ?? _pp.dir;
        _p.extension = options.extension ?? _pp.extension;
        _p.fullname = `${_pp.name}.${name}`;
        _p.pathname = path.join(_p.dir, `${name}.${_p.extension}`);
        _p.encoding = options.encoding ?? _pp.encoding;
        _p.encrypt = options.encrypt ?? _pp.encrypt;
        _p.decrypt = options.decrypt ?? _pp.decrypt;
        _p.getId = options.getId ?? _pp.getId;
        _p.key = options.key ?? _pp.key;
        const ttl = _p.timeout = options.timeout ?? 500;
        _p.thread = _pp.thread.sub({ name, ttl, on:options.on });

        const msg = `${_p.fullname} is unreadable.`;

        _p.isReadable = false;
        _p.error = new Error(`${msg} Never verified`)

        _p.decode = (line, key) => {
            if (!line) { return; }
            const json = safeDecrypt(_p.decrypt, line, key, `${msg} Line > ${line} <`);
            return fromJson(json, `${msg} Record > ${json} <`);
        }

        _p.encode = (rec, key) => {
            const json = JSON.stringify(rec);
            return _p.encrypt(json, key);
        }

        const enumerable = true;
        Object.defineProperties(this, {
            parent: { value: parent },
            name: { enumerable, value: _p.name },
            fullname: { enumerable, value: _p.fullname },
            pathname: { enumerable, value: _p.pathname },
            isReadable:{ enumerable, get:_=>_p.isReadable},
            error:{ enumerable, get:_=>_p.error },
            thread: { enumerable, value: _p.thread }
        });

        setThreads(_p.thread, this, "map", "write", "verify", "unlock", "optimize", "rekey");

        _privates.set(this, _p);
    }

    async write(record) {
        const { pathname, encoding, encode, isReadable, error, key } = _privates.get(this);
        if (!isReadable) { throw error; }
        const line = encode(record, key);
        await fsp.appendFile(pathname, line + "\n", encoding);
    }

    writeSync() {
        const { pathname, encoding, encode, isReadable, error, key  } = _privates.get(this);
        if (!isReadable) { throw error; }
        const line = encode(record, key);
        fs.appendFileSync(pathname, line + "\n", encoding);
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

    async verify() { return verifyFile(this); }
    async unlock(key) { return verifyFile(this, true, key); }

    async optimize() { return regenerateFile(this); }
    async rekey(newKey) { return regenerateFile(this, true, newKey); }
}
