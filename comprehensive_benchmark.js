const { performance } = require('perf_hooks');
const os = require('os');
const isBun = typeof Bun !== 'undefined';
const isCustomNode = typeof Thread !== 'undefined';

function getRamMB() {
  return (process.memoryUsage().rss / 1024 / 1024).toFixed(2);
}

const formatTime = (ms) => `${ms.toFixed(2)} ms`;

// ---------------------------------------------------------
// Helper: Normal Node Worker
// ---------------------------------------------------------
async function runWt(taskName, workerData, numWorkers) {
  const { Worker } = require('worker_threads');
  return new Promise((resolve, reject) => {
    let completed = 0;
    const start = performance.now();
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(`
        const { parentPort, workerData } = require('worker_threads');
        
        if (workerData.task === 'micro') {
          parentPort.postMessage(workerData.data * 2);
        } else if (workerData.task === 'payload') {
          // Do some minimal work with the large payload to force deserialization
          parentPort.postMessage(workerData.data.length);
        } else if (workerData.task === 'io') {
          setTimeout(() => parentPort.postMessage('io_done'), 10);
        }
      `, { eval: true, workerData: { task: taskName, data: workerData } });
      
      worker.on('message', () => {
        completed++;
        if (completed === numWorkers) resolve(performance.now() - start);
      });
      worker.on('error', reject);
    }
  });
}

// ---------------------------------------------------------
// Helper: Bun Worker
// ---------------------------------------------------------
async function runBun(taskName, workerData, numWorkers) {
  return new Promise((resolve, reject) => {
    let completed = 0;
    const start = performance.now();
    for (let i = 0; i < numWorkers; i++) {
      const worker = new Worker(URL.createObjectURL(new Blob([`
        self.onmessage = function(e) {
          const { task, data } = e.data;
          if (task === 'micro') {
            postMessage(data * 2);
          } else if (task === 'payload') {
            postMessage(data.length);
          } else if (task === 'io') {
            setTimeout(() => postMessage('io_done'), 10);
          }
        }
      `], { type: 'application/javascript' })));
      
      worker.postMessage({ task: taskName, data: workerData });
      worker.onmessage = () => {
        completed++;
        if (completed === numWorkers) resolve(performance.now() - start);
      };
      worker.onerror = reject;
    }
  });
}

// ---------------------------------------------------------
// Helper: Custom V8 Thread
// ---------------------------------------------------------
async function runCustom(taskName, workerData, numWorkers) {
  const start = performance.now();
  const handles = [];
  for (let i = 0; i < numWorkers; i++) {
    handles.push(Thread.spawn((task, data) => {
      if (task === 'micro') {
        return data * 2;
      } else if (task === 'payload') {
        return data.length;
      } else if (task === 'io') {
        // This will FAIL because setTimeout does not exist in our raw V8 Isolate!
        return new Promise((res) => setTimeout(() => res('io_done'), 10));
      }
    }, taskName, workerData));
  }
  
  await Promise.all(handles.map(h => Thread.join(h)));
  return performance.now() - start;
}

// ---------------------------------------------------------
// Runner
// ---------------------------------------------------------
async function executeTest(mode, name, testFn) {
  console.log(`\n--- ${name} ---`);
  try {
    const memBefore = process.memoryUsage().rss;
    const time = await testFn();
    const memAfter = process.memoryUsage().rss;
    const memDelta = Math.max(0, (memAfter - memBefore) / 1024 / 1024);
    console.log(`[${mode}] Time: ${formatTime(time)} | RAM Overhead: +${memDelta.toFixed(2)} MB`);
  } catch (e) {
    console.log(`[${mode}] FAILED: ${e.message.split('\\n')[0]}`);
  }
}

async function main() {
  const mode = process.argv[2];
  if (!mode) {
    console.log("Usage: node comprehensive_benchmark.js [wt|custom|bun]");
    process.exit(1);
  }

  const keepalive = setInterval(() => {}, 100);
  console.log(`\n==============================================`);
  console.log(`Running Comprehensive Edge-Case Benchmarks`);
  console.log(`Mode: ${mode.toUpperCase()}`);
  console.log(`==============================================`);

  // Scenario 1: Micro-Task Flooding (500 tiny tasks)
  // Normal/Bun will crash or bog down in RAM. Custom Node will breeze through via thread pool.
  const NUM_MICRO = 500;
  await executeTest(mode, `Scenario 1: Micro-Task Flooding (${NUM_MICRO} workers)`, async () => {
    if (mode === 'wt') return runWt('micro', 42, NUM_MICRO);
    if (mode === 'bun') return runBun('micro', 42, NUM_MICRO);
    if (mode === 'custom') return runCustom('micro', 42, NUM_MICRO);
  });

  // Scenario 2: Heavy Payload Serialization (Pass 10MB string to 4 workers)
  // Custom Node copies bytes. Let's see how it compares to Node/Bun.
  const LARGE_PAYLOAD = "A".repeat(10 * 1024 * 1024); // 10MB String
  await executeTest(mode, `Scenario 2: 10MB Payload Serialization (4 workers)`, async () => {
    if (mode === 'wt') return runWt('payload', LARGE_PAYLOAD, 4);
    if (mode === 'bun') return runBun('payload', LARGE_PAYLOAD, 4);
    if (mode === 'custom') return runCustom('payload', LARGE_PAYLOAD, 4);
  });

  // Scenario 3: Event Loop & I/O Availability (setTimeout)
  // Node/Bun will pass. Custom Node will fail (No libuv event loop).
  await executeTest(mode, `Scenario 3: Async I/O & Timers (setTimeout in worker)`, async () => {
    if (mode === 'wt') return runWt('io', null, 4);
    if (mode === 'bun') return runBun('io', null, 4);
    if (mode === 'custom') return runCustom('io', null, 4);
  });

  clearInterval(keepalive);
}

main();
