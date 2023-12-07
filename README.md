# Webpack Memory Leak

This is a basic Webpack setup to reproduce the memory leak described in this Webpack issue: https://github.com/webpack/webpack/issues/17851

## Summary

Webpack doesn't fully clean up child compilers from previous compilations in watch mode. `HtmlWebpackPlugin` creates a child compiler so it's useful in this reproduction, but the leak itself is in Webpack.

## How to reproduce

1. `yarn`
2. Run `webpack serve` in inspect mode: `NODE_OPTIONS=--inspect $(yarn bin webpack) serve`
3. Open a memory profiler, for example `chrome://inspect` in Chrome
4. Take a heap snapshot
5. Save `index.template.html`, which will cause `HtmlWebpackPlugin` to create a child compiler. Each time you save, memory should grow ~2mb
6. Take a second heap snapshot and notice the difference in size

Inspecting the diff between heap snapshots you can see a number of object instances are added on each recompilation. Notice these in particular: `Compilation`, `JavascriptParser`, `FileSystemInfo`, `NormalModuleFactory`, `HookMap`, `Hook`. Instances of these objects (and others) should remain constant no matter how many recompilations are triggered. Instead we see new instances added on each recompilation.

Note that you must save `index.template.html` to see this behavior, since this creates a new child compiler in `HtmlWebpackPlugin`.

<details>
  <summary>Heap diff before fix</summary>

  <img width="956" alt="Heap diff before" src="https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/63b8f317-66db-465a-8243-ea822639edd6">

</details>

## Why aren't these objects garbage collected?

There are a number of `WeakMap`s used as caches in Webpack and HtmlWebpackPlugin. If we inspect these objects we can see that they always trace back to a `WeakMap`, for example many of these `Compilation`s are decendents of [`moduleGraphForModuleMap`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ModuleGraph.js#L859). We expect 2 `Compilation` instances at any time: one in `_lastCompilation` and one as a child of `_lastCompilation`. These compilations are cleaned up at the beginning of the next compilation, [see the source here](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/Compiler.js#L1113).

<details>
  <summary>Heap snapshot</summary>

  ![Heap snapshot](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/16261650-af93-4bcb-9eb4-0e2713cba416)

</details>

<details>
  <summary>moduleGraphForModuleMap</summary>

  ![WeakMap](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/fb6b5ab5-7ccc-4a8b-9621-7f247784f027)

</details>

WeakMaps can become a source of a memory leak when another object (including another WeakMap) holds a reference to one of their keys or values.

<details open>
  <summary>Heap snapshot</summary>

  <img width="1671" alt="Child compiler" src="https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/54627502-336c-4528-ba88-a52bb2c58280">

</details>

## The Fix

[Webpack PR here](https://github.com/webpack/webpack/pull/17853).

In this case I methodically cleaned up WeakMap references in `_cleanupLastCompilation` until I was able to narrow it down to [`chunkGraphForChunkMap`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ChunkGraph.js#L1804) holding onto `RuntimeModule`s which contain references to compilations from child compilers. The parent compilation reference is cleaned up when [`_cleanupLastCompilation`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/Compiler.js#L382-L394) runs, but the child is still referenced. After calling `ChunkGraph.clearChunkGraphForChunk(chunk)` on all child compilation chunks the WeakMap references are properly garbage collected.

We're seeing the expected number of instances of `Compilation`, `JavascriptParser`, `ModuleGraph`, etc, and the number of instances stays constant over multiple recompilations. There appears to be a smaller leak which I believe is unrelated.

<details open>
  <summary>Heap diff after fix</summary>
  
  <img width="956" alt="Heap diff after" src="https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/8af5b7bc-a8d8-4af8-8347-5cf6a22750b0">

</details>
