import { defineConfig } from "electron-vite";

export default defineConfig({
  main: {
    envPrefix: "OPENAI_",
  },
  preload: {},
  renderer: {},
});