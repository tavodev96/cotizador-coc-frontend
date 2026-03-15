<script setup>
import { Notivue, Notification, filledIcons } from 'notivue'

definePageMeta({
    middleware: ['sanctum:auth'],
})

const config = useRuntimeConfig()
const router = useRouter()
const entidad = ref('')
const medico = ref('')
const medicos = ref([])
const searchMedico = ref('')
const showSuggestions = ref(false)
const search = ref('')
const fechaInicio = ref('')
const fechaFin = ref('')
const data = ref([])
const page = ref(1)
const perPage = 10
const loading = ref(false)

const groupedData = computed(() => {
    const grupos = new Map()

    for (const row of data.value || []) {
        const key = String(row?.documento || '').trim()
        if (!key) continue

        if (!grupos.has(key)) {
            grupos.set(key, {
                id: key,
                documento: row.documento,
                entidad_cod: row.entidad_cod,
                entidad_nom: row.entidad_nom,
                fecha: row.fecha,
                consultorio: row.consultorio,
                medico: row.medico,
                id_medico: row.id_medico,
                ids_ordenamiento: [],
                procedimientos: [],
                codigos: [],
            })
        }

        const group = grupos.get(key)
        if (row?.id_ordenamiento && !group.ids_ordenamiento.includes(String(row.id_ordenamiento))) {
            group.ids_ordenamiento.push(String(row.id_ordenamiento))
        }
        if (row?.procedimiento && !group.procedimientos.includes(row.procedimiento)) {
            group.procedimientos.push(row.procedimiento)
        }
        if (row?.CUP && !group.codigos.includes(String(row.CUP))) {
            group.codigos.push(String(row.CUP))
        }
    }

    return Array.from(grupos.values())
})

const totalRegistros = computed(() => groupedData.value.length)
const totalPages = computed(() => Math.ceil(groupedData.value.length / perPage))

const paginatedData = computed(() =>
    groupedData.value.slice((page.value - 1) * perPage, page.value * perPage)
)

const fetchData = async () => {
    if (!fechaInicio.value || !fechaFin.value) {
        pushNotification('error', 'Por favor, seleccione las fechas de inicio y fin.', 'Error')
        return
    }
    loading.value = true
    try {
        const response = await $fetch(`${config.public.apiBase}/ordenamientos`, {
            method: 'GET',
            credentials: 'include',
            params: {
                entidad: entidad.value,
                fecha_inicio: fechaInicio.value,
                fecha_fin: fechaFin.value,
                identificacion: search.value,
                medico: medico.value
            }
        })
        data.value = Array.isArray(response.items) ? response.items : (response || [])
        page.value = 1
    } catch (error) {
        console.error('Error cargando datos:', error)
    } finally {
        loading.value = false
    }
}

const generarCotizacion = (item) => {
    const codigos = (item.codigos || []).filter(Boolean)
    const procedimientos = (item.procedimientos || []).filter(Boolean)

    router.push({
        name: 'gestion-cotizacion',
        query: {
            tipo_identificacion: 'CC',
            numero_identificacion: item.documento,
            entidad_cod: item.entidad_cod,
            entidad: item.entidad_nom,
            medico: item.medico,
            medico_id: item.id_medico,
            consultorio: item.consultorio,
            procedimiento: procedimientos[0] || '',
            id_ordenamiento: (item.ids_ordenamiento || []).join(','),
            codigo: codigos[0] || '',
            codigos: codigos.join(','),
            procedimientos_formulados: procedimientos.join('||')
        }
    })
}

const nextPage = () => {
    if (page.value < totalPages.value) page.value++
}

const prevPage = () => {
    if (page.value > 1) page.value--
}

const getMedicoLabel = (m) => {
    return m?.medico || m?.nombre || m?.nom || m?.name || m?.label || ''
}

const getMedicoId = (m) => {
    return m?.identificacion ?? m?.id_medico ?? m?.id ?? m?.value ?? ''
}

const filteredMedicos = computed(() => {
    if (!searchMedico.value) return medicos.value
    return medicos.value.filter(m => getMedicoLabel(m).toLowerCase().includes(searchMedico.value.toLowerCase()))
})

const selectMedico = (m) => {
    medico.value = getMedicoId(m)
    searchMedico.value = getMedicoLabel(m)
    showSuggestions.value = false
}

const seleccionarPrimerMedico = () => {
    if (filteredMedicos.value.length === 1) {
        selectMedico(filteredMedicos.value[0])
    }
}

const handleClickOutsideMedicos = (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    if (!target.closest('[data-dropdown="medico"]')) {
        showSuggestions.value = false
    }
}

const clearFilters = () => {
    entidad.value = ''
    search.value = ''
    medico.value = ''
    searchMedico.value = ''
    fechaInicio.value = ''
    fechaFin.value = ''
}

