import { combinePresetAndAppleSplashScreens, defineConfig, minimal2023Preset } from '@vite-pwa/assets-generator/config'

const GREEN = '#15803d'

export default defineConfig({
  headLinkOptions: { preset: '2023' },
  preset: combinePresetAndAppleSplashScreens(
    {
      ...minimal2023Preset,
      maskable: { ...minimal2023Preset.maskable, padding: 0.1, resizeOptions: { background: GREEN } },
      apple: { ...minimal2023Preset.apple, padding: 0.1, resizeOptions: { background: GREEN } },
    },
    {
      padding: 0.35,
      resizeOptions: { background: GREEN, fit: 'contain' },
      darkResizeOptions: { background: GREEN, fit: 'contain' },
      linkMediaOptions: { log: true, addMediaScreen: true, basePath: './', xhtml: false },
      png: { compressionLevel: 9, quality: 70 },
    },
    [
      'iPhone 17 Pro Max', 'iPhone 17 Pro', 'iPhone Air', 'iPhone 17', 'iPhone 16 Pro Max', 'iPhone 16 Pro', 'iPhone 16 Plus', 'iPhone 16', 'iPhone 16e',
      'iPhone 15 Pro Max', 'iPhone 15 Pro', 'iPhone 14 Plus', 'iPhone 13 mini', 'iPhone 11 Pro Max', 'iPhone 11', 'iPhone SE 4.7"',
    ],
  ),
  images: ['public/logo.svg'],
})
