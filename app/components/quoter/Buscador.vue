<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
    reset: Boolean,
    columnFilters: {
        type: Object,
        default: () => ({}),
    },
})

const emit = defineEmits(['resultados', 'loading', 'pagination'])
const route = useRoute()
const router = useRouter()

const buildRequestKey = (prefix) => `${prefix}-${Date.now()}`

const filtros = ref({
    codigo: '',
    documento: '',
    tipo_gestion: '',
    vigencia_estado: '',
    fecha_inicio: '',
    fecha_fin: '',
    medico_id: '',
    entidad_id: '',
    asesor_id: '',
    estado_ids: [],
    estado_gestion_id: ''
})

const registros = ref([])
const medicos = ref([])
const entidades = ref([])
const asesores = ref([])
const estados = ref([])

const estadosFiltrados = computed(() => {
    return (estados.value || [])
        .filter(estado => {
            const nombre = String(estado?.nombre || '').toUpperCase().trim()
            return nombre !== 'ANULADA'
        })
        .map(estado => {
            const nombre = String(estado?.nombre || '').toUpperCase().trim()
            if (nombre === 'RECHAZADA') {
                return { ...estado, nombre: 'RECHAZADA' }
            }
            return estado
        })
})

const buscadorMedico = ref('')
const buscadorEntidad = ref('')
const buscadorAsesor = ref('')

const mostrarDropdownMedicos = ref(false)
const mostrarDropdownEntidades = ref(false)
const mostrarDropdownAsesores = ref(false)
const mostrarDropdownEstados = ref(false)

const loading = ref(false)
const pagination = ref({
    current_page: 1,
    last_page: 1,
    per_page: 10,
    total: 0,
})

const normalizar = (texto) =>
    String(texto || '')
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .toLowerCase()
        .trim()

// Filtrar médicos mientras el usuario escribe
const medicosFiltrados = computed(() => {
    if (!buscadorMedico.value.trim()) {
        return medicos.value
    }
    return medicos.value.filter(medico => {
        const nombre = normalizar(medico.nombre)
        return nombre.includes(normalizar(buscadorMedico.value))
    })
})

// Filtrar entidades mientras el usuario escribe
const entidadesFiltradas = computed(() => {
    if (!buscadorEntidad.value.trim()) {
        return entidades.value
    }
    return entidades.value.filter(entidad => {
        const nombre = normalizar(entidad.nombre)
        return nombre.includes(normalizar(buscadorEntidad.value))
    })
})

// Filtrar asesores mientras el usuario escribe
const asesoresFiltrados = computed(() => {
    if (!buscadorAsesor.value.trim()) {
        return asesores.value
    }
    return asesores.value.filter(asesor => {
        const nombre = normalizar(asesor.nombre || asesor.name)
        return nombre.includes(normalizar(buscadorAsesor.value))
    })
})

// Cargar catálogos al montar el componente
const cargarCatalogos = async () => {
    try {
        const { data, error } = await useSanctumFetch('/api/catalogos', {
            method: 'GET',
        }, undefined, buildRequestKey('seguimiento-catalogos'))

        if (error.value || !data.value) {
            console.error('Error cargando catálogos:', error.value)
            return
        }

        const res = data.value
        medicos.value = res.medicos || []
        entidades.value = res.entidades || []
        asesores.value = res.asesores || [] // Cuando lo traiga del backend
        estados.value = res.estados || []
    } catch (error) {
        console.error('Error cargando catálogos:', error)
    }
}

const applyRouteFilters = () => {
    const query = route.query
    const maybeString = (value) => typeof value === 'string' ? value : ''

    filtros.value.codigo = maybeString(query.codigo)
    filtros.value.documento = maybeString(query.documento)
    filtros.value.tipo_gestion = maybeString(query.tipo_gestion)
    filtros.value.vigencia_estado = maybeString(query.vigencia_estado)
    filtros.value.fecha_inicio = maybeString(query.fecha_inicio)
    filtros.value.fecha_fin = maybeString(query.fecha_fin)
    filtros.value.medico_id = maybeString(query.medico_id)
    filtros.value.entidad_id = maybeString(query.entidad_id)
    filtros.value.asesor_id = maybeString(query.asesor_id)
    const estadoIdsQuery = maybeString(query.estado_ids)
    filtros.value.estado_ids = estadoIdsQuery
        ? estadoIdsQuery.split(',').map(item => item.trim()).filter(Boolean).map(item => item === '4' ? '6' : item).filter((item, index, array) => array.indexOf(item) === index)
        : (maybeString(query.estado_id) ? [maybeString(query.estado_id) === '4' ? '6' : maybeString(query.estado_id)] : [])
    filtros.value.estado_gestion_id = maybeString(query.estado_gestion_id)

    const medicoSeleccionado = medicos.value.find(item => String(item.id) === filtros.value.medico_id)
    buscadorMedico.value = medicoSeleccionado?.nombre || ''

    const entidadSeleccionada = entidades.value.find(item => String(item.id) === filtros.value.entidad_id)
    buscadorEntidad.value = entidadSeleccionada?.nombre || ''

    const asesorSeleccionado = asesores.value.find(item => String(item.id) === filtros.value.asesor_id)
    buscadorAsesor.value = asesorSeleccionado?.nombre || asesorSeleccionado?.name || ''
}

