<template>
  <div class="space-y-4">
    <div>
      <h1 class="text-2xl font-semibold text-slate-900">Nueva cotización</h1>
      <p class="text-sm text-slate-600 mt-1">Completa la información para registrar una nueva gestión.</p>
    </div>
    <QuoterQuoteForm />
  </div>
</template>
<script setup>
definePageMeta({
  layout: 'default',
  middleware: ['sanctum:auth']
})
</script>