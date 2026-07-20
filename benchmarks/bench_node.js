const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const { performance } = require('perf_hooks');

// --- Worker Implementation ---
if (!isMainThread) {
  const { task, data } = workerData;
  if (task === 'map') {
    const result = data.map(x => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += i * x;
      return sum;
    });
    parentPort.postMessage(result);
  } else if (task === 'filter') {
    const result = data.filter(n => {
      let sum = 0;
      for (let i = 0; i < 5000; i++) sum += (i * n) % 7;
      return sum % 2 === 0;
    });
    parentPort.postMessage(result);
  } else if (task === 'fib') {
    function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
    parentPort.postMessage(fib(data));
  }
  process.exit(0); // Exit worker immediately after responding
}

// --- Main Benchmark Script ---
const os = require('os');
const NUM_ELEMENTS = 10000;
const FIB_NUM = 35;
const CORES = os.cpus().length;
const NUM_FIB_TASKS = CORES; // Launch 1 task per core
const RUN_CUSTOM = typeof Thread !== 'undefined';

function formatTime(ms) { return `${ms.toFixed(2)} ms`; }

function workerThreadsMap(array, numWorkers = CORES) {
  return new Promise((resolve, reject) => {
    const chunkSize = Math.ceil(array.length / numWorkers);
    let completed = 0;
    const results = new Array(numWorkers);
    for (let i = 0; i < numWorkers; i++) {
      const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker(__filename, { workerData: { task: 'map', data: chunk } });
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === numWorkers) resolve(results.flat());
      });
      worker.on('error', reject);
    }
  });
}

function workerThreadsFilter(array, numWorkers = CORES) {
  return new Promise((resolve, reject) => {
    const chunkSize = Math.ceil(array.length / numWorkers);
    let completed = 0;
    const results = new Array(numWorkers);
    for (let i = 0; i < numWorkers; i++) {
      const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker(__filename, { workerData: { task: 'filter', data: chunk } });
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === numWorkers) resolve(results.flat());
      });
      worker.on('error', reject);
    }
  });
}

function workerThreadsFib(n, count = NUM_FIB_TASKS) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const results = new Array(count);
    for (let i = 0; i < count; i++) {
      const worker = new Worker(__filename, { workerData: { task: 'fib', data: n } });
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === count) resolve(results);
      });
      worker.on('error', reject);
    }
  });
}

async function run() {
  const keepalive = setInterval(() => {}, 100);
  try {
    const arrayData = Array.from({ length: NUM_ELEMENTS }, (_, i) => i + 1);
    
    let runnerName = RUN_CUSTOM ? "Custom V8 Node" : "Standard Node";
    console.log(`[${runnerName}] Warming up...`);

    // --- Benchmark 1: MAP ---
    const t0_serial_map = performance.now();
    arrayData.map(x => { let sum = 0; for(let i=0; i<10000; i++) sum += i*x; return sum; });
    const t1_serial_map = performance.now();
    
    let t_parallel_map;
    if (RUN_CUSTOM) {
      const t0 = performance.now();
      await arrayData.parallelMap(x => { let sum = 0; for(let i=0; i<10000; i++) sum += i*x; return sum; });
      t_parallel_map = performance.now() - t0;
    } else {
      const t0 = performance.now();
      await workerThreadsMap(arrayData);
      t_parallel_map = performance.now() - t0;
    }

    // --- Benchmark 2: FILTER ---
    const t0_serial_filter = performance.now();
    arrayData.filter(n => { let sum = 0; for(let i=0; i<5000; i++) sum += (i*n)%7; return sum%2===0; });
    const t1_serial_filter = performance.now();

    let t_parallel_filter;
    if (RUN_CUSTOM) {
      const t0 = performance.now();
      await arrayData.parallelFilter(n => { let sum = 0; for(let i=0; i<5000; i++) sum += (i*n)%7; return sum%2===0; });
      t_parallel_filter = performance.now() - t0;
    } else {
      const t0 = performance.now();
      await workerThreadsFilter(arrayData);
      t_parallel_filter = performance.now() - t0;
    }

    // --- Benchmark 3: FIB ---
    const t0_serial_fib = performance.now();
    function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
    for(let i=0; i<NUM_FIB_TASKS; i++) fib(FIB_NUM);
    const t1_serial_fib = performance.now();

    let t_parallel_fib;
    if (RUN_CUSTOM) {
      const t0 = performance.now();
      const handles = [];
      for(let i=0; i<NUM_FIB_TASKS; i++) {
        handles.push(Thread.spawn(n => { function f(x){return x<=1?x:f(x-1)+f(x-2);} return f(n); }, FIB_NUM));
      }
      await Promise.all(handles.map(h => Thread.join(h)));
      t_parallel_fib = performance.now() - t0;
    } else {
      const t0 = performance.now();
      await workerThreadsFib(FIB_NUM);
      t_parallel_fib = performance.now() - t0;
    }

    // Output JSON
    console.log(JSON.stringify({
      runner: runnerName,
      serialMap: t1_serial_map - t0_serial_map,
      parallelMap: t_parallel_map,
      serialFilter: t1_serial_filter - t0_serial_filter,
      parallelFilter: t_parallel_filter,
      serialFib: t1_serial_fib - t0_serial_fib,
      parallelFib: t_parallel_fib
    }));

  } finally {
    clearInterval(keepalive);
  }
}
run().catch(console.error);