const hasRouteFilters = () => {
    return [
        'codigo',
        'documento',
        'tipo_gestion',
        'vigencia_estado',
        'fecha_inicio',
        'fecha_fin',
        'medico_id',
        'entidad_id',
        'asesor_id',
        'estado_id',
        'estado_ids',
        'estado_gestion_id',
    ].some(key => Boolean(route.query[key]))
}

const estadoIdsSeleccionadosParam = () => {
    const ids = new Set()
    filtros.value.estado_ids.forEach((id) => {
        const valor = String(id)
        if (valor === '6') {
            ids.add('4')
            ids.add('6')
            return
        }
        if (valor) ids.add(valor)
    })
    return Array.from(ids).join(',')
}

const columnFiltersParam = () => {
    const activos = Object.entries(props.columnFilters || {}).reduce((acc, [key, value]) => {
        const texto = String(value ?? '').trim()
        if (texto) acc[key] = texto
        return acc
    }, {})

    return Object.keys(activos).length ? JSON.stringify(activos) : undefined
}

const seleccionarMedico = (medico) => {
    console.log('Médico seleccionado:', medico.id, medico)
    filtros.value.medico_id = medico.id
    buscadorMedico.value = medico.nombre
    mostrarDropdownMedicos.value = false
}

const limpiarMedico = () => {
    filtros.value.medico_id = ''
    buscadorMedico.value = ''
    mostrarDropdownMedicos.value = false
}

const seleccionarEntidad = (entidad) => {
    console.log('Entidad seleccionada:', entidad.id, entidad)
    filtros.value.entidad_id = entidad.id
    buscadorEntidad.value = entidad.nombre
    mostrarDropdownEntidades.value = false
}

const limpiarEntidad = () => {
    filtros.value.entidad_id = ''
    buscadorEntidad.value = ''
    mostrarDropdownEntidades.value = false
}

const seleccionarAsesor = (asesor) => {
    console.log('Asesor seleccionado:', asesor.id, asesor)
    filtros.value.asesor_id = asesor.id
    buscadorAsesor.value = asesor.nombre || asesor.name
    mostrarDropdownAsesores.value = false
}

const limpiarAsesor = async () => {
    filtros.value.asesor_id = ''
    buscadorAsesor.value = ''
    mostrarDropdownAsesores.value = false

    if (route.query.asesor_id) {
        const nextQuery = { ...route.query }
        delete nextQuery.asesor_id
        await router.replace({ query: nextQuery })
    }

    await buscar()
}

const seleccionarPrimeraCoincidencia = (tipo) => {
    if (tipo === 'medico' && medicosFiltrados.value.length === 1) {
        seleccionarMedico(medicosFiltrados.value[0])
        return
    }

    if (tipo === 'entidad' && entidadesFiltradas.value.length === 1) {
        seleccionarEntidad(entidadesFiltradas.value[0])
        return
    }

    if (tipo === 'asesor' && asesoresFiltrados.value.length === 1) {
        seleccionarAsesor(asesoresFiltrados.value[0])
    }
}

const cerrarDropdowns = () => {
    mostrarDropdownMedicos.value = false
    mostrarDropdownEntidades.value = false
    mostrarDropdownAsesores.value = false
    mostrarDropdownEstados.value = false
}

const alternarEstado = (estadoId) => {
    const id = String(estadoId)
    const actuales = new Set((filtros.value.estado_ids || []).map(item => String(item)))

    if (actuales.has(id)) {
        actuales.delete(id)
    } else {
        actuales.add(id)
    }

    filtros.value.estado_ids = Array.from(actuales)
}

