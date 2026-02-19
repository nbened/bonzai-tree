// Which loops are enabled per release channel
// Tree-shaking removes disabled loops from the bundle
// dev=dev, beta=staging, stable=prod
export const CHANNELS = {
  dev: ['readwrite', 'backend'],
  staging: ['readwrite', 'backend'],
  prod: ['readwrite']
}

const channel = process.env.RELEASE_CHANNEL || 'dev'
export const ENABLED_LOOPS = CHANNELS[channel] || CHANNELS.prod