onMounted(async () => {
    try {
        const { data, status } = await useAsyncData(
            'catalogos', () => useSanctumFetch('/api/catalogos')
        )
        if (status.value === 'success') {
            medicos.value = data.value.data.value.medicos
        }
    } catch (e) {
        console.error('Error cargando catalogos:', e)
    }

    document.addEventListener('click', handleClickOutsideMedicos)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutsideMedicos)
})

const pushNotification = (type, message, title) => {
    push[type]({
        title,
        message,
        ariaRole: 'alert'
    })
}
</script>

<template>
    <div class="max-w-7xl mx-auto px-4 md:px-6 py-6 space-y-5">
        <Notivue v-slot="item">
            <Notification :item="item" :icons="filledIcons" />
        </Notivue>

        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5 space-y-4">
            <h1 class="text-xl md:text-2xl font-semibold text-slate-900">Ordenamientos</h1>

            <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
                <input type="text" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" placeholder="NIT Entidad" v-model="entidad" />
                <input v-model="search" placeholder="N° de identificación" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />

                <div class="w-full relative" data-dropdown="medico">
                    <input
                        type="text"
                        class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white"
                        placeholder="Médico"
                        v-model="searchMedico"
                        @input="showSuggestions = true"
                        @focus="showSuggestions = true"
                        @keydown.enter.prevent="seleccionarPrimerMedico"
                        @keydown.esc="showSuggestions = false"
                    />
                    <ul v-show="showSuggestions && filteredMedicos.length" class="absolute z-20 bg-white border border-slate-200 w-full max-h-48 overflow-auto mt-1 rounded-lg shadow-sm">
                        <li v-for="m in filteredMedicos" :key="getMedicoId(m)" @mousedown.prevent="selectMedico(m)" class="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700">
                            {{ getMedicoLabel(m) }}
                        </li>
                    </ul>
                </div>

                <input type="date" v-model="fechaInicio" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700" />
                <input type="date" v-model="fechaFin" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700" />

                <div class="flex items-center gap-2">
                    <button @click="fetchData" class="h-11 px-5 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium">Buscar</button>
                    <button @click="clearFilters" class="h-11 px-5 rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium">Limpiar</button>
                </div>
            </div>
        </section>

        <section class="bg-white border border-slate-200 rounded-2xl shadow-sm p-4 md:p-5">
            <div class="flex items-center justify-between mb-4">
                <p class="text-sm text-slate-600">{{ totalRegistros }} registro{{ totalRegistros === 1 ? '' : 's' }}</p>
                <p class="text-sm text-slate-500">Página {{ page }} de {{ totalPages || 1 }}</p>
            </div>

            <div v-if="loading" class="text-slate-500">Cargando...</div>

            <div v-else-if="!paginatedData.length" class="py-10 text-center text-slate-500">
                No hay ordenamientos para mostrar con los filtros actuales.
            </div>

            <div v-else class="overflow-x-auto">
                <table class="min-w-full border border-slate-200 rounded-lg overflow-hidden">
                    <thead>
                        <tr class="bg-slate-50">
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Identificación</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">ID Servinte</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Entidad</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Fecha</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Procedimiento</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Consultorio</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Médico</th>
                            <th class="border border-slate-200 px-3 py-2 text-left text-xs font-semibold text-slate-600 uppercase tracking-wide">Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="item in paginatedData" :key="item.id">
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">{{ item.documento }}</td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <div class="space-y-1">
                                    <p class="font-medium">{{ item.ids_ordenamiento[0] || 'N/A' }}</p>
                                    <p v-if="item.ids_ordenamiento.length > 1" class="text-xs text-slate-500">+{{ item.ids_ordenamiento.length - 1 }} más</p>
                                </div>
                            </td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">{{ item.entidad_nom }}</td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">{{ item.fecha }}</td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">
                                <ul class="space-y-1">
                                    <li v-for="(proc, idx) in item.procedimientos" :key="`${item.id}-proc-${idx}`" class="leading-tight">
                                        {{ proc }}
                                    </li>
                                </ul>
                            </td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">{{ item.consultorio }}</td>
                            <td class="border border-slate-200 px-3 py-2 text-sm text-slate-700">{{ item.medico }}</td>
                            <td class="border border-slate-200 px-3 py-2">
                                <button
                                    @click="generarCotizacion(item)"
                                    title="Generar cotización"
                                    aria-label="Generar cotización"
                                    class="inline-flex items-center justify-center h-9 w-9 rounded-md border border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                                >
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                        <path stroke-linecap="round" stroke-linejoin="round" d="M12 5v14m-7-7h14" />
                                    </svg>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="flex justify-between items-center mt-4">
                <button @click="prevPage" :disabled="page === 1" class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">Anterior</button>
                <span class="text-sm text-slate-600">Página {{ page }} de {{ totalPages || 1 }}</span>
                <button @click="nextPage" :disabled="page === totalPages || totalPages === 0" class="h-9 px-4 rounded-lg border border-slate-300 text-slate-700 disabled:opacity-50 disabled:cursor-not-allowed">Siguiente</button>
            </div>
        </section>
    </div>
</template>