const limpiarEstados = () => {
    filtros.value.estado_ids = []
}

const estadoSeleccionado = (estadoId) => {
    return (filtros.value.estado_ids || []).map(item => String(item)).includes(String(estadoId))
}

const handleClickOutsideDropdowns = (event) => {
    const target = event.target
    if (!(target instanceof Element)) return

    if (!target.closest('[data-dropdown="medico"]')) {
        mostrarDropdownMedicos.value = false
    }

    if (!target.closest('[data-dropdown="entidad"]')) {
        mostrarDropdownEntidades.value = false
    }

    if (!target.closest('[data-dropdown="asesor"]')) {
        mostrarDropdownAsesores.value = false
    }

    if (!target.closest('[data-dropdown="estado-cotizacion"]')) {
        mostrarDropdownEstados.value = false
    }
}

const buscar = async (page = 1) => {
    loading.value = true
    emit('loading', true)
    try {
        const { data, error } = await useSanctumFetch('/api/cotizaciones', {
            method: 'GET',
            params: {
                codigo: filtros.value.codigo,
                documento: filtros.value.documento,
                fecha_inicio: filtros.value.fecha_inicio,
                fecha_fin: filtros.value.fecha_fin,
                tipo_gestion: filtros.value.tipo_gestion,
                vigencia_estado: filtros.value.vigencia_estado,
                medico_id: filtros.value.medico_id,
                entidad_id: filtros.value.entidad_id,
                asesor_id: filtros.value.asesor_id,
                estado_ids: estadoIdsSeleccionadosParam() || undefined,
                estado_gestion_id: filtros.value.estado_gestion_id,
                column_filters: columnFiltersParam(),
                page,
                per_page: pagination.value.per_page,
                _t: Date.now() // evita cache agregando timestamp
            },
        }, undefined, buildRequestKey('seguimiento-busqueda'))

        if (error.value || !data.value) {
            console.error('Error buscando cotizaciones:', error.value)
            emit('resultados', [])
            return
        }

        registros.value = data.value.data || []
        pagination.value = {
            current_page: data.value.current_page || 1,
            last_page: data.value.last_page || 1,
            per_page: data.value.per_page || 10,
            total: data.value.total || registros.value.length,
        }
        emit('resultados', registros.value)
        emit('pagination', pagination.value)

    } catch (error) {
        console.error('Error buscando cotizaciones:', error)
        emit('resultados', [])
    } finally {
        loading.value = false
        emit('loading', false)
    }
}

defineExpose({
    buscar,
})

const estadosSeleccionados = computed(() => {
    const seleccionados = new Set((filtros.value.estado_ids || []).map(id => String(id)))
    return estadosFiltrados.value.filter(estado => seleccionados.has(String(estado.id)))
})

const etiquetaEstadosSeleccionados = computed(() => {
    if (!estadosSeleccionados.value.length) return 'Estado de cotización'
    if (estadosSeleccionados.value.length === 1) return estadosSeleccionados.value[0]?.nombre || '1 estado seleccionado'
    return `${estadosSeleccionados.value.length} estados seleccionados`
})

const buscarPendientesSinGestion = async () => {
    filtros.value.codigo = ''
    filtros.value.documento = ''
    filtros.value.tipo_gestion = ''
    filtros.value.vigencia_estado = ''
    filtros.value.fecha_inicio = ''
    filtros.value.fecha_fin = ''
    filtros.value.medico_id = ''
    filtros.value.entidad_id = ''
    filtros.value.asesor_id = ''
    filtros.value.estado_ids = ['1']
    filtros.value.estado_gestion_id = 'sin_gestion'
    buscadorMedico.value = ''
    buscadorEntidad.value = ''
    buscadorAsesor.value = ''
    cerrarDropdowns()
    await buscar(1)
}

onMounted(() => {
    cargarCatalogos().then(async () => {
        applyRouteFilters()
        if (hasRouteFilters()) {
            await buscar()
        }
    })
    document.addEventListener('click', handleClickOutsideDropdowns)
})

onBeforeUnmount(() => {
    document.removeEventListener('click', handleClickOutsideDropdowns)
})

