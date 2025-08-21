<template>
    <QuoterQuoteForm />
</template>
<script setup>
definePageMeta({
  layout: 'default',
  middleware: ['sanctum:auth']
})
</script>