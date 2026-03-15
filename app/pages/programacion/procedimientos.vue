<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

const {
  cirugias,
  fetchProgramacion,
  loading,
  total,
} = useProgramacion()

const ESTADO_CONFIG: Record<string, { bg: string; border: string; label: string }> = {
  C: { bg: '#64748b', border: '#475569', label: 'Canceló' },
  R: { bg: '#16a34a', border: '#15803d', label: 'Realizó' },
  P: { bg: '#d97706', border: '#b45309', label: 'Pendiente' },
  N: { bg: '#dc2626', border: '#b91c1c', label: 'Cancelado para Reprogramar' },
}
const getEstadoConfig = (estado: string) =>
  ESTADO_CONFIG[estado?.toUpperCase()] ?? { bg: '#0f766e', border: '#0b5f58', label: estado || 'Sin estado' }

const hoy = new Date().toISOString().slice(0, 10)
const fechaInicial = ref(hoy)
const fechaFinal = ref(hoy)
const medicoFiltro = ref('')
const estadoFiltro = ref('')
const selectedEvent = ref<any>(null)

const calendarEvents = computed(() =>
  (cirugias.value || []).map((item: any, idx: number) => {
    const cfg = getEstadoConfig(item.estado)
    return {
      id: String(item.raw?.id || `${item.start}-${idx}`),
      title: item.title || 'Procedimiento',
      start: item.start,
      end: item.end,
      backgroundColor: cfg.bg,
      borderColor: cfg.border,
      textColor: '#ffffff',
      extendedProps: {
        identificacion: item.content || '',
        codigoMedico: item.codigoMedico || '',
        medico: item.medico || '',
        direccion: item.direccion || '',
        telefono: item.telefono || '',
        duracion: item.duracion || '',
        estado: item.estado || '',
        estadoLabel: cfg.label,
        raw: item.raw || null,
      },
    }
  })
)

const cerrarDetalle = () => {
  selectedEvent.value = null
}

const aplicarFiltros = async () => {
  await fetchProgramacion({
    fechaInicial: fechaInicial.value,
    fechaFinal: fechaFinal.value,
    codigoMedico: medicoFiltro.value || undefined,
    estado: estadoFiltro.value || undefined,
  })
}

onMounted(async () => {
  await aplicarFiltros()
})
</script>

