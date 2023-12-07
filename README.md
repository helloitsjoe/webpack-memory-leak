# Webpack Memory Leak

This is a basic Webpack setup with `HtmlWebpackPlugin` to reproduce the memory leak described in this Webpack issue: https://github.com/webpack/webpack/issues/17851

## How to reproduce

1. `$ yarn`
2. Run `webpack serve` in inspect mode: `$ NODE_OPTIONS=--inspect $(yarn bin webpack) serve`
3. Open a memory profiler, for example `chrome://inspect` in Chrome
4. Take a heap snapshot
5. Save `index.template.html`, which will cause `HtmlWebpackPlugin` to create a child compiler. Each time you save, memory should grow ~2mb
6. Take a second heap snapshot and notice the difference in size

Inspecting the diff between heap snapshots you can see a number of object instances are added on each recompilation. Notice these in particular: `Compilation`, `JavascriptParser`, `FileSystemInfo`, `NormalModuleFactory`, `HookMap`, `Hook`. Instances of these objects (and others) should remain constant no matter how many recompilations are triggered. Instead we see new instances added on each recompilation.

Note that you must save `index.template.html` to see this behavior, since this creates a new child compiler in `HtmlWebpackPlugin`.

## Why aren't the Compilations garbage collected?

TODO: Add details

<details>
  <summary>Heap snapshot</summary>

  ![Heap snapshot](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/16261650-af93-4bcb-9eb4-0e2713cba416)

</details>

<details>
  <summary>WeakMap</summary>

  ![WeakMap](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/fb6b5ab5-7ccc-4a8b-9621-7f247784f027)

</details>

## The Fix

TODO: Fill this out after submitting PR

[invalidated]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L262
[child-compiler]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L400
[generate]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L174
[example]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L1041
[hooks-map]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/hooks.js#L71
[graph-map]: https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ModuleGraph.js#L859
