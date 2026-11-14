<script setup lang="ts">
import ReporteCotizaciones from './cotizaciones.vue'
definePageMeta({ middleware: ['sanctum:auth'] })
</script>

<template>
  <ReporteCotizaciones pgp />
</template>
