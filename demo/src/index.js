
import { info, log } from "@randajan/simple-lib/node";
import fdb from "../../dist/index.js";



// Create a new instance of FileDB
const fileDB = fdb({
    root: info.dir.root + "\\demo\\fdb", // Root directory for the database
    alias: 'testDB', // Optional alias for the database
    extension: 'fdb', // Optional file extension for the encrypted files
    key: 'mysecretkey', // Optional encryption key
});

(async function () {

    const savedUser = { name: 'John Doe', age: 30 };

    // Test1 saving data before load 
    try { await fileDB.save('user', savedUser); }
    catch (notLoadedYetError) { console.log("TEST1", {notLoadedYetError}); }

    // Test2 add a new encryption key with incorrect current key
    const newKey = 'newsecretkey';
    const incorectKey = 'incorectkey';
    try { await fileDB.addKey(newKey, incorectKey); }
    catch (incorrectKeyError) { console.log("TEST2", {incorrectKeyError}); }

    // Test3 add a new encryption key and reencrypt database
    const currentKey = 'mysecretkey';
    const reencryptErrors = await fileDB.addKey(newKey, currentKey, true);
    console.log("TEST3", { reencryptErrors });

    // Test4 loading data
    const loadedUser = await fileDB.load('user');
    console.log("TEST4", { savedUser, loadedUser });

    // Test5 loading not existing data
    const notExistDataLoad = await fileDB.load('notExist');
    console.log("TEST5", { notExistDataLoad });

    // Test6 add a new encryption key and reencrypt database back
    const reencryptBackErrors = await fileDB.addKey(currentKey, newKey, true);
    console.log("TEST6", { reencryptBackErrors });

})();




