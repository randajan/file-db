
import jet from "@randajan/jet-core";
import fse from "fs-extra";
import { decryptObj, encryptObj } from "./crypto";

const { solid } = jet.prop;

const _privs = new WeakMap();

export class FileDB {

    constructor(opt = { }) {
        const root = String.jet.to(opt.root);
        const alias = String.jet.to(opt.alias) || root;
        const extension = String.jet.to(opt.extension) || "fdb";
        const key = String.jet.to(opt.key);

        const _p = {
            process:null, //crypting|decrypting process
            ready:{},
            keys:[""],
            init:opt.init || (_=>({}))
        };

        _privs.set(this, _p);

        solid.all(this, {
            alias,
            root,
            extension
        });

        if (!this.root) { throw Error(this.msg("opt 'root' is required to be set")); }
        if (!jet.isRunnable(_p.init)) { throw Error(this.msg("opt 'init' must be function")); }

        if (key) { this.addKey(key, "", true)};
    }

    msg(text, name="*") {
        return `FileDB '${this.alias}\\${name}.${this.extension}' ${text}`;
    }

    async rootEnsure() {
        return fse.ensureDir(this.root);
    }

    async map(callback) {
        await this.rootEnsure();
        const ext = "."+this.extension;
        const fns = await fse.readdir(this.root);
        const res = await Promise.all(fns.map(fn=>{
            if (fn.endsWith(ext)) { return callback(fn.slice(0, -ext.length), fn); }
        }));

        return res.filter(v=>v !== undefined);
    }

    toPath(name) {
        return this.root+`\\${name}.${this.extension}`;
    }

    async exists(name) {
        return fse.exists(this.toPath(name));
    }

    async load(name) {
        await this.rootEnsure();
        const { ready, keys, init } = _privs.get(this);

        let content;
        if (await this.exists(name)) {
            content = decryptObj(await fse.readFile(this.toPath(name)), keys);
            if (!content) { throw Error(this.msg("load failed - content is unreadable", name)); }
        }

        ready[name] = true;
        return content || init(name);
    }

    async save(name, content, force=false) {
        await this.rootEnsure();
        const { ready, keys } = _privs.get(this);

        if (!jet.isMapable(content)) { throw Error(this.msg("save failed - content must be mapable", name)); }
        if ((!force && !ready[name] && await this.exists(name))) { throw Error(this.msg("save failed - not loaded yet", name)); }
        
        return fse.outputFile(this.toPath(name), encryptObj(content, keys[0]));
    }

    async addKey(newKey, currentKey="", remaster=false) {
        const _p = _privs.get(this);
        const nk = String.jet.to(newKey);
        const ck = String.jet.to(currentKey);

        if (_p.keys[0] !== ck) { throw Error(this.msg("addKey failed - currentKey missmatch")); }

        if (remaster) { _p.keys.unshift(nk); } else { _p.keys.push(nk); }

        return this.map(async name=>{
            try { await this.save(name, await this.load(name)); } catch (e) {
                return e
            }
        });

    }

}


export default opt=>new FileDB(opt);