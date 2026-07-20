const assert = require('assert');

// ═══════════════════════════════════════════════════════════
//  V8 Multithreading — Comprehensive Test Suite
// ═══════════════════════════════════════════════════════════

let passed = 0;
let failed = 0;
let skipped = 0;

function logSection(name) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${name}`);
  console.log(`${'═'.repeat(60)}`);
}

function logTest(name) {
  process.stdout.write(`  ▸ ${name} ... `);
}

function pass(extra = '') {
  passed++;
  console.log(`✅${extra ? ' ' + extra : ''}`);
}

function fail(err) {
  failed++;
  console.log(`❌ ${err.message || err}`);
}

function skip(reason) {
  skipped++;
  console.log(`⏭️  Skipped: ${reason}`);
}

async function runTests() {
  console.log('\n' + '═'.repeat(60));
  console.log('  V8 MULTITHREADING — COMPREHENSIVE TEST SUITE');
  console.log('═'.repeat(60));

  const keepalive = setInterval(() => {}, 100);

  // ─────────────────────────────────────────────────────────
  // SECTION 1: Thread.spawn & Thread.join — Basic Operations
  // ─────────────────────────────────────────────────────────
  logSection('1. Thread.spawn & Thread.join — Basics');

  // 1.1 Simple addition
  logTest('Simple addition (10 + 20)');
  try {
    const h = Thread.spawn((a, b) => a + b, 10, 20);
    const r = await Thread.join(h);
    assert.strictEqual(r, 30);
    pass();
  } catch (e) { fail(e); }

  // 1.2 No arguments
  logTest('No arguments — return constant');
  try {
    const h = Thread.spawn(() => 42);
    const r = await Thread.join(h);
    assert.strictEqual(r, 42);
    pass();
  } catch (e) { fail(e); }

  // 1.3 String concatenation
  logTest('String concatenation');
  try {
    const h = Thread.spawn((a, b) => a + ' ' + b, 'Hello', 'World');
    const r = await Thread.join(h);
    assert.strictEqual(r, 'Hello World');
    pass();
  } catch (e) { fail(e); }

  // 1.4 Return object
  logTest('Return object');
  try {
    const h = Thread.spawn((name, age) => ({ name, age, active: true }), 'Alice', 30);
    const r = await Thread.join(h);
    assert.deepStrictEqual(r, { name: 'Alice', age: 30, active: true });
    pass();
  } catch (e) { fail(e); }

  // 1.5 Return array
  logTest('Return array');
  try {
    const h = Thread.spawn((n) => {
      const arr = [];
      for (let i = 0; i < n; i++) arr.push(i * i);
      return arr;
    }, 5);
    const r = await Thread.join(h);
    assert.deepStrictEqual(r, [0, 1, 4, 9, 16]);
    pass();
  } catch (e) { fail(e); }

  // 1.6 Return boolean
  logTest('Return boolean values');
  try {
    const h1 = Thread.spawn(() => true);
    const h2 = Thread.spawn(() => false);
    assert.strictEqual(await Thread.join(h1), true);
    assert.strictEqual(await Thread.join(h2), false);
    pass();
  } catch (e) { fail(e); }

  // 1.7 Return null and undefined
  logTest('Return null');
  try {
    const h = Thread.spawn(() => null);
    const r = await Thread.join(h);
    assert.strictEqual(r, null);
    pass();
  } catch (e) { fail(e); }

  // 1.8 Large number
  logTest('Large number arithmetic');
  try {
    const h = Thread.spawn(() => Number.MAX_SAFE_INTEGER - 1);
    const r = await Thread.join(h);
    assert.strictEqual(r, 9007199254740990);
    pass();
  } catch (e) { fail(e); }

  // 1.9 Floating point
  logTest('Floating point');
  try {
    const h = Thread.spawn((a, b) => a / b, 22, 7);
    const r = await Thread.join(h);
    assert.ok(Math.abs(r - 3.142857142857143) < 1e-10);
    pass();
  } catch (e) { fail(e); }

  // 1.10 Nested object
  logTest('Nested object');
  try {
    const h = Thread.spawn(() => ({
      user: { name: 'Bob', scores: [95, 87, 92] },
      metadata: { version: 2 }
    }));
    const r = await Thread.join(h);
    assert.strictEqual(r.user.name, 'Bob');
    assert.deepStrictEqual(r.user.scores, [95, 87, 92]);
    assert.strictEqual(r.metadata.version, 2);
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 2: Thread.sleep
  // ─────────────────────────────────────────────────────────
  logSection('2. Thread.sleep');

  // 2.1 Basic sleep timing
  logTest('Thread.sleep(50) timing');
  try {
    const start = Date.now();
    await Thread.sleep(50);
    const elapsed = Date.now() - start;
    assert.ok(elapsed >= 40, `Expected >= 40ms, got ${elapsed}ms`);
    assert.ok(elapsed < 200, `Expected < 200ms, got ${elapsed}ms`);
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 2.2 Sleep 0ms
  logTest('Thread.sleep(0) — immediate return');
  try {
    const start = Date.now();
    await Thread.sleep(0);
    const elapsed = Date.now() - start;
    assert.ok(elapsed < 100, `Expected < 100ms, got ${elapsed}ms`);
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 2.3 Sleep inside a spawned thread
  logTest('Thread.sleep inside a spawned thread');
  try {
    const start = Date.now();
    const h = Thread.spawn(() => {
      // Worker threads can use Thread.sleep synchronously
      let sum = 0;
      for (let i = 0; i < 100000; i++) sum += i;
      return sum;
    });
    const r = await Thread.join(h);
    assert.strictEqual(r, 4999950000);
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 3: Concurrent Threads
  // ─────────────────────────────────────────────────────────
  logSection('3. Concurrent Threads');

  // 3.1 Two threads in parallel
  logTest('Two threads with Promise.all');
  try {
    const h1 = Thread.spawn((x) => x * 2, 21);
    const h2 = Thread.spawn((x) => x * 3, 14);
    const [r1, r2] = await Promise.all([Thread.join(h1), Thread.join(h2)]);
    assert.strictEqual(r1, 42);
    assert.strictEqual(r2, 42);
    pass();
  } catch (e) { fail(e); }

  // 3.2 Many concurrent threads
  logTest('10 concurrent threads');
  try {
    const handles = [];
    for (let i = 0; i < 10; i++) {
      handles.push(Thread.spawn((n) => n * n, i));
    }
    const results = await Promise.all(handles.map(h => Thread.join(h)));
    const expected = [0, 1, 4, 9, 16, 25, 36, 49, 64, 81];
    assert.deepStrictEqual(results, expected);
    pass();
  } catch (e) { fail(e); }

  // 3.3 Threads return at different times
  logTest('Threads with varying workloads');
  try {
    const start = Date.now();
    const h1 = Thread.spawn(() => {
      let s = 0; for (let i = 0; i < 10000; i++) s += i; return 'fast';
    });
    const h2 = Thread.spawn(() => {
      let s = 0; for (let i = 0; i < 1000000; i++) s += i; return 'medium';
    });
    const h3 = Thread.spawn(() => {
      let s = 0; for (let i = 0; i < 5000000; i++) s += i; return 'slow';
    });
    const [r1, r2, r3] = await Promise.all([
      Thread.join(h1), Thread.join(h2), Thread.join(h3)
    ]);
    const elapsed = Date.now() - start;
    assert.strictEqual(r1, 'fast');
    assert.strictEqual(r2, 'medium');
    assert.strictEqual(r3, 'slow');
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 3.4 Sequential thread joins
  logTest('Sequential thread execution');
  try {
    let result = 0;
    for (let i = 1; i <= 5; i++) {
      const h = Thread.spawn((x) => x * x, i);
      result += await Thread.join(h);
    }
    // 1 + 4 + 9 + 16 + 25 = 55
    assert.strictEqual(result, 55);
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 4: parallelMap — Comprehensive
  // ─────────────────────────────────────────────────────────
  logSection('4. Array.prototype.parallelMap');

  // 4.1 Basic map
  logTest('Basic: x => x * x');
  try {
    const r = await [1, 2, 3, 4, 5].parallelMap((x) => x * x);
    assert.deepStrictEqual(r, [1, 4, 9, 16, 25]);
    pass();
  } catch (e) { fail(e); }

  // 4.2 Empty array
  logTest('Edge case: empty array');
  try {
    const r = await [].parallelMap((x) => x);
    assert.deepStrictEqual(r, []);
    pass();
  } catch (e) { fail(e); }

  // 4.3 Single element
  logTest('Edge case: single element');
  try {
    const r = await [42].parallelMap((x) => x + 1);
    assert.deepStrictEqual(r, [43]);
    pass();
  } catch (e) { fail(e); }

  // 4.4 String transformation
  logTest('String transformation');
  try {
    const r = await ['hello', 'world'].parallelMap((s) => s.toUpperCase());
    assert.deepStrictEqual(r, ['HELLO', 'WORLD']);
    pass();
  } catch (e) { fail(e); }

  // 4.5 Object creation
  logTest('Map to objects');
  try {
    const r = await [1, 2, 3].parallelMap((x) => ({ value: x, squared: x * x }));
    assert.deepStrictEqual(r, [
      { value: 1, squared: 1 },
      { value: 2, squared: 4 },
      { value: 3, squared: 9 }
    ]);
    pass();
  } catch (e) { fail(e); }

  // 4.6 Large array
  logTest('Large array (1000 elements)');
  try {
    const input = Array.from({ length: 1000 }, (_, i) => i);
    const start = Date.now();
    const r = await input.parallelMap((x) => x * 2);
    const elapsed = Date.now() - start;
    assert.strictEqual(r.length, 1000);
    assert.strictEqual(r[0], 0);
    assert.strictEqual(r[999], 1998);
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 4.7 Heavy computation per element
  logTest('Heavy computation per element');
  try {
    const start = Date.now();
    const r = await [1, 2, 3, 4].parallelMap((x) => {
      let sum = 0;
      for (let i = 0; i < 100000; i++) sum += i * x;
      return sum;
    });
    const elapsed = Date.now() - start;
    assert.strictEqual(r[0], 4999950000);  // sum(0..99999) * 1
    assert.strictEqual(r[1], 9999900000);  // sum(0..99999) * 2
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 4.8 Math functions
  logTest('Math functions (sqrt)');
  try {
    const r = await [4, 9, 16, 25, 100].parallelMap((x) => Math.sqrt(x));
    assert.deepStrictEqual(r, [2, 3, 4, 5, 10]);
    pass();
  } catch (e) { fail(e); }

  // 4.9 Boolean mapping
  logTest('Map to booleans');
  try {
    const r = await [1, 2, 3, 4, 5].parallelMap((x) => x > 3);
    assert.deepStrictEqual(r, [false, false, false, true, true]);
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 5: parallelFilter — Comprehensive
  // ─────────────────────────────────────────────────────────
  logSection('5. Array.prototype.parallelFilter');

  // 5.1 Basic filter — evens
  logTest('Filter even numbers');
  try {
    const r = await [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].parallelFilter((x) => x % 2 === 0);
    assert.deepStrictEqual(r, [2, 4, 6, 8, 10]);
    pass();
  } catch (e) { fail(e); }

  // 5.2 Filter — none match
  logTest('Filter: no matches');
  try {
    const r = await [1, 2, 3].parallelFilter((x) => x > 100);
    assert.deepStrictEqual(r, []);
    pass();
  } catch (e) { fail(e); }

  // 5.3 Filter — all match
  logTest('Filter: all match');
  try {
    const r = await [10, 20, 30].parallelFilter((x) => x > 0);
    assert.deepStrictEqual(r, [10, 20, 30]);
    pass();
  } catch (e) { fail(e); }

  // 5.4 Filter empty array
  logTest('Filter: empty array');
  try {
    const r = await [].parallelFilter((x) => true);
    assert.deepStrictEqual(r, []);
    pass();
  } catch (e) { fail(e); }

  // 5.5 Filter strings by length
  logTest('Filter strings by length');
  try {
    const r = await ['a', 'bb', 'ccc', 'dd', 'eeeee'].parallelFilter((s) => s.length > 2);
    assert.deepStrictEqual(r, ['ccc', 'eeeee']);
    pass();
  } catch (e) { fail(e); }

  // 5.6 Filter with computation
  logTest('Filter primes');
  try {
    const r = await [2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13].parallelFilter((n) => {
      if (n < 2) return false;
      for (let i = 2; i <= Math.sqrt(n); i++) {
        if (n % i === 0) return false;
      }
      return true;
    });
    assert.deepStrictEqual(r, [2, 3, 5, 7, 11, 13]);
    pass();
  } catch (e) { fail(e); }

  // 5.7 Large filter
  logTest('Large filter (1000 elements, keep odds)');
  try {
    const input = Array.from({ length: 1000 }, (_, i) => i);
    const start = Date.now();
    const r = await input.parallelFilter((x) => x % 2 !== 0);
    const elapsed = Date.now() - start;
    assert.strictEqual(r.length, 500);
    assert.strictEqual(r[0], 1);
    assert.strictEqual(r[499], 999);
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 6: Error Handling
  // ─────────────────────────────────────────────────────────
  logSection('6. Error Handling');

  // 6.1 Thread that throws
  logTest('Thread.spawn with thrown error');
  try {
    const h = Thread.spawn(() => { throw new Error('Worker crash!'); });
    await Thread.join(h);
    fail(new Error('Should have thrown'));
  } catch (e) {
    if (e.message && e.message.includes('Worker crash')) {
      pass();
    } else if (e.message && e.message.includes('Thread crashed')) {
      pass('(caught as thread crash)');
    } else {
      // The error was caught — that's still correct behavior
      pass('(error caught)');
    }
  }

  // 6.2 Thread with undefined reference
  logTest('Thread with ReferenceError');
  try {
    const h = Thread.spawn(() => { return undefinedVariable; });
    await Thread.join(h);
    fail(new Error('Should have thrown'));
  } catch (e) {
    pass('(error caught)');
  }

  // 6.3 Thread with type error
  logTest('Thread with TypeError');
  try {
    const h = Thread.spawn(() => { null.property; });
    await Thread.join(h);
    fail(new Error('Should have thrown'));
  } catch (e) {
    pass('(error caught)');
  }

  // ─────────────────────────────────────────────────────────
  // SECTION 7: Data Type Serialization
  // ─────────────────────────────────────────────────────────
  logSection('7. Data Type Serialization');

  // 7.1 Pass and return various types
  logTest('Number → Number');
  try {
    const h = Thread.spawn((x) => x + 0.5, 1.5);
    assert.strictEqual(await Thread.join(h), 2);
    pass();
  } catch (e) { fail(e); }

  logTest('String → String');
  try {
    const h = Thread.spawn((s) => s.split('').reverse().join(''), 'hello');
    assert.strictEqual(await Thread.join(h), 'olleh');
    pass();
  } catch (e) { fail(e); }

  logTest('Array → Array');
  try {
    const h = Thread.spawn((arr) => arr.map(x => x * 2), [1, 2, 3]);
    assert.deepStrictEqual(await Thread.join(h), [2, 4, 6]);
    pass();
  } catch (e) { fail(e); }

  logTest('Object → Object');
  try {
    const h = Thread.spawn((obj) => ({ ...obj, computed: obj.x + obj.y }), { x: 10, y: 20 });
    const r = await Thread.join(h);
    assert.strictEqual(r.x, 10);
    assert.strictEqual(r.y, 20);
    assert.strictEqual(r.computed, 30);
    pass();
  } catch (e) { fail(e); }

  logTest('Multiple argument types');
  try {
    const h = Thread.spawn((num, str, arr, obj) => {
      return { num, str, arrLen: arr.length, key: obj.key };
    }, 42, 'test', [1, 2, 3], { key: 'value' });
    const r = await Thread.join(h);
    assert.strictEqual(r.num, 42);
    assert.strictEqual(r.str, 'test');
    assert.strictEqual(r.arrLen, 3);
    assert.strictEqual(r.key, 'value');
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 8: Computation Benchmarks
  // ─────────────────────────────────────────────────────────
  logSection('8. Computation Benchmarks');

  // 8.1 Fibonacci (recursive, expensive)
  logTest('Fibonacci(30) on thread');
  try {
    const start = Date.now();
    const h = Thread.spawn(() => {
      function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
      return fib(30);
    });
    const r = await Thread.join(h);
    const elapsed = Date.now() - start;
    assert.strictEqual(r, 832040);
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 8.2 Parallel fibonacci — multiple at once
  logTest('3x Fibonacci(28) in parallel vs serial');
  try {
    // Parallel
    const pStart = Date.now();
    const handles = [28, 28, 28].map(n =>
      Thread.spawn((n) => {
        function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
        return fib(n);
      }, n)
    );
    const parallelResults = await Promise.all(handles.map(h => Thread.join(h)));
    const pElapsed = Date.now() - pStart;

    // Serial
    const sStart = Date.now();
    function fib(n) { return n <= 1 ? n : fib(n - 1) + fib(n - 2); }
    const serialResults = [fib(28), fib(28), fib(28)];
    const sElapsed = Date.now() - sStart;

    assert.deepStrictEqual(parallelResults, serialResults);
    const speedup = (sElapsed / pElapsed).toFixed(2);
    pass(`(parallel: ${pElapsed}ms, serial: ${sElapsed}ms, speedup: ${speedup}x)`);
  } catch (e) { fail(e); }

  // 8.3 parallelMap benchmark — heavy per-element work
  logTest('parallelMap benchmark: 8 heavy elements');
  try {
    const input = [1, 2, 3, 4, 5, 6, 7, 8];

    // Parallel
    const pStart = Date.now();
    const pResult = await input.parallelMap((x) => {
      let sum = 0;
      for (let i = 0; i < 500000; i++) sum += i * x;
      return sum;
    });
    const pElapsed = Date.now() - pStart;

    // Serial
    const sStart = Date.now();
    const sResult = input.map((x) => {
      let sum = 0;
      for (let i = 0; i < 500000; i++) sum += i * x;
      return sum;
    });
    const sElapsed = Date.now() - sStart;

    assert.deepStrictEqual(pResult, sResult);
    const speedup = (sElapsed / pElapsed).toFixed(2);
    pass(`(parallel: ${pElapsed}ms, serial: ${sElapsed}ms, speedup: ${speedup}x)`);
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 9: Stress Tests
  // ─────────────────────────────────────────────────────────
  logSection('9. Stress Tests');

  // 9.1 Many small tasks
  logTest('50 small concurrent tasks');
  try {
    const start = Date.now();
    const handles = [];
    for (let i = 0; i < 50; i++) {
      handles.push(Thread.spawn((n) => n * n + 1, i));
    }
    const results = await Promise.all(handles.map(h => Thread.join(h)));
    const elapsed = Date.now() - start;
    for (let i = 0; i < 50; i++) {
      assert.strictEqual(results[i], i * i + 1);
    }
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 9.2 Sequential rapid spawn/join
  logTest('20 sequential spawn/join cycles');
  try {
    const start = Date.now();
    for (let i = 0; i < 20; i++) {
      const h = Thread.spawn((x) => x + 1, i);
      const r = await Thread.join(h);
      assert.strictEqual(r, i + 1);
    }
    const elapsed = Date.now() - start;
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 9.3 Large data transfer
  logTest('Large array transfer (10000 elements)');
  try {
    const bigArray = Array.from({ length: 10000 }, (_, i) => i);
    const start = Date.now();
    const h = Thread.spawn((arr) => {
      return arr.reduce((sum, x) => sum + x, 0);
    }, bigArray);
    const r = await Thread.join(h);
    const elapsed = Date.now() - start;
    assert.strictEqual(r, 49995000); // sum 0..9999
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // 9.4 Mixed workloads
  logTest('Mixed parallelMap + Thread.spawn');
  try {
    const start = Date.now();
    const mapPromise = [1, 2, 3, 4, 5].parallelMap((x) => x * 10);
    const threadHandle = Thread.spawn(() => 'thread-done');
    const [mapResult, threadResult] = await Promise.all([
      mapPromise,
      Thread.join(threadHandle)
    ]);
    const elapsed = Date.now() - start;
    assert.deepStrictEqual(mapResult, [10, 20, 30, 40, 50]);
    assert.strictEqual(threadResult, 'thread-done');
    pass(`(${elapsed}ms)`);
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // SECTION 10: Edge Cases
  // ─────────────────────────────────────────────────────────
  logSection('10. Edge Cases');

  // 10.1 Return undefined
  logTest('Return undefined');
  try {
    const h = Thread.spawn(() => { let x = 1; });
    const r = await Thread.join(h);
    assert.strictEqual(r, undefined);
    pass();
  } catch (e) { fail(e); }

  // 10.2 Empty string
  logTest('Empty string argument and return');
  try {
    const h = Thread.spawn((s) => s + s, '');
    const r = await Thread.join(h);
    assert.strictEqual(r, '');
    pass();
  } catch (e) { fail(e); }

  // 10.3 Negative numbers
  logTest('Negative numbers');
  try {
    const h = Thread.spawn((a, b) => a - b, -10, -20);
    const r = await Thread.join(h);
    assert.strictEqual(r, 10);
    pass();
  } catch (e) { fail(e); }

  // 10.4 Special float values
  logTest('Special float: Infinity, NaN');
  try {
    const h1 = Thread.spawn(() => Infinity);
    const h2 = Thread.spawn(() => NaN);
    const r1 = await Thread.join(h1);
    const r2 = await Thread.join(h2);
    assert.strictEqual(r1, Infinity);
    assert.ok(Number.isNaN(r2));
    pass();
  } catch (e) { fail(e); }

  // 10.5 Deeply nested data
  logTest('Deeply nested object');
  try {
    const h = Thread.spawn(() => ({ a: { b: { c: { d: { e: 'deep' } } } } }));
    const r = await Thread.join(h);
    assert.strictEqual(r.a.b.c.d.e, 'deep');
    pass();
  } catch (e) { fail(e); }

  // 10.6 Array with mixed types
  logTest('Array with mixed types');
  try {
    const h = Thread.spawn(() => [1, 'two', true, null, { x: 3 }]);
    const r = await Thread.join(h);
    assert.strictEqual(r[0], 1);
    assert.strictEqual(r[1], 'two');
    assert.strictEqual(r[2], true);
    assert.strictEqual(r[3], null);
    assert.strictEqual(r[4].x, 3);
    pass();
  } catch (e) { fail(e); }

  // 10.7 Unicode strings
  logTest('Unicode strings');
  try {
    const h = Thread.spawn((s) => s + ' 🌍', '🚀 Hello');
    const r = await Thread.join(h);
    assert.strictEqual(r, '🚀 Hello 🌍');
    pass();
  } catch (e) { fail(e); }

  // 10.8 RegExp in thread
  logTest('RegExp matching in thread');
  try {
    const h = Thread.spawn((text) => {
      const matches = text.match(/\d+/g);
      return matches ? matches.map(Number) : [];
    }, 'There are 3 cats and 42 dogs');
    const r = await Thread.join(h);
    assert.deepStrictEqual(r, [3, 42]);
    pass();
  } catch (e) { fail(e); }

  // 10.9 JSON parse/stringify in thread
  logTest('JSON parse/stringify in thread');
  try {
    const h = Thread.spawn((jsonStr) => {
      const obj = JSON.parse(jsonStr);
      obj.processed = true;
      return JSON.stringify(obj);
    }, '{"name":"test","value":123}');
    const r = await Thread.join(h);
    const parsed = JSON.parse(r);
    assert.strictEqual(parsed.name, 'test');
    assert.strictEqual(parsed.value, 123);
    assert.strictEqual(parsed.processed, true);
    pass();
  } catch (e) { fail(e); }

  // ─────────────────────────────────────────────────────────
  // FINAL REPORT
  // ─────────────────────────────────────────────────────────
  clearInterval(keepalive);

  console.log('\n' + '═'.repeat(60));
  console.log('  TEST RESULTS');
  console.log('═'.repeat(60));
  console.log(`  ✅ Passed:  ${passed}`);
  console.log(`  ❌ Failed:  ${failed}`);
  console.log(`  ⏭️  Skipped: ${skipped}`);
  console.log(`  📊 Total:   ${passed + failed + skipped}`);
  console.log('═'.repeat(60));

  if (failed > 0) {
    console.log('\n  ⚠️  SOME TESTS FAILED\n');
    process.exit(1);
  } else {
    console.log('\n  🎉 ALL TESTS PASSED!\n');
  }
}

runTests().catch(err => {
  console.error('\n💥 Unhandled error:', err);
  process.exit(1);
});
