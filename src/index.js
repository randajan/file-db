
import jet, { RunPool } from "@randajan/jet-core";
import fse from "fs-extra";
import { saveFile, loadFile } from "./workers";

const { solid } = jet.prop;

const _privs = new WeakMap();

export class FileDB {

    constructor(opt = { }) {
        const root = String.jet.to(opt.root);
        const alias = String.jet.to(opt.alias) || root;
        const extension = String.jet.to(opt.extension) || "fdb";
        const key = String.jet.to(opt.key);
        const slash = String.jet.to(opt.slash) || "/";

        const _p = {
            ready:{},
            keys:[""],
            init:opt.init || (_=>({})),
            listeners:{}
        };

        _privs.set(this, _p);

        solid.all(this, {
            alias,
            root,
            extension,
            slash
        });

        if (!this.root) { throw Error(this.msg("opt 'root' is required to be set")); }
        if (!jet.isRunnable(_p.init)) { throw Error(this.msg("opt 'init' must be function")); }

        if (key) { _p.keys.unshift(key); };
    }

    msg(text, name="*") {
        return `FileDB '${this.alias}${this.slash}${name}.${this.extension}' ${text}`;
    }

    async rootEnsure() {
        return fse.ensureDir(this.root);
    }

    async map(callback) {
        await this.rootEnsure();
        const ext = "."+this.extension;
        const fns = await fse.readdir(this.root);
        const res = await Promise.all(fns.map(fn=>{
            if (fn.endsWith(ext)) { return callback(fn.slice(0, -ext.length), fn, this); }
        }));

        return res.filter(v=>v !== undefined);
    }

    toPath(name) {
        return `${this.root}${this.slash}${name}.${this.extension}`;
    }

    async exists(name) {
        return fse.exists(this.toPath(name));
    }

    async load(name) {
        await this.rootEnsure();
        const { ready, keys, init } = _privs.get(this);

        let content;
        if (await this.exists(name)) {
            content = await loadFile(this.toPath(name), keys);
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
        
        return saveFile(this.toPath(name), content, keys[0]);
    }

    async addKey(newKey, currentKey="", reencrypt=false) {
        const _p = _privs.get(this);
        const nk = String.jet.to(newKey);
        const ck = String.jet.to(currentKey);

        if (_p.keys[0] !== ck) { throw Error(this.msg("addKey failed - currentKey missmatch")); }

        if (_p.listeners.beforeAddKey) { await Promise.all(_p.listeners.beforeAddKey.run(reencrypt)); }

        if (reencrypt) { _p.keys.unshift(nk); } else { _p.keys.push(nk); }
        _p.keys = _p.keys.filter((v, i)=>_p.keys.indexOf(v) === i);

        const listOfErrors = await this.map(async name=>{
            try { await this.save(name, await this.load(name)); }
            catch (e) { return e; }
        });

        if (_p.listeners.afterAddKey) { await Promise.all(_p.listeners.afterAddKey.run(reencrypt, listOfErrors)); }

        return listOfErrors;
    }

    on(event, callback) {
        const { listeners } = _privs.get(this);
        const le = listeners[event] || (listeners[event] = (new RunPool()).with(this));
        le.add(callback);
        return _=>le.remove(callback);
    }

}


export default opt=>new FileDB(opt);