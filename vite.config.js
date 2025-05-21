import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { splitVendorChunkPlugin } from 'vite';
import { visualizer } from 'rollup-plugin-visualizer';
import compression from 'vite-plugin-compression2';

export default defineConfig(({ command, mode }) => {
  const isProduction = mode === 'production';

  return {
    plugins: [
      react(),
      // Split vendor chunks for better caching
      splitVendorChunkPlugin(),
      // Generate compressed versions of assets
      isProduction && compression({
        algorithm: 'gzip',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 1024, // Only compress files larger than 1KB
      }),
      // Generate brotli compressed versions
      isProduction && compression({
        algorithm: 'brotliCompress',
        exclude: [/\.(br)$/, /\.(gz)$/],
        threshold: 1024,
      }),
      // Visualize bundle size in production
      isProduction && visualizer({
        open: false,
        gzipSize: true,
        brotliSize: true,
        filename: 'dist/stats.html',
      }),
    ].filter(Boolean),

    resolve: {
      alias: [{ find: "@", replacement: "/src" }],
      dedupe: ['react', 'react-dom'],
    },

    build: {
      // Generate source maps in production for debugging
      sourcemap: isProduction ? 'hidden' : true,
      // Minify the output
      minify: isProduction ? 'terser' : false,
      // Terser options for better minification
      terserOptions: {
        compress: {
          drop_console: isProduction,
          drop_debugger: isProduction,
        },
      },

      // Chunk size warning limit
      chunkSizeWarningLimit: 1000,
      // Rollup options
      rollupOptions: {
        output: {
          // Ensure React is loaded first by using a predictable chunk name
          // and setting up proper chunk loading order
          manualChunks: {
            'vendor-react-core': ['react', 'react-dom', 'react/jsx-runtime'],
            'vendor-react-router': ['react-router-dom'],
          },
        },
      },
    },

    // Development server options
    server: {
      hmr: true,
      port: 5173,
      host: true,
    },

    // Optimize dependencies
    optimizeDeps: {
      include: ['react', 'react-dom', 'react/jsx-runtime', 'react-router-dom', '@material-tailwind/react'],
    },
  };
});