watch(() => props.reset, () => {
    filtros.value.codigo = ''
    filtros.value.documento = ''
    filtros.value.tipo_gestion = ''
    filtros.value.vigencia_estado = ''
    filtros.value.fecha_inicio = ''
    filtros.value.fecha_fin = ''
    filtros.value.medico_id = ''
    filtros.value.entidad_id = ''
    filtros.value.asesor_id = ''
    filtros.value.estado_ids = []
    filtros.value.estado_gestion_id = ''
    buscadorMedico.value = ''
    buscadorEntidad.value = ''
    buscadorAsesor.value = ''
    registros.value = []
    pagination.value = {
        current_page: 1,
        last_page: 1,
        per_page: 10,
        total: 0,
    }
    emit('pagination', pagination.value)
    cerrarDropdowns()
})

watch(buscadorAsesor, (valor) => {
    if (!String(valor || '').trim()) {
        filtros.value.asesor_id = ''
    }
})

watch(() => route.query, async () => {
    applyRouteFilters()
    if (hasRouteFilters()) {
        await buscar()
    }
}, { deep: true })
</script>

<template>
    <div class="space-y-4">
        <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-3">
        <input v-model="filtros.codigo" placeholder="Código" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        <input v-model="filtros.documento" placeholder="Documento" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white" />
        <select v-model="filtros.tipo_gestion" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700">
            <option value="" selected disabled>Tipo de gestión</option>
            <option value="cotización">Cotización</option>
            <option value="información">Información</option>
            <option value="codificación">Codificación</option>
        </select>

        <select v-model="filtros.vigencia_estado" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700">
            <option value="">Vigencia (todas)</option>
            <option value="vigente">Vigente</option>
            <option value="por_vencer">Por vencer (0-7 días)</option>
            <option value="vencida">Vencida</option>
        </select>
        
        <!-- Select buscable para médicos -->
        <div class="relative w-full" data-dropdown="medico">
            <div class="relative">
                <input v-model="buscadorMedico" placeholder="Médico" class="w-full h-11 border border-slate-300 rounded-lg px-3 pr-8 bg-white"
                    @focus="mostrarDropdownMedicos = true" @keydown.enter.prevent="seleccionarPrimeraCoincidencia('medico')" @keydown.esc="mostrarDropdownMedicos = false" />
                <button v-if="filtros.medico_id" @click="limpiarMedico"
                    class="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownMedicos && medicosFiltrados.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto z-20 shadow-sm"
                @mousedown.prevent>
                <div v-for="medico in medicosFiltrados" :key="medico.id" @mousedown.prevent="seleccionarMedico(medico)"
                    class="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700">
                    {{ medico.nombre }}
                </div>
            </div>
        </div>

        <!-- Select buscable para entidades -->
        <div class="relative w-full" data-dropdown="entidad">
            <div class="relative">
                <input v-model="buscadorEntidad" placeholder="Entidad" class="w-full h-11 border border-slate-300 rounded-lg px-3 pr-8 bg-white"
                    @focus="mostrarDropdownEntidades = true" @keydown.enter.prevent="seleccionarPrimeraCoincidencia('entidad')" @keydown.esc="mostrarDropdownEntidades = false" />
                <button v-if="filtros.entidad_id" @click="limpiarEntidad"
                    class="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownEntidades && entidadesFiltradas.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto z-20 shadow-sm"
                @mousedown.prevent>
                <div v-for="entidad in entidadesFiltradas" :key="entidad.id" @mousedown.prevent="seleccionarEntidad(entidad)"
                    class="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700">
                    {{ entidad.nombre }}
                </div>
            </div>
        </div>

        <!-- Select buscable para asesores -->
        <div class="relative w-full" data-dropdown="asesor">
            <div class="relative">
                <input v-model="buscadorAsesor" placeholder="Asesor" class="w-full h-11 border border-slate-300 rounded-lg px-3 pr-8 bg-white"
                    @focus="mostrarDropdownAsesores = true" @keydown.enter.prevent="seleccionarPrimeraCoincidencia('asesor')" @keydown.esc="mostrarDropdownAsesores = false" />
                <button v-if="filtros.asesor_id" @click="limpiarAsesor"
                    class="absolute right-2 top-2.5 text-slate-400 hover:text-slate-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownAsesores && asesoresFiltrados.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-slate-200 rounded-lg mt-1 max-h-48 overflow-y-auto z-20 shadow-sm"
                @mousedown.prevent>
                <div v-for="asesor in asesoresFiltrados" :key="asesor.id" @mousedown.prevent="seleccionarAsesor(asesor)"
                    class="px-3 py-2 hover:bg-slate-100 cursor-pointer text-sm text-slate-700">
                    {{ asesor.nombre || asesor.name }}
                </div>
            </div>
        </div>

        <input type="date" v-model="filtros.fecha_inicio" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700" />
        <input type="date" v-model="filtros.fecha_fin" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700" />
        <div class="relative w-full" data-dropdown="estado-cotizacion">
            <button
                type="button"
                class="flex min-h-11 w-full items-center justify-between gap-2 rounded-lg border border-slate-300 bg-white px-3 py-2 text-left text-slate-700 transition hover:border-indigo-300 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-100"
                :class="mostrarDropdownEstados ? 'border-indigo-500 ring-2 ring-indigo-100' : ''"
                @click="mostrarDropdownEstados = !mostrarDropdownEstados"
            >
                <span class="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                    <span v-if="!estadosSeleccionados.length" class="text-slate-500">Estado de cotización</span>
                    <template v-else>
                        <span
                            v-for="estado in estadosSeleccionados.slice(0, 2)"
                            :key="estado.id"
                            class="max-w-[9rem] truncate rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-100"
                        >
                            {{ estado.nombre }}
                        </span>
                        <span v-if="estadosSeleccionados.length > 2" class="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                            +{{ estadosSeleccionados.length - 2 }}
                        </span>
                    </template>
                </span>
                <span class="flex items-center gap-2">
                    <span v-if="estadosSeleccionados.length" class="rounded-full bg-indigo-600 px-2 py-0.5 text-xs font-bold text-white">
                        {{ estadosSeleccionados.length }}
                    </span>
                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4 text-slate-400 transition" :class="mostrarDropdownEstados ? 'rotate-180' : ''" viewBox="0 0 20 20" fill="currentColor">
                        <path fill-rule="evenodd" d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06" clip-rule="evenodd" />
                    </svg>
                </span>
            </button>

            <div
                v-if="mostrarDropdownEstados"
                class="absolute left-0 right-0 z-30 mt-2 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl"
                @mousedown.prevent
            >
                <div class="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-3 py-2">
                    <p class="text-xs font-bold uppercase tracking-wide text-slate-600">Estado de cotización</p>
                    <button
                        v-if="estadosSeleccionados.length"
                        type="button"
                        class="text-xs font-semibold text-indigo-700 hover:text-indigo-900"
                        @mousedown.prevent="limpiarEstados"
                    >
                        Limpiar
                    </button>
                </div>

                <div class="max-h-64 overflow-y-auto py-1">
                    <button
                        v-for="estado in estadosFiltrados"
                        :key="estado.id"
                        type="button"
                        class="flex w-full items-center gap-3 px-3 py-2 text-left text-sm text-slate-700 transition hover:bg-indigo-50"
                        :class="estadoSeleccionado(estado.id) ? 'bg-indigo-50 text-indigo-800' : ''"
                        @mousedown.prevent="alternarEstado(estado.id)"
                    >
                        <span
                            class="flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition"
                            :class="estadoSeleccionado(estado.id) ? 'border-indigo-600 bg-indigo-600 text-white' : 'border-slate-300 bg-white text-transparent'"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fill-rule="evenodd" d="M16.704 5.29a1 1 0 0 1 .006 1.414l-7.25 7.31a1 1 0 0 1-1.42 0l-3.25-3.28a1 1 0 0 1 1.42-1.408l2.54 2.563l6.54-6.593a1 1 0 0 1 1.414-.006" clip-rule="evenodd" />
                            </svg>
                        </span>
                        <span class="font-medium">{{ estado.nombre }}</span>
                    </button>
                </div>

                <div class="border-t border-slate-100 bg-slate-50 px-3 py-2 text-xs text-slate-500">
                    {{ etiquetaEstadosSeleccionados }}
                </div>
            </div>
        </div>
        </div>

        <div class="flex flex-wrap justify-end gap-2">
            <button @click="buscarPendientesSinGestion" class="inline-flex items-center justify-center h-11 px-4 rounded-lg border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-800 font-medium disabled:opacity-60 disabled:cursor-not-allowed" :disabled="loading">
                Pendientes sin gestión
            </button>
            <button @click="buscar" class="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed" :disabled="loading">
                {{ loading ? 'Buscando...' : 'Buscar' }}
            </button>
        </div>
    </div>
</template>
