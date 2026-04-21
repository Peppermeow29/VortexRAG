<template>
  <svg xmlns="http://www.w3.org/2000/svg" :width="size" :height="size" viewBox="0 0 32 32" fill="none">
    <defs>
      <linearGradient :id="'l1'+uid" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" :stop-color="fg" stop-opacity="0.9"/>
        <stop offset="100%" :stop-color="fg" stop-opacity="0.15"/>
      </linearGradient>
      <linearGradient :id="'l2'+uid" x1="100%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" :stop-color="fg" stop-opacity="0.7"/>
        <stop offset="100%" :stop-color="fg" stop-opacity="0.1"/>
      </linearGradient>
      <linearGradient :id="'l3'+uid" x1="0%" y1="100%" x2="100%" y2="0%">
        <stop offset="0%" :stop-color="fg" stop-opacity="0.6"/>
        <stop offset="100%" :stop-color="fg" stop-opacity="0.1"/>
      </linearGradient>
    </defs>

    <!-- Background -->
    <rect v-if="bg" width="32" height="32" rx="8" fill="#111"/>

    <!-- Edges from center -->
    <line x1="15" y1="15" x2="8"  y2="7"  :stroke="'url(#l1'+uid+')'" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15" y1="15" x2="25" y2="8"  :stroke="'url(#l2'+uid+')'" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15" y1="15" x2="26" y2="22" :stroke="'url(#l3'+uid+')'" stroke-width="1.8" stroke-linecap="round"/>
    <line x1="15" y1="15" x2="9"  y2="24" :stroke="'url(#l1'+uid+')'" stroke-width="1.8" stroke-linecap="round"/>

    <!-- Cross-links -->
    <line x1="8"  y1="7"  x2="25" y2="8"  :stroke="fg" stroke-width="1" stroke-linecap="round" opacity="0.2"/>
    <line x1="26" y1="22" x2="9"  y2="24" :stroke="fg" stroke-width="1" stroke-linecap="round" opacity="0.2"/>

    <!-- Outer nodes -->
    <circle cx="8"  cy="7"  r="2.2" :fill="fg" opacity="0.9"/>
    <circle cx="25" cy="8"  r="1.6" :fill="fg" opacity="0.7"/>
    <circle cx="26" cy="22" r="2"   :fill="fg" opacity="0.8"/>
    <circle cx="9"  cy="24" r="1.4" :fill="fg" opacity="0.6"/>

    <!-- Center hub -->
    <circle cx="15" cy="15" r="3.8" :fill="fg"/>
  </svg>
</template>

<script setup>
import { computed } from 'vue'
const props = defineProps({
  size: { default: 24 },
  bg: { type: Boolean, default: true }
})
const uid = Math.random().toString(36).slice(2, 7)
const fg = computed(() => props.bg ? 'white' : 'var(--text-primary)')
</script>
