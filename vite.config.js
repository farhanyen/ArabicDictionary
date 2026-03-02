// vite.config.js
import { defineConfig } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
// const __filename = fileURLToPath(import.meta.url);
// const __dirname = path.dirname(__filename);

const srcPath = fileURLToPath(new URL('./src', import.meta.url));

console.log(srcPath)
// Include plugins as necessary, for example:
// import vue from '@vitejs/plugin-vue'; // If using Vue
// import react from '@vitejs/plugin-react'; // If using React

// console.log(resolve(__dirname, './src/filereader.browser.js'))
export default defineConfig({
    plugins: [
        // vue(),  // Uncomment and use if the project is using Vue
        // react() // Uncomment and use if the project is using React
    ],
    build: {
        // Set target to 'esnext' to enable top-level await
        target: 'esnext',
        outDir: 'dist',
        rollupOptions: {
            input: {
                background: 'src/background.js',
                content: 'src/content.js',
                // Add more entry points if necessary
            },
            output: {
                entryFileNames: `[name].js`,
                chunkFileNames: `[name].js`,
                assetFileNames: `[name].[ext]`,
                // More output options as needed
            }
        },
        // resolve: {
        //     alias: [
        //         { find: '@', replacement: fileURLToPath(new URL('./src', import.meta.url)) },
        //     ],
        // },
        // Consider disabling minification for development builds
        // minify: process.env.NODE_ENV === 'production' ? 'terser' : false,
    }
});
