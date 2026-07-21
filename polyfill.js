if (typeof Thread !== 'undefined') {
  Array.prototype.parallelMap = async function(fn) {
    const numThreads = typeof Thread.getPoolSize === 'function' ? Thread.getPoolSize() : 4;
    const chunkSize = Math.ceil(this.length / numThreads);
    const handles = [];
    for (let i = 0; i < numThreads; i++) {
      const chunk = this.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;
      handles.push(Thread.spawn((c, fStr) => {
         const f = eval('(' + fStr + ')');
         return c.map(f);
      }, chunk, fn.toString()));
    }
    const results = await Promise.all(handles.map(h => Thread.join(h)));
    return results.flat();
  };

  Array.prototype.parallelFilter = async function(fn) {
    const numThreads = typeof Thread.getPoolSize === 'function' ? Thread.getPoolSize() : 4;
    const chunkSize = Math.ceil(this.length / numThreads);
    const handles = [];
    for (let i = 0; i < numThreads; i++) {
      const chunk = this.slice(i * chunkSize, (i + 1) * chunkSize);
      if (chunk.length === 0) continue;
      handles.push(Thread.spawn((c, fStr) => {
         const f = eval('(' + fStr + ')');
         return c.filter(f);
      }, chunk, fn.toString()));
    }
    const results = await Promise.all(handles.map(h => Thread.join(h)));
    return results.flat();
  };
}
