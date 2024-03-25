import jet from "@randajan/jet-core";
import { Worker } from 'worker_threads';
import loadFileW from "./workers/loadFile.jsc";
import saveFileW from "./workers/saveFile.jsc";


const runWorker = async (path, data)=>{
    return new Promise((resolve, reject) => {
        const worker = new Worker(path, {
            eval:true,
            workerData: data
        });
        worker.on('message', resolve);
        worker.on('error', reject);
        worker.on('exit', (code) => {
            if (code === 0) { resolve(); }
            else { reject(new Error(`worker stopped with exit code ${code}`)); }
        });
    });
}

export const loadFile = (path, keys)=>runWorker(loadFileW, { path, keys });
export const saveFile = (path, content, key="")=>runWorker(saveFileW, { path, content, key });
