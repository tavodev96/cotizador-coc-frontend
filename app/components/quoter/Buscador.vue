<script setup>
import { ref, computed, onMounted, watch } from 'vue'

const props = defineProps({
    reset: Boolean
})

const emit = defineEmits(['resultados'])

const filtros = ref({
    codigo: '',
    documento: '',
    fecha_inicio: '',
    fecha_fin: '',
    medico_id: '',
    entidad_id: '',
    asesor_id: ''
})

const registros = ref([])
const medicos = ref([])
const entidades = ref([])
const asesores = ref([])

const buscadorMedico = ref('')
const buscadorEntidad = ref('')
const buscadorAsesor = ref('')

const mostrarDropdownMedicos = ref(false)
const mostrarDropdownEntidades = ref(false)
const mostrarDropdownAsesores = ref(false)

const loading = ref(false)

// Filtrar médicos mientras el usuario escribe
const medicosFiltrados = computed(() => {
    if (!buscadorMedico.value.trim()) {
        return medicos.value
    }
    return medicos.value.filter(medico => {
        const nombre = medico.nombre?.toLowerCase() || ''
        return nombre.includes(buscadorMedico.value.toLowerCase())
    })
})

// Filtrar entidades mientras el usuario escribe
const entidadesFiltradas = computed(() => {
    if (!buscadorEntidad.value.trim()) {
        return entidades.value
    }
    return entidades.value.filter(entidad => {
        const nombre = entidad.nombre?.toLowerCase() || ''
        return nombre.includes(buscadorEntidad.value.toLowerCase())
    })
})

// Filtrar asesores mientras el usuario escribe
const asesoresFiltrados = computed(() => {
    if (!buscadorAsesor.value.trim()) {
        return asesores.value
    }
    return asesores.value.filter(asesor => {
        const nombre = asesor.nombre?.toLowerCase() || ''
        return nombre.includes(buscadorAsesor.value.toLowerCase())
    })
})

// Cargar catálogos al montar el componente
const cargarCatalogos = async () => {
    try {
        const res = await $fetch('http://localhost:8000/api/catalogos', {
            method: 'GET',
            credentials: 'include'
        })
        console.log('Respuesta catalogos:', res)
        medicos.value = res.medicos || []
        entidades.value = res.entidades || []
        asesores.value = res.asesores || [] // Cuando lo traiga del backend
        console.log('Catálogos cargados:', { medicos: medicos.value, entidades: entidades.value, asesores: asesores.value })
    } catch (error) {
        console.error('Error cargando catálogos:', error)
    }
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
    buscadorAsesor.value = asesor.name
    mostrarDropdownAsesores.value = false
}

const limpiarAsesor = () => {
    filtros.value.asesor_id = ''
    buscadorAsesor.value = ''
    mostrarDropdownAsesores.value = false
}

const buscar = async () => {
    loading.value = true
    try {
        const res = await $fetch('http://localhost:8000/api/cotizaciones', {
            method: 'GET',
            params: {
                codigo: filtros.value.codigo,
                documento: filtros.value.documento,
                fecha_inicio: filtros.value.fecha_inicio,
                fecha_fin: filtros.value.fecha_fin,
                medico_id: filtros.value.medico_id,
                entidad_id: filtros.value.entidad_id,
                asesor_id: filtros.value.asesor_id,
                _t: Date.now() // evita cache agregando timestamp
            },
            credentials: 'include' // si usas Sanctum
        })
        console.log("validando fecth: ", res.data);

        registros.value = res.data
        emit('resultados', registros.value)

    } catch (error) {
        console.error('Error buscando cotizaciones:', error)
        emit('resultados', [])
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    cargarCatalogos()
})

watch(() => props.reset, () => {
    filtros.value.codigo = ''
    filtros.value.documento = ''
    filtros.value.fecha_inicio = ''
    filtros.value.fecha_fin = ''
    filtros.value.medico_id = ''
    filtros.value.entidad_id = ''
    filtros.value.asesor_id = ''
    buscadorMedico.value = ''
    buscadorEntidad.value = ''
    buscadorAsesor.value = ''
    registros.value = []
})
</script>

<template>
    <div class="flex gap-2 mb-4">
        <input v-model="filtros.codigo" placeholder="Código" class="w-1/6 border p-1" />
        <input v-model="filtros.documento" placeholder="Documento" class="w-1/6 border p-1" />
        
        <!-- Select buscable para médicos -->
        <div class="relative w-1/6">
            <div class="relative">
                <input v-model="buscadorMedico" placeholder="Médico" class="w-full border p-1"
                    @focus="mostrarDropdownMedicos = true" @blur="mostrarDropdownMedicos = false" />
                <button v-if="filtros.medico_id" @click="limpiarMedico"
                    class="absolute right-1 top-1 text-gray-400 hover:text-gray-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownMedicos && medicosFiltrados.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-t-0 max-h-48 overflow-y-auto z-10"
                @mousedown.prevent>
                <div v-for="medico in medicosFiltrados" :key="medico.id" @mousedown.prevent="seleccionarMedico(medico)"
                    class="p-2 hover:bg-blue-100 cursor-pointer">
                    {{ medico.nombre }}
                </div>
            </div>
        </div>

        <!-- Select buscable para entidades -->
        <div class="relative w-1/6">
            <div class="relative">
                <input v-model="buscadorEntidad" placeholder="Entidad" class="w-full border p-1"
                    @focus="mostrarDropdownEntidades = true" @blur="mostrarDropdownEntidades = false" />
                <button v-if="filtros.entidad_id" @click="limpiarEntidad"
                    class="absolute right-1 top-1 text-gray-400 hover:text-gray-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownEntidades && entidadesFiltradas.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-t-0 max-h-48 overflow-y-auto z-10"
                @mousedown.prevent>
                <div v-for="entidad in entidadesFiltradas" :key="entidad.id" @mousedown.prevent="seleccionarEntidad(entidad)"
                    class="p-2 hover:bg-blue-100 cursor-pointer">
                    {{ entidad.nombre }}
                </div>
            </div>
        </div>

        <!-- Select buscable para asesores -->
        <div class="relative w-1/6">
            <div class="relative">
                <input v-model="buscadorAsesor" placeholder="Asesor" class="w-full border p-1"
                    @focus="mostrarDropdownAsesores = true" @blur="mostrarDropdownAsesores = false" />
                <button v-if="filtros.asesor_id" @click="limpiarAsesor"
                    class="absolute right-1 top-1 text-gray-400 hover:text-gray-600">
                    ✕
                </button>
            </div>
            <div v-if="mostrarDropdownAsesores && asesoresFiltrados.length > 0"
                class="absolute top-full left-0 right-0 bg-white border border-t-0 max-h-48 overflow-y-auto z-10"
                @mousedown.prevent>
                <div v-for="asesor in asesoresFiltrados" :key="asesor.id" @mousedown.prevent="seleccionarAsesor(asesor)"
                    class="p-2 hover:bg-blue-100 cursor-pointer">
                    {{ asesor.name }}
                </div>
            </div>
        </div>

        <input type="date" v-model="filtros.fecha_inicio" class="w-1/6 border p-1" />
        <input type="date" v-model="filtros.fecha_fin" class="w-1/6 border p-1" />
        <button @click="buscar" class="w-1/6 bg-[#162983] text-white px-3 py-1 hover:bg-blue-900" :disabled="loading">
            {{ loading ? 'Buscando...' : 'Buscar' }}
        </button>
    </div>
</template>
