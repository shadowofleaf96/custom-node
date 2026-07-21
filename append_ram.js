console.log('\n--- Memory Usage ---');
const mem = process.memoryUsage();
for (let key in mem) {
  console.log(key + ': ' + Math.round(mem[key] / 1024 / 1024 * 100) / 100 + ' MB');
}
