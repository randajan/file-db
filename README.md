# @randajan/file-db

[![NPM](https://img.shields.io/npm/v/@randajan/file-db.svg)](https://www.npmjs.com/package/@randajan/file-db) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)


**FileDB** is a minimalistic file-based adapter for storing and retrieving records using append-only logs. It is not a database. It is a thin and efficient layer for handling records in plain files — optimized for performance, clarity, and simplicity.

---

## 📌 Philosophy

FileDB is not a database. It does not manage schemas, indexes, or validation. Instead, it provides:

- **Raw access to record-based file logs**
- **Encryption support** via user-defined `encrypt`/`decrypt`
- **Per-record identification** for deduplication and optimization
- **Thread-safe writes** using [`@randajan/treelock`](https://www.npmjs.com/package/@randajan/treelock)

You are responsible for data shape and logic. FileDB focuses solely on reliable, structured persistence.

---

## 🚀 Example

```js
import createFileDB from "@randajan/file-db";
import CryptoJS from "crypto-js";

const fdb = createFileDB({
    dir: "./data",
    extension: "fdb",
    encrypt:(json, key) => {
        if (!key) return json;
        return CryptoJS.AES.encrypt(json, key).toString();
    },
    decrypt:(raw, key) => {
        if (!key) return raw;
        const bytes = CryptoJS.AES.decrypt(raw, key);
        return bytes.toString(CryptoJS.enc.Utf8);
    },
    on: ({ name, ram }, state) => {
        console.log(`${name} changed state to`, state, `(${ram} in queue)`);
    }
});

const users = fdb.link("users");

await fdb.unlock("secret-key");

await users.write("john", { role: "admin" });
console.log(await users.index());

await fdb.optimize();
```

---

## ⚙️ Options

All options are passed to `FilesDB` on creation.

| Option     | Type       | Description |
|------------|------------|-------------|
| `dir`     | `string`   | Root directory path |
| `extension`| `string`   | File extension (without `.`) |
| `encoding` | `string`   | File encoding |
| `encrypt(json, key)` | `function` | Must return string |
| `decrypt(raw, key)` | `function` | Must return JSON string |
| `timeout` | `number` | Option will be passed as __ttl__ to [`@randajan/treelock`](https://www.npmjs.com/package/@randajan/treelock`) |
| `on(thread, state)` | `function` | Hook from [`@randajan/treelock`](https://www.npmjs.com/package/@randajan/treelock`) |

🔒 **Hooks must not be asynchronous.**

---

## 🔁 Inheritance

Options passed to `FilesDB` are inherited by default in `FileDB`. However, each file can override them individually when calling `.link(name, options)`.

---

## 📘 FilesDB Properties

| Property     | Type     | Description |
|--------------|----------|-------------|
| `dir`       | `string` | Root path |
| `extension`  | `string` | File extension |
| `encoding`   | `string` | File encoding |
| `thread`     | `TreeLock` | See [`@randajan/treelock`](https://www.npmjs.com/package/@randajan/treelock) |

---

## 📘 FileDB Properties

| Property     | Type     | Description |
|--------------|----------|-------------|
| `name`       | `string` | File name |
| `fullname`   | `string` | Namespaced name (e.g. `MyDB.users`) |
| `pathname`   | `string` | Full path to the file |
| `isReadable` | `boolean`| Whether file is readable |
| `error`      | `Error?` | Last read-related error |
| `thread`     | `TreeLock` | See [`@randajan/treelock`](https://www.npmjs.com/package/@randajan/treelock) |

---

## 📚 API Overview

This section provides a detailed explanation of all public methods of `FilesDB` and `FileDB`.

---

### 🔹 FilesDB

#### `link(name: string, options?: object, throwError?: boolean): FileDB`  
**Synchronous**  
Links a file by name and returns its `FileDB` instance. Throws if already linked (unless `throwError` is false).

#### `unlink(name: string, throwError?: boolean): boolean`  
**Synchronous**  
Unlinks a file. Throws if not linked (unless `throwError` is false).

#### `get(name: string, throwError?: boolean): FileDB`  
**Synchronous**  
Returns the `FileDB` instance for a linked file. Throws if not linked (unless `throwError` is false).

#### `map(fn: (file: FileDB, name: string) => any): Promise<Array<any>>`  
**Asynchronous**  
Runs the provided function on all linked files in parallel.  

#### `collect(obj: object, fn: (collector: object, file: FileDB, name: string) => void): Promise<object>`  
**Asynchronous**  
Populates `obj` with data collected from all files.  

#### `reduce(initialValue: any, fn: (result: any, file: FileDB) => any): Promise<any>`  
**Asynchronous**  
Applies a reducer over all files.  

#### `values(): Promise<Array<FileDB>>`  
Alias for `map(file => file)`

#### `keys(): Promise<Array<string>>`  
Alias for `map((file, name) => name)`

#### `entries(): Promise<Array<[string, FileDB]>>`  
Alias for `map((file, name) => [name, file])`

#### `index(): Promise<Record<string, FileDB>>`  
Collects all files into a dictionary.

#### `verify(): Promise<{ isOk: boolean, errors?: [string, Error][] }>`  
**Async & Treelock protected**  
Checks readability of all linked files.

#### `unlock(key: string): Promise<{ isOk: boolean, errors?: [string, Error][] }>`  
**Async & Treelock protected**  
Attempts to decrypt and verify all linked files with the provided key.

#### `optimize(): Promise<{ isOk: boolean, errors?: [string, Error][] }>`  
**Async & Treelock protected**  
Regenerates all files to a compact form.

#### `rekey(newKey: string, currentKey: string): Promise<{ isOk: boolean, errors?: [string, Error][] }>`  
**Async & Treelock protected**  
Regenerates and re-encrypts all files using a new key.
Requires currentKey to be provided because of security.

---

### 🔹 FileDB

#### `write(id:string, body: object): Promise<void>`  
**Async & Treelock protected**  
Appends a single record. Requires the file to be readable.

_To delete record simple provide its id and no body (body==null)_

#### `writeSync(id:string, body: object): void`
**Synchronous**  
Synchronous version of `write`.

#### `map(fn: (body: object, id: string) => any): Promise<Array<any>>`  
**Async & Treelock protected**  
Iterates over all records, giving only the latest per ID.  

#### `collect(obj: object, fn: (collector: object, body: object, id: string) => void): Promise<object>`  
**Async & Treelock protected**  
Populates `obj` from all unique records.  

#### `reduce(initialValue: any, fn: (result: any, body: object, id: string) => any): Promise<any>`  
**Async & Treelock protected**  
Reduces over all unique records.  

#### `values(): Promise<Array<object>>`  
Alias for `map(body => body)`

#### `keys(): Promise<Array<string>>`  
Alias for `map((body, id) => id)`

#### `entries(): Promise<Array<[string, object]>>`  
Alias for `map((body, id) => [id, body])`

#### `index(): Promise<Record<string, object>>`  
Collects records by ID.

#### `verify(): Promise<void>`  
**Async & Treelock protected**  
Validates the file can be read and parsed. Throws if unreadable.

#### `unlock(key: string): Promise<void>`  
**Async & Treelock protected**  
Attempts to decrypt and verify the file with the provided key.

#### `optimize(): Promise<void>`  
**Async & Treelock protected**  
Compacts the file to remove duplicate entries.

#### `rekey(newKey: string, currentKey: string): Promise<void>`  
**Async & Treelock protected**  
Regenerates the file using a new key.
Requires currentKey to be provided because of security.

---

## 🧠 Notes

- `isReadable` is false until at least one successful `verify`, `map`, or `unlock`.
- Errors during reading are stored in `error` and prevent writes.

---

MIT License • Made with ☕ by Jan / `@randajan`