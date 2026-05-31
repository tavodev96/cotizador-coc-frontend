<script setup>
definePageMeta({
  layout: false,
})

const { logout } = useSanctumAuth()

onMounted(async () => {
  try {
    await logout()
  } finally {
    await navigateTo('/login', { replace: true })
  }
})
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-slate-50 text-slate-700">
    Cerrando sesión...
  </div>
</template>
