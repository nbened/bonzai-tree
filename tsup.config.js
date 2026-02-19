import { defineConfig } from 'tsup'
import { CHANNELS } from './src/loops.config.js'

const channel = process.env.RELEASE_CHANNEL || 'prod'
const enabledLoops = CHANNELS[channel] || ['visualization', 'backend']

export default defineConfig({
  entry: ['src/index.js'],
  format: ['esm'],
  treeshake: true,
  splitting: false,
  clean: true,
  outDir: 'dist',
  define: {
    'process.env.RELEASE_CHANNEL': JSON.stringify(channel)
  },
  // Copy necessary files based on enabled loops
  onSuccess: async () => {
    const fs = await import('fs')
    const path = await import('path')

    // Copy payload-bonzai (config template)
    fs.cpSync('payload-bonzai', 'dist/payload-bonzai', { recursive: true })

    // Copy graph-templates for enabled loops
    const loopNames = ['visualization', 'readwrite', 'backend']
    const activeLoops = loopNames.filter(l => enabledLoops.includes(l))

    if (activeLoops.length > 0) {
      fs.copyFileSync('src/bconfig.js', 'dist/bconfig.js')

      // Copy graph-templates base files
      fs.mkdirSync('dist/graph-templates', { recursive: true })
      fs.copyFileSync('graph-templates/receiver.js', 'dist/graph-templates/receiver.js')
      fs.copyFileSync('graph-templates/config.js', 'dist/graph-templates/config.js')
      fs.copyFileSync('graph-templates/ignore.txt', 'dist/graph-templates/ignore.txt')
      fs.cpSync('graph-templates/utils', 'dist/graph-templates/utils', { recursive: true })

      fs.mkdirSync('dist/graph-templates/loops', { recursive: true })

      for (const loop of activeLoops) {
        const loopDir = `graph-templates/loops/${loop}`
        if (fs.existsSync(loopDir)) {
          fs.cpSync(loopDir, `dist/graph-templates/loops/${loop}`, { recursive: true })
        }
      }
    }
  }
})
