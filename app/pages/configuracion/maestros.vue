<template>
  <div class="space-y-6">
    <div class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
      <h1 class="text-2xl font-bold">Maestros</h1>
      <p class="mt-2 text-sm text-slate-600">Administra las pólizas disponibles para las cotizaciones.</p>
    </div>

    <div class="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
      <section class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div class="flex items-center justify-between gap-4 mb-4">
          <div>
            <h2 class="text-xl font-semibold">Pólizas existentes</h2>
            <p class="text-sm text-slate-500">Listado rápido de pólizas registradas.</p>
          </div>
          <button class="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700" @click="resetForm">
            Nueva póliza
          </button>
        </div>

        <div v-if="loading" class="py-8 text-center text-sm text-slate-500">Cargando...</div>

        <div v-else>
          <table class="min-w-full divide-y divide-slate-200 text-sm">
            <thead class="bg-slate-50 text-slate-600">
              <tr>
                <th class="px-4 py-3 text-left">Nombre</th>
                <th class="px-4 py-3 text-left">Valor asegurado</th>
                <th class="px-4 py-3 text-left">Valor de la póliza</th>
                <th class="px-4 py-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-200">
              <tr v-for="poliza in polizas" :key="poliza.id">
                <td class="px-4 py-3">{{ poliza.nombre }}</td>
                <td class="px-4 py-3">{{ formatCurrency(poliza.valor_asegurado) }}</td>
                <td class="px-4 py-3">{{ formatCurrency(poliza.valor_poliza) }}</td>
                <td class="px-4 py-3 text-right">
                  <button class="mr-2 rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700 hover:bg-slate-300" @click="editPoliza(poliza)">Editar</button>
                  <button class="rounded-lg bg-red-600 px-3 py-2 text-sm text-white hover:bg-red-700" @click="deletePoliza(poliza)">Eliminar</button>
                </td>
              </tr>
              <tr v-if="!polizas.length">
                <td colspan="4" class="px-4 py-8 text-center text-slate-500">No hay pólizas registradas.</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      <section class="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <h2 class="text-xl font-semibold">{{ form.id ? 'Editar póliza' : 'Crear póliza' }}</h2>
        <p class="mt-2 text-sm text-slate-500">Guardar la información de la póliza para poder seleccionarla en la cotización.</p>

        <div class="mt-6 space-y-4">
          <label class="block">
            <span class="text-sm font-medium text-slate-700">Nombre</span>
            <input v-model="form.nombre" type="text" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="Nombre de la póliza">
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Valor asegurado</span>
            <input v-model.number="form.valor_asegurado" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="0">
          </label>

          <label class="block">
            <span class="text-sm font-medium text-slate-700">Valor de la póliza</span>
            <input v-model.number="form.valor_poliza" type="number" min="0" step="0.01" class="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" placeholder="0">
          </label>

          <div class="flex items-center gap-3 pt-4">
            <button :disabled="submitting" class="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700" @click="savePoliza">
              {{ form.id ? 'Actualizar' : 'Guardar' }}
            </button>
            <button v-if="form.id" class="rounded-lg bg-slate-200 px-4 py-2 text-sm text-slate-700 hover:bg-slate-300" @click="resetForm">Cancelar</button>
          </div>

          <p v-if="message" class="text-sm text-emerald-700">{{ message }}</p>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue'

const loading = ref(false)
const submitting = ref(false)
const polizas = ref([])
const form = reactive({ id: null, nombre: '', valor_asegurado: 0, valor_poliza: 0 })
const message = ref('')

const fetchPolizas = async () => {
  loading.value = true
  message.value = ''

  try {
    const { data, error } = await useSanctumFetch('/api/configuracion/maestros/polizas')
    if (error.value) {
      console.error(error.value)
      return
    }

    polizas.value = data.value || []
  } catch (err) {
    console.error(err)
  } finally {
    loading.value = false
  }
}

const resetForm = () => {
  form.id = null
  form.nombre = ''
  form.valor_asegurado = 0
  form.valor_poliza = 0
  message.value = ''
}

const editPoliza = (poliza) => {
  form.id = poliza.id
  form.nombre = poliza.nombre
  form.valor_asegurado = Number(poliza.valor_asegurado || 0)
  form.valor_poliza = Number(poliza.valor_poliza || 0)
  message.value = ''
}

const formatCurrency = (valor) => {
  const numero = Number(valor) || 0
  return numero.toLocaleString('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 })
}

const savePoliza = async () => {
  if (!form.nombre.trim()) {
    message.value = 'El nombre de la póliza es obligatorio.'
    return
  }

  submitting.value = true
  message.value = ''

  try {
    const wasEditing = Boolean(form.id)
    const url = wasEditing ? `/api/configuracion/maestros/polizas/${form.id}` : '/api/configuracion/maestros/polizas'
    const method = wasEditing ? 'PUT' : 'POST'
    const { error } = await useSanctumFetch(url, {
      method,
      body: {
        nombre: form.nombre,
        valor_asegurado: form.valor_asegurado,
        valor_poliza: form.valor_poliza,
      },
    })

    if (error.value) {
      console.error(error.value)
      message.value = 'No se pudo guardar la póliza.'
      return
    }

    await fetchPolizas()
    resetForm()
    message.value = wasEditing ? 'Póliza actualizada.' : 'Póliza creada.'
  } catch (err) {
    console.error(err)
    message.value = 'No se pudo guardar la póliza.'
  } finally {
    submitting.value = false
  }
}

const deletePoliza = async (poliza) => {
  if (!confirm(`¿Eliminar la póliza "${poliza.nombre}"?`)) return

  submitting.value = true
  message.value = ''

  try {
    const { error } = await useSanctumFetch(`/api/configuracion/maestros/polizas/${poliza.id}`, {
      method: 'DELETE',
    })

    if (error.value) {
      console.error(error.value)
      message.value = 'No se pudo eliminar la póliza.'
      return
    }

    await fetchPolizas()
    if (form.id === poliza.id) {
      resetForm()
    }
    message.value = 'Póliza eliminada.'
  } catch (err) {
    console.error(err)
    message.value = 'No se pudo eliminar la póliza.'
  } finally {
    submitting.value = false
  }
}

onMounted(fetchPolizas)
</script>
