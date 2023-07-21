# @randajan/file-db

[![NPM](https://img.shields.io/npm/v/@randajan/file-db.svg)](https://www.npmjs.com/package/@randajan/file-db) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

# FileDB

FileDB is a simple Node.js library for working with a File-based Database. It allows secure storage and retrieval of JSON data in encrypted files using AES encryption.

## Features

- Store and retrieve JSON data in encrypted files
- Support for multiple encryption keys
- Easy-to-use API for working with the File-based Database

## Installation

Install the library using npm:

```
npm install @randajan/file-db
```

## Usage

```javascript
import fdb, { FileDB } from '@randajan/file-db'; //default export 'fdb' is shorthand for 'new FileDB()'

// Create a new instance of FileDB
const fileDB = fdb({
  root: '/path/to/database', // Root directory for the database
  alias: 'mydb', // Optional alias for the database (default is the root directory name)
  extension: '.fdb', // Optional file extension for the encrypted files (default is '.fdb')
  key: 'mysecretkey', // Optional encryption current key
});

// Save data to the database
const data = { name: 'John Doe', age: 30 };
await fileDB.save('user1', data);

// Load data from the database
const loadedData = await fileDB.load('user1');
console.log(loadedData); // { name: 'John Doe', age: 30 }
```

## Multiple Encryption Keys

FileDB supports the use of multiple encryption keys. In the event that the current key is changed or lost, you can provide all possible keys to the FileDB instance. It will try its best to unlock all data using these keys. If a match is found, the data will be successfully decrypted and re-encrypted using the last provided current key.
This feature solves two case scenarios:

1. current key is compromited or insecure - so you can change the key at runtime
2. midtime changing current key server crashed - so you can provide multiple decryption keys and FileDB itself reencrypt all files with last current key

## Adding New Encryption Key

You can add a new encryption key to the FileDB instance using the `addKey` method. This method allows you to add a new key while providing the current key for authentication. If the current key matches the existing key, the new key is added to the list of decryption keys. Optionally, you can choose to reencrypt all existing data with the new key to ensure data consistency and security.

```javascript
// Example of adding a new encryption key
const newKey = 'newsecretkey';
const currentKey = 'mysecretkey';
await fileDB.addKey(newKey, currentKey, true);
```

## Contribution

Contributions are welcome! If you find any issues or have suggestions for improvements, feel free to open an issue or create a pull request.

## License

MIT © [randajan](https://github.com/randajan)
