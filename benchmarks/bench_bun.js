const os = require('os');
const NUM_ELEMENTS = 10000;
const FIB_NUM = 35;
const CORES = os.cpus().length;
const NUM_FIB_TASKS = CORES;

function workerThreadsMap(array, numWorkers = CORES) {
  return new Promise((resolve, reject) => {
    const chunkSize = Math.ceil(array.length / numWorkers);
    let completed = 0;
    const results = new Array(numWorkers);
    for (let i = 0; i < numWorkers; i++) {
      const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker(new URL("worker_bun.js", import.meta.url).href);
      worker.postMessage({ task: 'map', data: chunk });
      worker.onmessage = (event) => {
        results[i] = event.data;
        completed++;
        worker.terminate();
        if (completed === numWorkers) resolve(results.flat());
      };
      worker.onerror = reject;
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
      const worker = new Worker(new URL("worker_bun.js", import.meta.url).href);
      worker.postMessage({ task: 'filter', data: chunk });
      worker.onmessage = (event) => {
        results[i] = event.data;
        completed++;
        worker.terminate();
        if (completed === numWorkers) resolve(results.flat());
      };
      worker.onerror = reject;
    }
  });
}

function workerThreadsFib(n, count = NUM_FIB_TASKS) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const results = new Array(count);
    for (let i = 0; i < count; i++) {
      const worker = new Worker(new URL("worker_bun.js", import.meta.url).href);
      worker.postMessage({ task: 'fib', data: n });
      worker.onmessage = (event) => {
        results[i] = event.data;
        completed++;
        worker.terminate();
        if (completed === count) resolve(results);
      };
      worker.onerror = reject;
    }
  });
}

async function run() {
  const arrayData = Array.from({ length: NUM_ELEMENTS }, (_, i) => i + 1);
  
  console.log(`[Bun Web Workers] Warming up...`);

  // --- Benchmark 1: MAP ---
  const t0_serial_map = performance.now();
  arrayData.map(x => { let sum = 0; for(let i=0; i<10000; i++) sum += i*x; return sum; });
  const t1_serial_map = performance.now();
  
  const t0_pm_map = performance.now();
  await workerThreadsMap(arrayData);
  const t1_pm_map = performance.now();

  // --- Benchmark 2: FILTER ---
  const t0_serial_filter = performance.now();
  arrayData.filter(n => { let sum = 0; for(let i=0; i<5000; i++) sum += (i*n)%7; return sum%2===0; });
  const t1_serial_filter = performance.now();

  const t0_pm_filter = performance.now();
  await workerThreadsFilter(arrayData);
  const t1_pm_filter = performance.now();

  // --- Benchmark 3: FIB ---
  const t0_serial_fib = performance.now();
  function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
  for(let i=0; i<NUM_FIB_TASKS; i++) fib(FIB_NUM);
  const t1_serial_fib = performance.now();

  const t0_pm_fib = performance.now();
  await workerThreadsFib(FIB_NUM);
  const t1_pm_fib = performance.now();

  console.log(JSON.stringify({
    runner: "Bun Web Workers",
    serialMap: t1_serial_map - t0_serial_map,
    parallelMap: t1_pm_map - t0_pm_map,
    serialFilter: t1_serial_filter - t0_serial_filter,
    parallelFilter: t1_pm_filter - t0_pm_filter,
    serialFib: t1_serial_fib - t0_serial_fib,
    parallelFib: t1_pm_fib - t0_pm_fib
  }));
}
run().catch(console.error);
