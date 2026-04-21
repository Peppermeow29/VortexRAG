import { createI18n } from 'vue-i18n'
import en from './en.js'
import zh from './zh.js'

export const i18n = createI18n({
  legacy: false,
  locale: 'en',
  fallbackLocale: 'en',
  messages: { en, zh }
})
