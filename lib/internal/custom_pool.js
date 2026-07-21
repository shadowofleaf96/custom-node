'use strict';

const { Worker } = require('internal/worker');
const { performance } = require('perf_hooks');

const NUM_WORKERS = 16;
const workers = [];
let roundRobin = 0;
let taskId = 0;
const pendingTasks = new Map();
let poolInitialized = false;

// Worker code that evaluates incoming functions and returns results
const workerCode = `
  const { parentPort } = require('worker_threads');
  parentPort.on('message', async (msg) => {
    const { id, fnStr, args } = msg;
    try {
      // Evaluate the serialized function
      const fn = (0, eval)('(' + fnStr + ')');
      const result = await fn(...args);
      parentPort.postMessage({ id, result });
    } catch (err) {
      parentPort.postMessage({ id, error: err.message || err.toString() });
    }
  });
`;

function initializePool() {
  for (let i = 0; i < NUM_WORKERS; i++) {
    const worker = new Worker(workerCode, { eval: true });
    
    worker.on('message', (msg) => {
      const task = pendingTasks.get(msg.id);
      if (task) {
        pendingTasks.delete(msg.id);
        if (msg.error) task.reject(new Error(msg.error));
        else task.resolve(msg.result);
      }
    });

    worker.on('error', (err) => {
      console.error('[CustomPool] Worker error:', err);
    });

    // Unref workers so they don't prevent Node from exiting if the pool is idle
    worker.unref();
    workers.push(worker);
  }
}

function ensurePool() {
  if (poolInitialized) return;
  poolInitialized = true;
  initializePool();
}

function ThreadSpawn(fn, ...args) {
  ensurePool();
  return new Promise((resolve, reject) => {
    const worker = workers[roundRobin];
    roundRobin = (roundRobin + 1) % NUM_WORKERS;
    
    const id = taskId++;
    pendingTasks.set(id, { resolve, reject });
    
    worker.postMessage({ 
      id, 
      fnStr: fn.toString(), 
      args 
    });
  });
}

function ThreadJoin(promise) {
  // Since spawn returns a Promise, join is just syntactic sugar for await
  return promise;
}

function parallelMap(callback) {
  return new Promise((resolve, reject) => {
    const array = this;
    const len = array.length;
    if (len === 0) return resolve([]);

    // Split array into chunks for the 16 workers
    const numChunks = Math.min(len, NUM_WORKERS);
    const chunkSize = Math.ceil(len / numChunks);
    
    const promises = [];
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, len);
      const chunk = array.slice(start, end);
      
      promises.push(ThreadSpawn((c, fnStr) => {
        const fn = (0, eval)('(' + fnStr + ')');
        const res = new Array(c.length);
        for(let j = 0; j < c.length; j++) {
           res[j] = fn(c[j]);
        }
        return res;
      }, chunk, callback.toString()));
    }
    
    Promise.all(promises).then(results => {
      // Flatten the results
      const finalResult = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          finalResult.push(results[i][j]);
        }
      }
      resolve(finalResult);
    }).catch(reject);
  });
}

function parallelFilter(callback) {
  return new Promise((resolve, reject) => {
    const array = this;
    const len = array.length;
    if (len === 0) return resolve([]);

    const numChunks = Math.min(len, NUM_WORKERS);
    const chunkSize = Math.ceil(len / numChunks);
    
    const promises = [];
    for (let i = 0; i < numChunks; i++) {
      const start = i * chunkSize;
      const end = Math.min(start + chunkSize, len);
      const chunk = array.slice(start, end);
      
      promises.push(ThreadSpawn((c, fnStr) => {
        const fn = (0, eval)('(' + fnStr + ')');
        const res = [];
        for(let j = 0; j < c.length; j++) {
           if (fn(c[j])) res.push(c[j]);
        }
        return res;
      }, chunk, callback.toString()));
    }
    
    Promise.all(promises).then(results => {
      const finalResult = [];
      for (let i = 0; i < results.length; i++) {
        for (let j = 0; j < results[i].length; j++) {
          finalResult.push(results[i][j]);
        }
      }
      resolve(finalResult);
    }).catch(reject);
  });
}

function setupGlobalThreadAPI() {
  global.Thread = {
    spawn: ThreadSpawn,
    join: ThreadJoin
  };
  
  Object.defineProperty(Array.prototype, 'parallelMap', {
    value: parallelMap,
    enumerable: false,
    configurable: true,
    writable: true
  });

  Object.defineProperty(Array.prototype, 'parallelFilter', {
    value: parallelFilter,
    enumerable: false,
    configurable: true,
    writable: true
  });
}

module.exports = {
  setupGlobalThreadAPI
};
