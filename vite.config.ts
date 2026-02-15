import { defineConfig } from "vite";
import { nitro } from "nitro/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";

export default defineConfig({
  server: {
    port: 3000,
    watch: {
      ignored: ["**/routeTree.gen.ts"],
    },
  },
  plugins: [
    nitro(),
    tsConfigPaths({
      projects: ["./tsconfig.json"],
    }),
    tanstackStart({
      srcDirectory: "src",
    }),
    viteReact(),
  ],
});
