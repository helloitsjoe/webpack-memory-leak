// class CleanupPlugin {
//   apply(compiler) {
//     const { JavascriptModulesPlugin, EvalDevToolModulePlugin } =
//       compiler.webpack;
//     compiler.hooks.beforeCompile.tap("CleanupPlugin", (compilation) => {
//       const lastCompilation = compiler._lastCompilation;
//       if (lastCompilation !== undefined) {
//         for (const childCompilation of lastCompilation.children) {
//           const hooks =
//             JavascriptModulesPlugin.getCompilationHooks(childCompilation);
//           hooks.renderModuleContent.tap("CleanupPlugin", (source) => {
//             // console.log("here");
//             // console.log("source", source);
//             EvalDevToolModulePlugin.clearForCache(source);
//           });
//         }
//       }
//     });
//   }
// }
