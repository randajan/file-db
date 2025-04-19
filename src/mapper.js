import { _privates } from "./priv";
import { readFile } from "./tools";


export const mapFile = async (file, exe) => {
    const { pathname, parent } = file;
    const { decode } = _privates.get(parent);
    const seen = new Set();
    const result = [];

    const raw = await readFile(pathname, parent.encoding);
    const lines = (raw || "").split(/\r?\n/);

    for (let i = lines.length - 1; i >= 0; i--) {
        const line = lines[i];
        if (!line) { continue; }

        const [id, ...frags] = line.split(/\s/);
        if (seen.has(id)) { continue; }
        seen.add(id);
        result.push(decode(file, frags.join(""), id, exe));
    }

    return Promise.all(result);
}