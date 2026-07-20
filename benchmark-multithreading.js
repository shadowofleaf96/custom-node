const { Worker, isMainThread, parentPort, workerData } = require('worker_threads');
const path = require('path');

// ═══════════════════════════════════════════════════════════
//  V8 Multithreading vs Worker Threads vs Serial Benchmark
// ═══════════════════════════════════════════════════════════

// --- Worker implementation for worker_threads benchmark ---
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
      if (n < 2) return false;
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
      }
      return true;
    });
    parentPort.postMessage(result);
  } else if (task === 'fib') {
    function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
    parentPort.postMessage(fib(data));
  }
  return;
}

// --- Main Thread Benchmark Suite ---

const NUM_ELEMENTS = 10000;
const FIB_NUM = 35;
const NUM_FIB_TASKS = 4; // Number of parallel fibonacci tasks

// Helper to format time
function formatTime(ms) {
  return `${ms.toFixed(2)} ms`;
}

// 1. worker_threads Map Helper
function workerThreadsMap(array, numWorkers = 4) {
  return new Promise((resolve, reject) => {
    const chunkSize = Math.ceil(array.length / numWorkers);
    let completed = 0;
    const results = new Array(numWorkers);
    
    for (let i = 0; i < numWorkers; i++) {
      const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker(__filename, {
        workerData: { task: 'map', data: chunk }
      });
      
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === numWorkers) {
          resolve(results.flat());
        }
      });
      worker.on('error', reject);
    }
  });
}

// 2. worker_threads Filter Helper
function workerThreadsFilter(array, numWorkers = 4) {
  return new Promise((resolve, reject) => {
    const chunkSize = Math.ceil(array.length / numWorkers);
    let completed = 0;
    const results = new Array(numWorkers);
    
    for (let i = 0; i < numWorkers; i++) {
      const chunk = array.slice(i * chunkSize, (i + 1) * chunkSize);
      const worker = new Worker(__filename, {
        workerData: { task: 'filter', data: chunk }
      });
      
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === numWorkers) {
          resolve(results.flat());
        }
      });
      worker.on('error', reject);
    }
  });
}

// 3. worker_threads Fib Helper
function workerThreadsFib(n, count = NUM_FIB_TASKS) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const results = new Array(count);
    
    for (let i = 0; i < count; i++) {
      const worker = new Worker(__filename, {
        workerData: { task: 'fib', data: n }
      });
      
      worker.on('message', (msg) => {
        results[i] = msg;
        completed++;
        if (completed === count) {
          resolve(results);
        }
      });
      worker.on('error', reject);
    }
  });
}

