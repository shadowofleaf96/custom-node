const { execSync } = require('child_process');

function run(cmd) {
  try {
    const out = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    const lines = out.split('\n');
    for (let i = lines.length - 1; i >= 0; i--) {
      if (lines[i].startsWith('{')) {
        return JSON.parse(lines[i]);
      }
    }
  } catch (e) {
    return null;
  }
}

console.log("Running benchmarks across Normal Node, Custom Node, and Bun...");
console.log("(This will take about 10-15 seconds)\n");

const resNormal = run('node bench_node.js');
const resCustom = run('E:\\custom-nodejs\\node\\out\\Release\\node.exe bench_node.js');
const resBun = run('bun bench_bun.js');

if (!resNormal || !resCustom || !resBun) {
  console.error("One of the benchmarks failed to run.");
  console.log("Normal Node:", !!resNormal);
  console.log("Custom Node:", !!resCustom);
  console.log("Bun:", !!resBun);
  process.exit(1);
}

function row(name, serial, parallel) {
  const speedup = (serial / parallel).toFixed(2);
  return `| ${name.padEnd(20)} | ${serial.toFixed(2).padStart(11)} ms | ${parallel.toFixed(2).padStart(13)} ms | ${speedup.padStart(6)}x |`;
}

console.log("### Benchmark 1: CPU-Intensive Map (10,000 items)");
console.log("| Runtime              | Serial Time    | Parallel Time   | Speedup |");
console.log("| :------------------- | :------------- | :-------------- | :------ |");
console.log(row(resNormal.runner, resNormal.serialMap, resNormal.parallelMap));
console.log(row(resBun.runner, resBun.serialMap, resBun.parallelMap));
console.log(row(resCustom.runner, resCustom.serialMap, resCustom.parallelMap));
console.log("");

console.log("### Benchmark 2: CPU-Intensive Filter (10,000 items)");
console.log("| Runtime              | Serial Time    | Parallel Time   | Speedup |");
console.log("| :------------------- | :------------- | :-------------- | :------ |");
console.log(row(resNormal.runner, resNormal.serialFilter, resNormal.parallelFilter));
console.log(row(resBun.runner, resBun.serialFilter, resBun.parallelFilter));
console.log(row(resCustom.runner, resCustom.serialFilter, resCustom.parallelFilter));
console.log("");

console.log("### Benchmark 3: 8x Fibonacci(35)");
console.log("| Runtime              | Serial Time    | Parallel Time   | Speedup |");
console.log("| :------------------- | :------------- | :-------------- | :------ |");
console.log(row(resNormal.runner, resNormal.serialFib, resNormal.parallelFib));
console.log(row(resBun.runner, resBun.serialFib, resBun.parallelFib));
console.log(row(resCustom.runner, resCustom.serialFib, resCustom.parallelFib));
console.log("");