<template>
  <div class="space-y-5">
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
      <h1 class="text-2xl font-semibold text-slate-900 mb-2">Calendario de procedimientos</h1>
      <p class="text-sm text-slate-600">Programación diaria y semanal con lectura clara de bloques quirúrgicos.</p>

      <div class="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Fecha inicial</label>
          <input
            v-model="fechaInicial"
            type="date"
            class="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Fecha final</label>
          <input
            v-model="fechaFinal"
            type="date"
            :min="fechaInicial"
            class="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm"
          >
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Código médico</label>
          <input
            v-model="medicoFiltro"
            type="text"
            placeholder="Código del médico"
            class="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm"
            @keyup.enter="aplicarFiltros"
          >
        </div>

        <div>
          <label class="block text-xs font-medium text-slate-600 mb-1">Estado</label>
          <select
            v-model="estadoFiltro"
            class="w-full h-10 rounded-lg border border-slate-300 px-3 text-sm"
            @change="aplicarFiltros"
          >
            <option value="">Todos</option>
            <option value="P">Pendiente</option>
            <option value="R">Realizó</option>
            <option value="C">Canceló</option>
            <option value="N">Cancelado para Reprogramar</option>
          </select>
        </div>

        <div class="flex items-end">
          <button
            class="h-10 w-full px-4 rounded-lg bg-teal-700 text-white text-sm font-medium hover:bg-teal-800"
            @click="aplicarFiltros"
          >
            Buscar
          </button>
        </div>
      </div>

      <div class="mt-3 text-sm text-slate-500">
        {{ total }} registro{{ total !== 1 ? 's' : '' }} encontrado{{ total !== 1 ? 's' : '' }}
      </div>
    </section>

    <!-- Leyenda de colores -->
    <section class="bg-white border border-slate-200 rounded-2xl shadow-sm px-5 py-4">
      <p class="text-xs font-semibold uppercase tracking-wide text-slate-500 mb-3">Leyenda de estados</p>
      <div class="overflow-x-auto">
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-slate-100">
              <th class="text-left py-1.5 pr-4 font-medium text-slate-500 text-xs">Color</th>
              <th class="text-left py-1.5 pr-4 font-medium text-slate-500 text-xs">Código</th>
              <th class="text-left py-1.5 font-medium text-slate-500 text-xs">Descripción</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(cfg, key) in ESTADO_CONFIG" :key="key" class="border-b border-slate-50 last:border-0">
              <td class="py-2 pr-4">
                <span
                  class="inline-block h-4 w-10 rounded-full"
                  :style="{ backgroundColor: cfg.bg }"
                />
              </td>
              <td class="py-2 pr-4 font-mono font-bold text-slate-700">{{ key }}</td>
              <td class="py-2 text-slate-700">{{ cfg.label }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="loading" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-slate-500">
      Cargando información...
    </div>

    <ClientOnly>
      <div v-if="!loading && calendarEvents.length > 0" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-3 md:p-4">
        <ProgramacionCalendar :events="calendarEvents" @event-click="selectedEvent = $event" />
      </div>

      <div v-else-if="!loading" class="bg-white border border-slate-200 rounded-2xl shadow-sm p-6 text-slate-500">
        No hay procedimientos programados.
      </div>
    </ClientOnly>

    <Teleport to="body">
      <div v-if="selectedEvent" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4" @click.self="cerrarDetalle">
        <section class="w-full max-w-3xl rounded-3xl bg-white shadow-2xl border border-slate-200 overflow-hidden">
          <div class="flex items-start justify-between gap-4 border-b border-slate-200 px-6 py-5">
            <div>
              <p class="text-xs font-semibold uppercase tracking-[0.24em] text-teal-700">Detalle de procedimiento</p>
              <h2 class="mt-1 text-2xl font-semibold text-slate-900">{{ selectedEvent.title }}</h2>
              <div class="mt-2 flex flex-wrap items-center gap-2">
                <p class="text-sm text-slate-500">{{ selectedEvent.extendedProps.identificacion || 'Sin identificación' }}</p>
                <span
                  class="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold text-white"
                  :style="{ backgroundColor: getEstadoConfig(selectedEvent.extendedProps.estado).bg }"
                >
                  {{ selectedEvent.extendedProps.estadoLabel }}
                </span>
              </div>
            </div>
            <button class="h-10 w-10 rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50" @click="cerrarDetalle">
              ×
            </button>
          </div>

          <div class="grid grid-cols-1 md:grid-cols-2 gap-4 px-6 py-5 text-sm text-slate-700">
            <div class="rounded-2xl bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Horario</p>
              <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedEvent.start?.toLocaleString('es-CO') }}</p>
              <p class="mt-1 text-slate-600">Hasta {{ selectedEvent.end?.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }) }}</p>
              <p class="mt-1 text-slate-600">Duración: {{ selectedEvent.extendedProps.duracion || 'N/A' }} min</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Médico</p>
              <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedEvent.extendedProps.medico || 'No disponible' }}</p>
              <p v-if="selectedEvent.extendedProps.codigoMedico" class="mt-1 text-xs text-slate-500">Código: {{ selectedEvent.extendedProps.codigoMedico }}</p>
            </div>

            <div class="rounded-2xl bg-slate-50 p-4">
              <p class="text-xs font-semibold uppercase tracking-wide text-slate-500">Contacto</p>
              <p class="mt-2 text-base font-semibold text-slate-900">{{ selectedEvent.extendedProps.telefono || 'Sin teléfono' }}</p>
              <p class="mt-1 text-slate-600 break-words">{{ selectedEvent.extendedProps.direccion || 'Sin dirección' }}</p>
            </div>

            <div class="rounded-2xl p-4 border" :style="{ backgroundColor: getEstadoConfig(selectedEvent.extendedProps.estado).bg + '18', borderColor: getEstadoConfig(selectedEvent.extendedProps.estado).bg + '44' }">
              <p class="text-xs font-semibold uppercase tracking-wide" :style="{ color: getEstadoConfig(selectedEvent.extendedProps.estado).bg }">Estado</p>
              <p class="mt-2 text-xl font-bold" :style="{ color: getEstadoConfig(selectedEvent.extendedProps.estado).bg }">
                {{ selectedEvent.extendedProps.estadoLabel }}
              </p>
              <p class="mt-1 text-sm text-slate-600">Paciente: <span class="font-semibold text-slate-900">{{ selectedEvent.title }}</span></p>
            </div>
          </div>
        </section>
      </div>
    </Teleport>
  </div>
</template>
