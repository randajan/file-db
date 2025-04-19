
import path from "path";
import fs from "fs/promises";
import { _privates } from "../priv";
import { FileDB } from "./FileDB";
import { fromJson, safeDecrypt, setLocks } from "../tools";
import { regenerateFiles } from "../regenerator";
import createLock from "@randajan/treelock";

export class FilesDB {
    constructor(options = {}) {
        const _p = {};

        const {
            root = ".",
            extension = "fdb",
            encoding = "utf8",

            encrypt = v => v,
            decrypt = v => v
        } = options;

        _p.files = new Map();
        _p.encrypt = encrypt;
        _p.decrypt = decrypt;
        _p.keys = new Set([""]);
        _p.lock = createLock({
            name:"root",
            ttl:30000
        });

        _p.decode = async (file, raw, rid, cb) => {
            const msg = `FDB '${file.name}' has unreadable`;
            const id = fromJson(rid, `${msg} id > ${rid} <`);
            const json = safeDecrypt(_p.decrypt, raw, _p.key, `${msg} record > ${raw} <`);
            const rec = fromJson(json, `${msg} record > ${json} <`);
            if (cb) { return cb(rec, id); }
        }

        _p.encode = async (file, rec, id, key) => {
            const rid = JSON.stringify(id);
            const json = JSON.stringify(rec);
            const raw = await _p.encrypt(json, key ?? _p.key);
            return `${rid}\t${raw}`;
        }

        const enumerable = true;
        Object.defineProperties(this, {
            root: { enumerable, value: root },
            extension: { enumerable, value: extension },
            encoding: { enumerable, value: encoding }
        });

        _privates.set(this, _p);

        setLocks(_p.lock, this, "vacuum", "changeKey");
    }

    addKey(key, isM) {
        const _p = _privates.get(this);
        _p.keys.add(key);
        return this;
    }

    setKey(key) {
        const _p = _privates.get(this);
        _p.key = key;
        return this;
    }

    toPathname(name) { return path.join(this.root, `${name}.${this.extension}`); }

    file(name) {
        const _p = _privates.get(this);

        let file = _p.files.get(name);
        if (!file) {
            const lock = _p.lock.sub({name, ttl:500});
            _p.files.set(name, file = new FileDB(this, name, lock));
        }

        return file;
    }

    async map(exe) {
        const files = await fs.readdir(this.root);

        const ext = "." + this.extension;
        const result = [];

        for (const filename of files) {
            if (!filename.endsWith(ext)) { continue; }
            const name = filename.slice(0, -ext.length);
            if (!name) { continue; }

            const file = this.file(name);
            result.push(exe(file, name));
        }

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

    async vacuum() { return regenerateFiles(this); }

    async changeKey(newKey) { return regenerateFiles(this, newKey); }
    
}