async function runBenchmarks() {
  const keepalive = setInterval(() => {}, 100);
  try {
    console.log(`\n======================================================`);
    console.log(`🚀 Node.js Multithreading Benchmarks`);
    console.log(`Node Version: ${process.version}`);
    console.log(`Has Custom V8 Thread Builtins: ${typeof Thread !== 'undefined' ? 'Yes' : 'No'}`);
    console.log(`======================================================\n`);

  const arrayData = Array.from({ length: NUM_ELEMENTS }, (_, i) => i + 1);

  // ----------------------------------------------------
  // Benchmark 1: CPU-Intensive Map
  // ----------------------------------------------------
  console.log(`--- Benchmark 1: CPU-Intensive Map (${NUM_ELEMENTS} elements) ---`);
  
  // A. Serial Map
  const startSerialMap = performance.now();
  const serialMapResult = arrayData.map(x => {
    let sum = 0;
    for (let i = 0; i < 10000; i++) sum += i * x;
    return sum;
  });
  const timeSerialMap = performance.now() - startSerialMap;
  console.log(`[1] Serial map:         ${formatTime(timeSerialMap)}`);

  // B. Worker Threads Map
  const startWtMap = performance.now();
  const wtMapResult = await workerThreadsMap(arrayData, 4);
  const timeWtMap = performance.now() - startWtMap;
  console.log(`[2] worker_threads (4): ${formatTime(timeWtMap)} (Speedup: ${(timeSerialMap / timeWtMap).toFixed(2)}x)`);

  // C. Custom V8 parallelMap
  if (typeof Thread !== 'undefined') {
    try {
      const startPmMap = performance.now();
      const pmMapResult = await arrayData.parallelMap(x => {
        let sum = 0;
        for (let i = 0; i < 10000; i++) sum += i * x;
        return sum;
      });
      const timePmMap = performance.now() - startPmMap;
      console.log(`[3] V8 parallelMap:     ${formatTime(timePmMap)} (Speedup: ${(timeSerialMap / timePmMap).toFixed(2)}x)`);
      
      // Verify results
      if (serialMapResult[10] !== pmMapResult[10]) console.error("Mismatch in parallelMap results!");
    } catch (e) {
      console.error(`[3] V8 parallelMap Failed: ${e.message}`);
    }
  }
  console.log("");

  // ----------------------------------------------------
  // Benchmark 2: CPU-Intensive Filter (Primes)
  // ----------------------------------------------------
  console.log(`--- Benchmark 2: CPU-Intensive Filter (Find Primes up to ${NUM_ELEMENTS}) ---`);
  
  // A. Serial Filter
  const startSerialFilter = performance.now();
  const serialFilterResult = arrayData.filter(n => {
    let sum = 0;
    for (let i = 0; i < 5000; i++) sum += (i * n) % 7;
    return sum % 2 === 0;
  });
  const timeSerialFilter = performance.now() - startSerialFilter;
  console.log(`[1] Serial filter:         ${formatTime(timeSerialFilter)}`);

  // B. Worker Threads Filter
  const startWtFilter = performance.now();
  const wtFilterResult = await workerThreadsFilter(arrayData, 4);
  const timeWtFilter = performance.now() - startWtFilter;
  console.log(`[2] worker_threads (4):    ${formatTime(timeWtFilter)} (Speedup: ${(timeSerialFilter / timeWtFilter).toFixed(2)}x)`);

  // C. Custom V8 parallelFilter
  if (typeof Thread !== 'undefined') {
    try {
      const startPmFilter = performance.now();
      const pmFilterResult = await arrayData.parallelFilter(n => {
        let sum = 0;
        for (let i = 0; i < 5000; i++) sum += (i * n) % 7;
        return sum % 2 === 0;
      });
      const timePmFilter = performance.now() - startPmFilter;
      console.log(`[3] V8 parallelFilter:     ${formatTime(timePmFilter)} (Speedup: ${(timeSerialFilter / timePmFilter).toFixed(2)}x)`);
      
      // Verify results
      if (serialFilterResult.length !== pmFilterResult.length) console.error("Mismatch in parallelFilter results!");
    } catch (e) {
      console.error(`[3] V8 parallelFilter Failed: ${e.message}`);
    }
  }
  console.log("");

  // ----------------------------------------------------
  // Benchmark 3: Independent Parallel Tasks (Fibonacci)
  // ----------------------------------------------------
  console.log(`--- Benchmark 3: ${NUM_FIB_TASKS}x Fibonacci(${FIB_NUM}) ---`);
  
  // A. Serial Fib
  const startSerialFib = performance.now();
  const serialFibResult = [];
  function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
  for(let i=0; i<NUM_FIB_TASKS; i++) {
    serialFibResult.push(fib(FIB_NUM));
  }
  const timeSerialFib = performance.now() - startSerialFib;
  console.log(`[1] Serial execution:      ${formatTime(timeSerialFib)}`);

  // B. Worker Threads Fib
  const startWtFib = performance.now();
  const wtFibResult = await workerThreadsFib(FIB_NUM, NUM_FIB_TASKS);
  const timeWtFib = performance.now() - startWtFib;
  console.log(`[2] worker_threads (4):    ${formatTime(timeWtFib)} (Speedup: ${(timeSerialFib / timeWtFib).toFixed(2)}x)`);

  // C. Custom V8 Thread.spawn
  if (typeof Thread !== 'undefined') {
    const startPmFib = performance.now();
    const handles = [];
    for(let i=0; i<NUM_FIB_TASKS; i++) {
      handles.push(Thread.spawn((n) => {
        function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
        return fib(n);
      }, FIB_NUM));
    }
    const pmFibResult = await Promise.all(handles.map(h => Thread.join(h)));
    const timePmFib = performance.now() - startPmFib;
    console.log(`[3] V8 Thread.spawn (4):   ${formatTime(timePmFib)} (Speedup: ${(timeSerialFib / timePmFib).toFixed(2)}x)`);
    
    // Verify results
    if (serialFibResult[0] !== pmFibResult[0]) console.error("Mismatch in Thread.spawn results!");
  }
  console.log("");

  } finally {
    clearInterval(keepalive);
  }
}

runBenchmarks().catch(console.error);
