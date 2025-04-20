
import path from "path";
import fs from "fs/promises";
import { _privates } from "../priv";
import { FileDB } from "./FileDB";
import { setLocks } from "../tools";
import { regenerateFiles } from "../regenerator";
import createLock from "@randajan/treelock";

export class FilesDB {
    constructor(options = {}) {
        const _p = {};
        _p.files = new Map();

        const name = _p.name = options.name ?? "FDB";
        _p.root = options.root ?? ".";
        _p.extension = options.extension ?? "fdb";
        _p.encoding = options.encoding ?? "utf8";
        _p.encrypt = options.encrypt ?? (json=>json);
        _p.decrypt = options.decrypt ?? (json=>json);
        _p.getId = options.getId ?? (rec=>rec.id);
        _p.key = options.key;
        const ttl = _p.timeout = options.timeout ?? 30000;
        _p.thread = createLock({ name, ttl });

        const enumerable = true;
        Object.defineProperties(this, {
            root: { enumerable, value: _p.root },
            extension: { enumerable, value: _p.extension },
            encoding: { enumerable, value: _p.encoding },
            thread:{ value:_p.thread }
        });

        _privates.set(this, _p);

        setLocks(_p.thread, this, "optimize", "lock");
    }

    toPathname(name) { return path.join(this.root, `${name}.${this.extension}`); }

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


    async unlock(key) {
        const _p = _privates.get(this);
        _p.keys.add(key);
        return this;
    }

    async lock(newKey) { return regenerateFiles(this, true, newKey); }
    
    async optimize() { return regenerateFiles(this); }
}