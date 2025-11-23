<script setup>
import VueCal from 'vue-cal'
import 'vue-cal/dist/vuecal.css'
// Ensure you import the necessary Nuxt/Vue composables
import { computed, onMounted } from 'vue' // Add this if not implicitly available

// Assuming useCirugias is a valid composable that provides refs
const { cirugias, fetchCirugias, loading } = useCirugias();
const minEventWidth = 0;

// 👉 NEW FUNCTION: Formats a Date object to a simple 'YYYY-MM-DD HH:MM' string
// This makes VueCal interpret the time as a local time without timezone issues.
function formatForVueCal(date) {
  if (!(date instanceof Date) || isNaN(date)) return ''

  // Utility to pad single digits
  const pad = (num) => num.toString().padStart(2, '0')

  const year = date.getFullYear()
  const month = pad(date.getMonth() + 1) // Months are 0-indexed
  const day = pad(date.getDate())
  const hour = pad(date.getHours())
  const minute = pad(date.getMinutes())

  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 👉 Convertir los datos al formato que vue-cal requiere
const events = computed(() =>
  (cirugias.value || []).map(item => {
    // 1. Parse the original string into a Date object.
    // Ensure the original strings (item.start/end) are in a format 
    // new Date() can reliably parse (e.g., ISO or YYYY/MM/DD HH:MM)
    const startDate = new Date(item.start)
    const endDate = new Date(item.end)

    return {
      title: item.title || 'Procedimiento',
      start: formatForVueCal(startDate),
      end: formatForVueCal(endDate),
      content:  '',
      class: 'health',
      raw: ''
    }
  })
)

const handleEventClick = (event) => {
  const e = event?.event || event
  // Access properties safely
  const content = e?.content || e?.raw?.nombre_completo || e?.title
  alert((content + '').replace(/<[^>]+>/g, ''))
}

onMounted(async () => {
  await fetchCirugias()
})
</script>

<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Calendario de Procedimientos</h1>

    <div v-if="loading" class="text-gray-500 mb-4">Cargando información...</div>

    <ClientOnly>
      <div v-if="!loading && events.length > 0">
        <VueCal
          class="rounded shadow bg-[#f9f9f9]"
          hide-view-selector
          events-on-days-view
          :min-event-width="minEventWidth"
          default-view="month"
          time="12"
          :events="events"
          :editable="false"
          style="height: 700px"
          @event-click="handleEventClick"
        />
      </div>
      <div v-else-if="!loading" class="text-gray-500">No hay procedimientos programados.</div>
    </ClientOnly>
  </div>
</template>
<style>
.vuecal__event {color: #fff;border: 1px solid;}
.vuecal__event.leisure {background-color: #fd9c42d9;}
.vuecal__event.health {background-color: #57cea9cc;}
.vuecal__event.sport {background-color: #ff6666d9;}
.vuecal__event.lunch {
  background-color: repeating-linear-gradient(45deg, transparent 0 10px, #00000011 10px 20px);
  border: none;
}
</style>
