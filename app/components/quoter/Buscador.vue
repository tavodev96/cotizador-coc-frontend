<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch } from 'vue'

const props = defineProps({
    reset: Boolean
})

const emit = defineEmits(['resultados', 'loading'])
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
    estado_id: ''
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

const loading = ref(false)

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
    filtros.value.estado_id = maybeString(query.estado_id)

    if (filtros.value.estado_id === '4') {
        filtros.value.estado_id = '6'
    }

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
    ].some(key => Boolean(route.query[key]))
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
}

const buscar = async () => {
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
                estado_id: filtros.value.estado_id,
                estado_ids: filtros.value.estado_id === '6' ? '4,6' : undefined,
                _t: Date.now() // evita cache agregando timestamp
            },
        }, undefined, buildRequestKey('seguimiento-busqueda'))

        if (error.value || !data.value) {
            console.error('Error buscando cotizaciones:', error.value)
            emit('resultados', [])
            return
        }

        registros.value = data.value.data || []
        emit('resultados', registros.value)

    } catch (error) {
        console.error('Error buscando cotizaciones:', error)
        emit('resultados', [])
    } finally {
        loading.value = false
        emit('loading', false)
    }
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
    filtros.value.estado_id = ''
    buscadorMedico.value = ''
    buscadorEntidad.value = ''
    buscadorAsesor.value = ''
    registros.value = []
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
        <select v-model="filtros.estado_id" class="w-full h-11 border border-slate-300 rounded-lg px-3 bg-white text-slate-700">
            <option value="">Estado de cotización</option>
            <option v-for="estado in estadosFiltrados" :key="estado.id" :value="String(estado.id)">
                {{ estado.nombre }}
            </option>
        </select>
        </div>

        <div class="flex justify-end">
            <button @click="buscar" class="inline-flex items-center justify-center h-11 px-6 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white font-medium disabled:opacity-60 disabled:cursor-not-allowed" :disabled="loading">
                {{ loading ? 'Buscando...' : 'Buscar' }}
            </button>
        </div>
    </div>
</template>
