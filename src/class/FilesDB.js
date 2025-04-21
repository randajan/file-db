
import path from "path";
import createLock from "@randajan/treelock";

import { FileDB } from "./FileDB";
import { _privates, setThreads } from "../static";
import { regenerateFiles } from "../static/regenerate";
import { verifyFiles } from "../static/verify";


export class FilesDB {
    constructor(options = {}) {
        const _p = {};
        _p.files = new Map();

        const name = _p.name = options.name ?? "FDB";
        _p.dir = options.dir ?? ".";
        _p.extension = options.extension ?? "fdb";
        _p.encoding = options.encoding ?? "utf8";
        _p.encrypt = options.encrypt ?? (json=>json);
        _p.decrypt = options.decrypt ?? (json=>json);
        _p.getId = options.getId ?? (rec=>rec.id);
        _p.key = options.key;
        const ttl = _p.timeout = options.timeout ?? 30000;
        _p.thread = createLock({ name, ttl, on:options.on });

        const enumerable = true;
        Object.defineProperties(this, {
            dir: { enumerable, value: _p.dir },
            extension: { enumerable, value: _p.extension },
            encoding: { enumerable, value: _p.encoding },
            thread:{ value:_p.thread }
        });

        _privates.set(this, _p);

        setThreads(_p.thread, this, "verify", "unlock", "optimize", "rekey");
    }

    toPathname(name) { return path.join(this.dir, `${name}.${this.extension}`); }

    link(name, options={}, throwError=true) {
        const { files } = _privates.get(this);
        if (!files.has(name)) { files.set(name, new FileDB(this, name, options)); }
        else if (throwError) { throw new Error(`File '${name}' already linked`); }
        return files.get(name);
    }

    unlink(name, throwError=true) {
        const { files } = _privates.get(this);
        if (files.has(name)) { files.delete(name); }
        else if (throwError) { throw new Error(`File '${name}' wasn't linked`); }
        return true;
    }

    get(name, throwError=true) {
        const { files } = _privates.get(this);
        const file = files.get(name);
        if (file) { return file; }
        else if (throwError) { throw new Error(`File '${name}' wasn't linked`); }
    }

    async map(exe) {
        const { files } = _privates.get(this);
        const result = [];
        for (const file of files.values()) { result.push(exe(file, file.name)); }
        return Promise.all(result);
    }

    async collect(collector, exe) {
        await this.map((file, name) => exe(collector, file, name));
        return collector;
    }

    async reduce(initialValue, exe) {
        let res = initialValue;
        await this.map(async file => res = await exe(res, file));
        return res;
    }

    async values() { return this.map(file => file); }
    async keys() { return this.map((file, name) => name); }
    async entries() { return this.map((file, name) => [name, file]); }
    async index() { return this.collect({}, (c, file, name) => c[name] = file); }


    async verify() { return verifyFiles(this); }
    async unlock(key) { return verifyFiles(this, true, key); }

    async optimize() { return regenerateFiles(this); }
    async rekey(newKey) { return regenerateFiles(this, true, newKey); }
}