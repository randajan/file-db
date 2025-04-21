import { _privates, readLines } from ".";

export const verifyFile = async (file, isCheckKey, key)=>{
    const _p = _privates.get(file);
    const { pathname, decode, encoding } = _p;
    const lines = await readLines(pathname, encoding);
    key = isCheckKey ? key : _p.key;

    try { decode(lines[0], key); }
    catch(err) {
        _p.isReadable = false;
        _p.error = err;
        throw err;
    }
    
    _p.key = key;
    _p.isReadable = true;
    delete _p.error;
}

export const verifyFiles = async (fdb, isCheckKey, key)=>{
    const errors = [];

    await fdb.map(async (file, name)=>{
        return verifyFile(file, isCheckKey, key).catch(err=>errors.push([name, err]));
    });
    
    return errors.length ? { isOk:false, errors } : { isOk:true }
}