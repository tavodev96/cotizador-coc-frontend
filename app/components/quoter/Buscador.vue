<script setup>
import { ref } from 'vue'

const props = defineProps({
    reset: Boolean
})

const emit = defineEmits(['resultados'])

const filtros = ref({
    codigo: '',
    documento: '',
    fecha_inicio: '',
    fecha_fin: ''
})

const registros = ref([])

const loading = ref(false)

const buscar = async () => {
    loading.value = true
    try {
        const res  = await $fetch('http://localhost:8000/api/cotizaciones', {
            method: 'GET',
            params: {
                codigo: filtros.value.codigo,
                documento: filtros.value.documento,
                fecha_inicio: filtros.value.fecha_inicio,
                fecha_fin: filtros.value.fecha_fin,
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


watch(() => props.reset, () => {
    filtros.value.codigo = ''
    filtros.value.documento = ''
    filtros.value.fecha_inicio = ''
    filtros.value.fecha_fin = ''
    registros.value = []
})
</script>

<template>
    <div class="flex gap-2 mb-4">
        <input v-model="filtros.codigo" placeholder="Código" class="w-1/4 rder p-1" />
        <input v-model="filtros.documento" placeholder="Documento" class="w-1/4 border p-1" />
        <input type="date" v-model="filtros.fecha_inicio" class="w-1/4 border p-1" />
        <input type="date" v-model="filtros.fecha_fin" class="w-1/4 border p-1" />
        <button @click="buscar" class="w-1/4 bg-blue-500 text-white px-3 py-1" :disabled="loading">
            {{ loading ? 'Buscando...' : 'Buscar' }}
        </button>
    </div>
</template>
