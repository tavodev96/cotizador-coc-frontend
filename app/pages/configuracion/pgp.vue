<script setup lang="ts">
definePageMeta({ middleware: ['sanctum:auth'] })
const { hasPermission, ensureUserPermissions } = useUserPermissions()
const settings = reactive({ nombre: 'PGP', telefono: '', correo: '' })
const message = ref('')
onMounted(async () => {
  await ensureUserPermissions()
  if (!hasPermission('configuracion.pgp.editar')) return navigateTo('/403')
  const { data } = await useSanctumFetch('/api/configuracion/pgp')
  if (data.value?.settings) Object.assign(settings, data.value.settings)
})
const guardar = async () => {
  message.value = ''
  const { error } = await useSanctumFetch('/api/configuracion/pgp', { method: 'PUT', body: settings })
  message.value = error.value ? 'No fue posible guardar los datos PGP.' : 'Datos PGP guardados.'
}
</script>
<template>
  <section class="max-w-xl mx-auto bg-white rounded-xl p-6 space-y-4">
    <h1 class="text-xl font-semibold">Datos de impresión PGP</h1>
    <label class="block">Nombre / etiqueta<input v-model="settings.nombre" class="block w-full border rounded p-2" maxlength="100" required /></label>
    <label class="block">Teléfono<input v-model="settings.telefono" class="block w-full border rounded p-2" maxlength="50" /></label>
    <label class="block">Correo<input v-model="settings.correo" type="email" class="block w-full border rounded p-2" maxlength="255" /></label>
    <button class="bg-emerald-700 text-white rounded px-4 py-2" @click="guardar">Guardar</button>
    <p role="status">{{ message }}</p>
  </section>
</template>
