# Webpack Memory Leak

This is a basic Webpack setup with `HtmlWebpackPlugin` to reproduce the memory leak described in this Webpack issue: https://github.com/webpack/webpack/issues/17851

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

WeakMaps only become a problem when another object (including another WeakMap) holds a reference to one of their keys or values. In this case I methodically cleaned up WeakMap references in `_cleanupLastCompilation` until I was able to narrow it down to [`chunkGraphForChunkMap`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ChunkGraph.js#L1804) holding onto `RuntimeModule`s which contain references to compilations from child compilers. The parent compilation reference is cleaned up when [`_cleanupLastCompilation`](https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/Compiler.js#L382-L394) runs, but the child is still referenced.

<details open>
  <summary>Heap snapshot</summary>

  <img width="1671" alt="Child compiler" src="https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/54627502-336c-4528-ba88-a52bb2c58280">

</details>

## The Fix

TODO: Fill out details after PR

It looks like there's still a smaller leak somewhere, but for this particular leak we're seeing the expected number of `Compilation`s, `JavascriptParser`s, `ModuleGraph`s, etc.

<details open>
  <summary>Heap diff after fix</summary>
  
  <img width="956" alt="Heap diff after" src="https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/8af5b7bc-a8d8-4af8-8347-5cf6a22750b0">

</details>

[invalidated]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L262
[child-compiler]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L400
[generate]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L174
[example]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L1041
[hooks-map]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/hooks.js#L71
[graph-map]: https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ModuleGraph.js#L859
