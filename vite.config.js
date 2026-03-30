// import { fileURLToPath, URL } from 'node:url'
import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import process from 'node:process'
import path from 'node:path'


// https://vite.dev/config/
export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd());

	return {
		base: env.BASE_URL,
		plugins: [vue(), tailwindcss()],
		css: {
			devSourcemap: mode === "development",
		},
		resolve: {
			alias: {
				// '@': fileURLToPath(new URL('./src', import.meta.url))
				"@": path.resolve(__dirname, "./src"),
			},
			dedupe: ['yjs'],
		},
	}
})
