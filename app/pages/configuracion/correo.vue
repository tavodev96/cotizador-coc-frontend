<script setup>
import { push } from 'notivue'

definePageMeta({
  middleware: ['sanctum:auth'],
})

const loading = ref(true)
const saving = ref(false)
const logs = ref([])
const form = ref({
  mail_provider: 'hosting',
  mail_host: '',
  mail_port: 587,
  mail_encryption: 'tls',
  mail_username: '',
  mail_password: '',
  mail_from_address: '',
  mail_from_name: '',
})

const presets = {
  gmail: { mail_host: 'smtp.gmail.com', mail_port: 587, mail_encryption: 'tls' },
  outlook: { mail_host: 'smtp.office365.com', mail_port: 587, mail_encryption: 'tls' },
  hosting: { mail_host: '', mail_port: 465, mail_encryption: 'ssl' },
  custom: { mail_host: '', mail_port: 587, mail_encryption: 'tls' },
}

watch(() => form.value.mail_provider, (provider) => {
  const preset = presets[provider]
  if (!preset) return

  form.value = {
    ...form.value,
    ...preset,
  }
})

const fetchSettings = async () => {
  loading.value = true
  const { data, error } = await useSanctumFetch('/api/configuracion/correo')
  if (!error.value && data.value) {
    form.value = { ...form.value, ...(data.value.settings || data.value) }
    logs.value = Array.isArray(data.value.logs) ? data.value.logs : []
  }
  loading.value = false
}

const saveSettings = async () => {
  saving.value = true
  const { error } = await useSanctumFetch('/api/configuracion/correo', {
    method: 'PUT',
    body: form.value,
  })

  if (error.value) {
    push.error({ title: 'Error', message: 'No se pudo guardar la configuración de correo.' })
  } else {
    push.success({ title: 'Guardado', message: 'Configuración de correo actualizada.' })
    await fetchSettings()
  }

  saving.value = false
}

onMounted(fetchSettings)

const formatDateTime = (value) => {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: 'America/Bogota',
  }).format(date)
}
</script>

<template>
  <div class="max-w-6xl mx-auto px-4 md:px-6 py-6 space-y-5">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5 space-y-5">
      <div>
        <h1 class="text-2xl font-semibold text-slate-900">Configuración de correo</h1>
        <p class="mt-1 text-sm text-slate-600">
          En Gmail y Outlook el usuario SMTP debe ser el correo completo de la cuenta, no el nombre visible.
        </p>
      </div>

      <div v-if="loading" class="py-10 text-center text-slate-500">Cargando...</div>

      <form v-else class="grid gap-4 md:grid-cols-2" @submit.prevent="saveSettings">
        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Proveedor</span>
          <select v-model="form.mail_provider" class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
            <option value="gmail">Gmail</option>
            <option value="outlook">Outlook</option>
            <option value="hosting">Hosting</option>
            <option value="custom">Personalizado</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Servidor SMTP</span>
          <input v-model="form.mail_host" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Puerto</span>
          <input v-model.number="form.mail_port" type="number" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Cifrado</span>
          <select v-model="form.mail_encryption" class="h-11 w-full rounded-lg border border-slate-300 bg-white px-3">
            <option value="tls">TLS</option>
            <option value="ssl">SSL</option>
            <option value="none">Sin cifrado</option>
          </select>
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Usuario</span>
          <input v-model="form.mail_username" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
          <span v-if="['gmail', 'outlook'].includes(form.mail_provider)" class="block text-xs text-slate-500">
            Ejemplo: usuario@dominio.com. En Microsoft 365 el buzón debe tener SMTP AUTH habilitado.
          </span>
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Clave</span>
          <input v-model="form.mail_password" type="password" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Correo remitente</span>
          <input v-model="form.mail_from_address" type="email" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <label class="space-y-1">
          <span class="text-sm font-semibold text-slate-700">Nombre remitente</span>
          <input v-model="form.mail_from_name" class="h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <div class="md:col-span-2 flex justify-end">
          <button class="h-11 rounded-lg bg-indigo-700 px-5 text-sm font-semibold text-white hover:bg-indigo-800 disabled:opacity-60" :disabled="saving">
            {{ saving ? 'Guardando...' : 'Guardar configuración' }}
          </button>
        </div>
      </form>
    </section>

    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-5">
      <div class="flex items-center justify-between gap-3 mb-4">
        <h2 class="text-lg font-semibold text-slate-900">Historial de envíos</h2>
        <button class="h-9 rounded-lg border border-slate-300 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50" @click="fetchSettings">
          Actualizar
        </button>
      </div>

      <div v-if="logs.length === 0" class="py-8 text-center text-slate-500">
        No hay envíos registrados.
      </div>

      <div v-else class="overflow-x-auto">
        <table class="min-w-full text-sm">
          <thead class="bg-[#172a83] text-white">
            <tr>
              <th class="px-3 py-3 text-left">Fecha y hora</th>
              <th class="px-3 py-3 text-left">Cotización</th>
              <th class="px-3 py-3 text-left">Destinatario</th>
              <th class="px-3 py-3 text-left">Usuario</th>
              <th class="px-3 py-3 text-left">Estado</th>
              <th class="px-3 py-3 text-left">Error</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="log in logs" :key="log.id" class="border-b border-slate-200 hover:bg-slate-50">
              <td class="px-3 py-3 whitespace-nowrap">{{ formatDateTime(log.created_at) }}</td>
              <td class="px-3 py-3 font-semibold text-slate-900">{{ log.cotizacion?.codigo || log.cotizacion_id }}</td>
              <td class="px-3 py-3">{{ log.email }}</td>
              <td class="px-3 py-3">{{ log.usuario?.name || 'Sistema' }}</td>
              <td class="px-3 py-3">
                <span
                  class="inline-flex rounded-full px-2.5 py-1 text-xs font-bold uppercase"
                  :class="log.status === 'sent' ? 'bg-emerald-100 text-emerald-700' : log.status === 'pending' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'"
                >
                  {{ log.status === 'sent' ? 'Enviado' : log.status === 'pending' ? 'Pendiente' : 'Error' }}
                </span>
              </td>
              <td class="px-3 py-3 max-w-md text-rose-700">{{ log.error_message || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  </div>
</template>
