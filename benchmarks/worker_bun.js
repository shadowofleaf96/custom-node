const { parentPort, workerData } = require('worker_threads');

self.onmessage = (event) => {
  const { task, data } = event.data;
  if (task === 'map') {
    const result = data.map(x => {
      let sum = 0;
      for (let i = 0; i < 10000; i++) sum += i * x;
      return sum;
    });
    self.postMessage(result);
  } else if (task === 'filter') {
    const result = data.filter(n => {
      let sum = 0;
      for (let i = 0; i < 5000; i++) sum += (i * n) % 7;
      return sum % 2 === 0;
    });
    self.postMessage(result);
  } else if (task === 'fib') {
    function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
    self.postMessage(fib(data));
  }
};
