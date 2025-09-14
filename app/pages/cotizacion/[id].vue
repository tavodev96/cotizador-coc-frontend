<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons } from 'notivue'
const route = useRoute()
const cotizacion = ref(null)
const estadosAdministrativos = ref([
  { id: 1, nombre: 'ANULADA' },
  { id: 2, nombre: 'APROBADA' },
  { id: 3, nombre: 'EN TRÁMITE' },
  { id: 4, nombre: 'PROGRAMADA' },
  { id: 5, nombre: 'REALIZADA' },
  { id: 6, nombre: 'RECHAZADA' },
  { id: 7, nombre: 'VENCIDA' }
])
const estadoSeleccionado = ref(null)
const nuevoComentario = ref('')
const archivos = ref([])
const historico_estados = ref([])
const mostrarModalHistorico = ref(false)

const fetchDetalle = async () => {
  const { data } = await useSanctumFetch(`/api/cotizacion/${route.params.id}`)
  cotizacion.value = data.value.cotizacion
  historico_estados.value = data.value.estados
  estadoSeleccionado.value = cotizacion.value.estado_id
}

const pushNotification = (type, message, title) => {
  push[type]({
    title: title,
    message: message,
    ariaRole: 'alert'
  })
}

const onFileChange = (e) => {
  archivos.value = Array.from(e.target.files)
}


const agregarComentario = async () => {
  const formData = new FormData()
  formData.append('comentario', nuevoComentario.value)

  for (let i = 0; i < archivos.value.length; i++) {
    formData.append('archivos[]', archivos.value[i])
  }

  const { data, error } = await useSanctumFetch(`/api/cotizaciones/${route.params.id}/comentarios`, {
    method: 'POST',
    body: formData,
    headers: {}
  })

  if (error.value) {
    pushNotification('error', 'No se pudo agregar el comentario', 'Error')
    return
  }

  if (data.value?.success) {
    nuevoComentario.value = ''
    archivos.value = null

    pushNotification('success', 'Comentario agregado con éxito', 'Éxito')

    setTimeout(function () {
      window.location.reload();
    }, 3000);

  }
}

