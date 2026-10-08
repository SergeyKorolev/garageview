import * as esbuild from "esbuild";
import path from "path";

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["app/javascript/application.tsx"],
  bundle: true,
  sourcemap: true,
  format: "esm",
  outdir: "app/assets/builds",
  publicPath: "/assets",
  loader: { ".tsx": "tsx", ".ts": "ts" },
  alias: {
    "@": path.resolve("app/javascript"),
  },
};

if (watch) {
  const ctx = await esbuild.context(config);
  await ctx.watch();
  console.log("Watching for changes...");
} else {
  await esbuild.build(config);
}
