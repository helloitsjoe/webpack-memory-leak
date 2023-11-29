# Webpack Memory Leak

This is a basic Webpack setup with HtmlWebpackPlugin to reproduce the memory leak described in this Webpack issue: https://github.com/webpack/webpack/issues/13127

## How to reproduce

To trigger the leak, start the dev server with `yarn dev`, and then save `index.template.html`. Each time you save you should see memory growing by ~2mb, and if you inspect the WeakMap `htmlWebpackPluginHooksMap` [here](https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/hooks.js#L71) you can see a new entry added each time, entries which are never garbage collected.

## What seems to be happening

When `index.template.html` is changed in watch mode, HtmlWebpackPlugin sees that the fileSystem cache has been invalidated [here][invalidated] and creates a new child compiler [here][child-compiler]. When the plugin runs, child compiler calls `generateHtml` [here][generate] which makes a few calls to `getHtmlWebpackPluginHooks`, [for example here][example]. The first time that function is called in a compilation, it will use the compilation as a key in [`htmlWebpackPluginHooksMap`][hooks-map]. If `index.js` is changed, the fileSystem cache is still valid as far as HtmlWebpackPlugin is concerned, so it uses the cache, never creates a new child compiler, and does not add to the WeakMap.

## Why aren't the Compilations garbage collected?

Here's where my knowledge gets a bit fuzzier, but in this screenshot we can see the Compilation linked back to [`moduleGraphForModuleMap`][graph-map]:

<details open>
  <summary>Heap snapshot</summary>

  ![Heap snapshot](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/16261650-af93-4bcb-9eb4-0e2713cba416)
  
</details>

And we can see that each key in that WeakMap has a reference to the `compilation`, which has a reference to the HtmlWebpackPlugin compiler:

<details open>
  <summary>WeakMap</summary>

  ![WeakMap](https://github.com/helloitsjoe/webpack-memory-leak/assets/8823810/fb6b5ab5-7ccc-4a8b-9621-7f247784f027)

</details>

I'm not sure if this is the only reference to the compilations, and I'm not sure if this reference would prevent the Compilations from being GCed...

[invalidated]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L262
[child-compiler]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/cached-child-compiler.js#L400
[generate]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L174
[example]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/index.js#L1041
[hooks-map]: https://github.com/jantimon/html-webpack-plugin/blob/fe231d3d3d256c2bb904b9e0f3f1e7aa67d7f3cd/lib/hooks.js#L71
[graph-map]: https://github.com/webpack/webpack/blob/87660921808566ef3b8796f8df61bd79fc026108/lib/ModuleGraph.js#L859