const cambiarEstado = async () => {
  const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/estado`, {
    method: 'PUT',
    body: { estado: estadoSeleccionado.value }
  })

  if (!data.value.success) {
    pushNotification('error', 'No se pudo cambiar el estado', 'Error')
    return
  }

  historico_estados.value = data.value.historial;
  mostrarModalHistorico.value = true;

  pushNotification('success', 'Estado actualizado con éxito', 'Éxito')
}

onMounted(fetchDetalle)

const formatoFecha = (fechaISO) => {
  if (!fechaISO) return ''; // Maneja fechas nulas

  const fecha = new Date(fechaISO);

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0'); // Los meses en JS van de 0 a 11
  const anio = fecha.getFullYear();

  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');

  return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
}
</script>

<template>
  <div>
    <Notivue v-slot="item">
      <Notification :item="item" :icons="filledIcons" />
    </Notivue>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h2 class="text-xl font-bold">Cotización {{ cotizacion?.codigo }}</h2>
        <p>Cliente: {{ cotizacion?.paciente.nombre_completo }}</p>
        <p>Asesor: {{ cotizacion?.asesor.name }}</p>
        <p>Estado: {{ cotizacion?.estado }}</p>
      </div>
      <div>
        <div class="mt-4 flex justify-center items-center gap-2">
          <label for="estado" class="font-semibold">Cambiar estado:</label>
          <select v-model="estadoSeleccionado" id="estado" class="border p-2 rounded-lg w-32">
            <option v-for="estado in estadosAdministrativos" :value="estado.nombre" :key="estado.id">
              {{ estado.nombre }}
            </option>
          </select>
          <button @click="cambiarEstado" class="ml-2 bg-blue-500 text-white px-4 py-2 rounded-lg">
            Guardar
          </button>
        </div>

        <h3 class="mt-4 font-semibold">Historial de Estados</h3>
        <div class="flex justify-end">
          <button @click="mostrarModalHistorico = true"
            class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
            Ver histórico
          </button>
        </div>
      </div>
    </div>

    <div class="w-fit">
      <h3 class="mt-4 font-semibold">Items</h3>
      <ul>
        <li v-for="item in cotizacion?.items" :key="item.id" class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
            <path fill="#1E9C07"
              d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z" />
          </svg>
          {{ item.codigo }} - {{ item.nombre }} -
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24"><!-- Icon from Google Material Icons by Material Design Authors - https://github.com/material-icons/material-icons/blob/master/LICENSE -->
            <path fill="#888888"
              d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5c-1.65 3.37-5.02 5.5-8.82 5.5S4.83 15.37 3.18 12A9.77 9.77 0 0 1 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5" />
          </svg>
          {{ item.lateralidad }} - ${{ item.valor }}
        </li>
      </ul>
      <p class="mt-4"><span>
          <b>Total:</b> <span class="text-[#172983] font-bold text-2xl">${{ cotizacion?.total }}</span>
      </span></p>
    </div>

    <h3 class="mt-4 font-semibold">Comentarios</h3>
    <div v-for="com in cotizacion?.comentarios" :key="com.id" class="border p-2 mb-2">
      <p><b>{{ com.usuario.name }} - {{ formatoFecha(com.created_at) }}</b>: {{ com.comentario }}</p>
      <div v-if="com.adjuntos.length > 0" class="mt-2">
        <p>Archivos adjuntos:</p>
        <ul>
          <li v-for="adjunto in com.adjuntos" :key="adjunto.id" class=" w-fit flex justify-center items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
              <path fill="#07459C"
                d="M18 15.75q0 2.6-1.825 4.425T11.75 22t-4.425-1.825T5.5 15.75V6.5q0-1.875 1.313-3.187T10 2t3.188 1.313T14.5 6.5v8.75q0 1.15-.8 1.95t-1.95.8t-1.95-.8t-.8-1.95V6h2v9.25q0 .325.213.538t.537.212t.538-.213t.212-.537V6.5q-.025-1.05-.737-1.775T10 4t-1.775.725T7.5 6.5v9.25q-.025 1.775 1.225 3.013T11.75 20q1.75 0 2.975-1.237T16 15.75V6h2z" />
            </svg>
            <a :href="`http://localhost:8000/storage/${adjunto.archivo_path}`" target="_blank">{{ adjunto.archivo_nombre
            }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-4 border-t pt-4">
      <div class="flex flex-col">
        <textarea v-model="nuevoComentario" placeholder="Escribe un comentario" class="border p-2 w-full"></textarea>
        <input type="file" multiple @change="onFileChange" class="mt-2" />
        <button @click="agregarComentario" class="w-fit bg-green-500 text-white px-4 py-2 mt-4 rounded-lg">Agregar
          comentario</button>
      </div>
    </div>
  </div>

  <!-- Modal -->
  <div v-if="mostrarModalHistorico" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">

      <!-- Botón cerrar -->
      <button @click="mostrarModalHistorico = false"
        class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">
        ✕
      </button>

      <h3 class="text-lg font-bold mb-4">Historial de Estados</h3>

      <ul class="space-y-4 max-h-80 overflow-y-auto">
        <li v-for="estado in historico_estados" :key="estado.id" class="border-b pb-2">
          <p><b>Estado anterior:</b> {{ estado.estado_anterior }}</p>
          <p><b>Estado nuevo:</b> {{ estado.estado_nuevo }}</p>
          <p><b>Usuario:</b> {{ estado.usuario.name }}</p>
          <p><b>Fecha:</b> {{ formatoFecha(estado.created_at) }}</p>
        </li>
      </ul>

    </div>
  </div>
</template>
