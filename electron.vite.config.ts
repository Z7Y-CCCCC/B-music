import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import vue from '@vitejs/plugin-vue'

export default defineConfig({
  main: {
    resolve: {
      alias: {
        '@shared': resolve('src/shared')
      }
    },
    plugins: [externalizeDepsPlugin()]
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      rollupOptions: {
        input: {
          index: resolve(__dirname, 'src/preload/index.ts'),
          BilibiliMusicPlayer: resolve(__dirname, 'src/preload/players/BilibiliMusicPlayer/BilibiliMusicPlayer.ts'),
          BilibiliMusicSearch: resolve(__dirname, 'src/preload/players/BilibiliMusicPlayer/BilibiliMusicSearch.ts'),
        }
      }
    }
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared')
      }
    },
    build: {
      rollupOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes('node_modules')) {
              return
            }
            if (id.includes('vue-cropper')) {
              return 'vendor-cropper'
            }
            if (id.includes('@imengyu/vue3-context-menu')) {
              return 'vendor-context-menu'
            }
            if (id.includes('colorthief') || id.includes('@lrc-player/parse')) {
              return 'vendor-media'
            }
            return 'vendor'
          }
        }
      }
    },
    plugins: [vue({
      template: {
        compilerOptions: {
          isCustomElement: tag => tag === 'webview',
        }
      }
    })]
  }
})
