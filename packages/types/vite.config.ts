import { defineConfig } from "vite";
import { resolve } from "path";
import { fileURLToPath, URL } from "node:url";
import dts from "vite-plugin-dts";

const __dirname = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
	plugins: [
		dts({
			include: ["src/**/*"],
			exclude: ["src/**/*.test.ts", "src/test/**/*"],
			outDir: resolve(__dirname, "dist"),
		}),
	],
	build: {
		outDir: resolve(__dirname, "dist"),
		lib: {
			entry: {
				index: resolve(__dirname, "src/index.ts"),
				"entities/index": resolve(__dirname, "src/entities/index.ts"),
			},
			formats: ["es"],
		},
		rollupOptions: {
			external: ["zod"],
			output: {
				preserveModules: true,
				preserveModulesRoot: resolve(__dirname, "src"),
				entryFileNames: "[name].js",
				exports: "named",
			},
		},
		sourcemap: true,
		target: "es2022",
		minify: false,
		copyPublicDir: false,
		emptyOutDir: true,
	},
});
