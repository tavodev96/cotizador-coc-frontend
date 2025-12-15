<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons } from 'notivue'
const route = useRoute()
const router = useRouter()

const cotizacion = ref(null)
const estadosAdministrativos = ref([]);
const estadoSeleccionado = ref(null)
const nuevoComentario = ref('')
const archivos = ref([])
const historico_estados = ref([])
const mostrarModalHistorico = ref(false)
const savingComentario = ref(false)
const loading = ref(true)
const loadingEstados = ref(false)

const intendedEstado = ref(null)
const mostrarModalComentario = ref(false)
const estadoSeleccionadoTemp = ref(null)

const fetchDetalle = async () => {
  try {
    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}`)
    
    if (error.value) {
      console.error('Error en fetchDetalle:', error.value)
      return
    }
        
    // Asignar los datos con un pequeño delay para asegurar reactividad
    cotizacion.value = { ...data.value.cotizacion }
    historico_estados.value = [...data.value.estados]
    estadoSeleccionado.value = cotizacion.value.estado_id
    estadoSeleccionadoTemp.value = cotizacion.value.estado_id

  } catch (err) {
    console.error('Error capturado en fetchDetalle:', err)
  }
}

const fetchEstados = async () => {
  const { data } = await useSanctumFetch('/api/estados/cotizacion', { method: 'GET' })
  estadosAdministrativos.value = data.value.sort((a, b) => a.orden - b.orden);
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
  if (savingComentario.value) return false
  savingComentario.value = true

  const formData = new FormData()
  formData.append('comentario', nuevoComentario.value)

  for (let i = 0; i < archivos.value.length; i++) {
    formData.append('archivos[]', archivos.value[i])
  }

  try {
    const { data, error } = await useSanctumFetch(`/api/cotizaciones/${route.params.id}/comentarios`, {
      method: 'POST',
      body: formData,
      headers: {}
    })

    if (error.value) {
      pushNotification('error', 'No se pudo agregar el comentario', 'Error')
      return false
    }

    if (data.value?.success) {
      nuevoComentario.value = ''
      archivos.value = []

      const comentarioCreado = data.value?.comentario || data.value?.data || null

      if (comentarioCreado) {
        cotizacion.value.comentarios = cotizacion.value.comentarios || []
        cotizacion.value.comentarios.push(comentarioCreado)
      } else {
        await fetchDetalle()
      }

      pushNotification('success', 'Comentario agregado con éxito', 'Éxito')
      return true
    }

    return false
  } finally {
    savingComentario.value = false
  }
}

const realizarCambioEstado = async (estadoId) => {
  try {
    loadingEstados.value = true

    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/estado`, {
      method: 'PUT',
      body: { estado: estadoId }
    })

    if (error.value || !data.value?.success) {
      pushNotification('error', 'No se pudo cambiar el estado', 'Error')
      return false
    }

    // Actualizar el histórico directamente si viene en la respuesta
    if (data.value.historial) {
      historico_estados.value = [...data.value.historial]
    }

    pushNotification('success', 'Estado actualizado con éxito', 'Éxito')

    // Pequeño delay antes de refrescar
    await new Promise(resolve => setTimeout(resolve, 1000))
    
    await router.replace({ path: route.path, query: { _t: Date.now() } })
    
    // return true
  
  } catch (e) {
    console.error('Error en realizarCambioEstado:', e)
    pushNotification('error', 'No se pudo cambiar el estado', 'Error')
    return false
  } finally {
    loadingEstados.value = false
  }
}

const cambiarEstado = async () => {
  const nueva = estadoSeleccionadoTemp.value
  const requiereComentario = [4, 6]

  const estadoActual = cotizacion.value?.estado_id

  intendedEstado.value = nueva

  const requiereComentarioNuevo = requiereComentario.includes(Number(nueva))
  const requiereComentarioSalida = requiereComentario.includes(Number(estadoActual)) && Number(nueva) !== Number(estadoActual)

  if ((requiereComentarioNuevo || requiereComentarioSalida) && (!nuevoComentario.value || !nuevoComentario.value.trim())) {
    mostrarModalComentario.value = true
    estadoSeleccionadoTemp.value = cotizacion.value?.estado_id || null
    return
  }

  await realizarCambioEstado(nueva)
}

const enviarComentarioYEstado = async () => {
  const ok = await agregarComentario()
  if (!ok) return

  if (intendedEstado.value) {
    await realizarCambioEstado(intendedEstado.value)
    estadoSeleccionadoTemp.value = intendedEstado.value
  }

  // Cerrar modal y limpiar
  mostrarModalComentario.value = false
  intendedEstado.value = null
}

const cancelarModalComentario = () => {
  mostrarModalComentario.value = false
  estadoSeleccionado.value = cotizacion.value?.estado_id || null
  intendedEstado.value = null
}

onMounted(async () => {
  try {
    await Promise.all([
      fetchDetalle(),
      fetchEstados()
    ]);
  } catch (e) {
    pushNotification('error', 'No se pudo cargar la cotización', 'Error')
  } finally {
    loading.value = false;
  }
})

const formatoFecha = (fechaISO) => {
  if (!fechaISO) return '';

  const fecha = new Date(fechaISO);

  const dia = String(fecha.getDate()).padStart(2, '0');
  const mes = String(fecha.getMonth() + 1).padStart(2, '0');
  const anio = fecha.getFullYear();

  const horas = String(fecha.getHours()).padStart(2, '0');
  const minutos = String(fecha.getMinutes()).padStart(2, '0');

  if (!cotizacion.value?.codificacion) {
    return `${dia}/${mes}/${anio} ${horas}:${minutos}`;
  } else {
    return `${dia}/${mes}/${anio}`;
  }
}

const formatearNumero = (valor, decimals = 2) => {
  if (valor === null || valor === undefined) return '0,00';

  let str = String(valor).trim();

  const numero = Number(str);
  if (isNaN(numero)) return '0,00';

  return new Intl.NumberFormat('es-CO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: true,
    style: 'decimal'
  }).format(numero);
};

const totalConDetalles = computed(() => {
  if (!cotizacion.value) return 0

  const totalDetalles = cotizacion.value.detalles?.reduce(
    (acc, d) => acc + (parseFloat(d.valor) || 0),
    0
  ) || 0

  return (parseFloat(cotizacion.value.total) || 0) + totalDetalles
})
</script>

<template>
  <div v-show="loading">
    <div class="flex justify-center items-center gap-2">
      <span class="flex items-center gap-2">
        <svg class="w-10" fill="hsl(228, 97%, 42%)" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <circle cx="4" cy="12" r="3">
            <animate id="spinner_qFRN" begin="0;spinner_OcgL.end+0.25s" attributeName="cy" calcMode="spline" dur="0.6s"
              values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
          <circle cx="12" cy="12" r="3">
            <animate begin="spinner_qFRN.begin+0.1s" attributeName="cy" calcMode="spline" dur="0.6s" values="12;6;12"
              keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
          <circle cx="20" cy="12" r="3">
            <animate id="spinner_OcgL" begin="spinner_qFRN.begin+0.2s" attributeName="cy" calcMode="spline" dur="0.6s"
              values="12;6;12" keySplines=".33,.66,.66,1;.33,0,.66,.33" />
          </circle>
        </svg>
      </span>
      <span class="text-lg font-semibold">
        Cargando información...
      </span>
    </div>
  </div>
  <div v-show="!loading">
    <Notivue v-slot="item">
      <Notification :item="item" :icons="filledIcons" />
    </Notivue>
    <div class="flex items-center justify-between mb-4">
      <div class="flex flex-col gap-2">
        <h2 class="text-xl font-bold"> {{ cotizacion?.tipo_gestion == 'cotización' ? 'Cotización' : 'Codificación' }} {{
          cotizacion?.codigo }}</h2>
        <p><span class="font-bold">Cliente:</span> {{ cotizacion?.paciente.nombre_completo }}</p>
        <p><span class="font-bold">Asesor:</span> {{ cotizacion?.asesor.name }}</p>
        <p><span class="font-bold">Estado:</span> <span
            class="bg-[#172983] text-white rounded-full px-2 py-1 text-sm">{{ cotizacion?.estado.nombre }}</span></p>
        <p v-if="cotizacion?.codificacion"><span class="font-bold">Codificación:</span> <span
            class="bg-[#208317] text-white rounded-full px-2 py-1 text-sm">{{
              cotizacion?.codificacion?.numero_autorizacion }}</span></p>
      </div>
      <div>
        <div class="mt-4 flex justify-center items-center gap-2">
          <label for="estado" class="font-semibold">Cambiar estado:</label>
          <select v-model="estadoSeleccionadoTemp" id="estado" class="border p-2 rounded-lg w-32">
            <option disabled value="" selected>Estados</option>
            <option v-for="estado in estadosAdministrativos" :value="estado.id" :key="estado.id">
              {{ estado.nombre }}
            </option>
          </select>
          <button @click="cambiarEstado"
            class="flex justify-center items-center gap-2 ml-2 bg-[#172983] text-white px-4 py-2 rounded-lg"
            :disabled="loadingEstados">
            <template v-if="!loadingEstados">Actualizar</template>
            <template v-else>
              <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
              </svg>
              Actualizando...
            </template>
          </button>
        </div>

        <div class="flex justify-between items-center gap-2 mt-4">
          <h3 class="font-semibold">Historial de Estados:</h3>
          <div class="flex justify-end">
            <button @click="mostrarModalHistorico = true"
              class="bg-gray-600 text-white px-4 py-2 rounded-lg hover:bg-gray-700 transition">
              Ver histórico
            </button>
          </div>
        </div>
      </div>
    </div>

    <div class="w-full">
      <h3 class="mt-4 font-semibold">Items</h3>
      <ul>
        <li v-for="(item, index) in (cotizacion?.codificacion ?
          cotizacion.items.filter((item, i, arr) =>
            arr.findIndex(t => t.codigo === item.codigo) === i
          ) :
          cotizacion?.items)" :key="item.id" class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
            <path fill="#1E9C07"
              d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z" />
          </svg>
          {{ item.codigo }} - {{ item.nombre }}
          <span v-show="!cotizacion?.codificacion?.numero_autorizacion" class="flex  justify-center items-center gap-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24">
              <path fill="#888888"
                d="M12 6.5a9.77 9.77 0 0 1 8.82 5.5c-1.65 3.37-5.02 5.5-8.82 5.5S4.83 15.37 3.18 12A9.77 9.77 0 0 1 12 6.5m0-2C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5m0 5a2.5 2.5 0 0 1 0 5a2.5 2.5 0 0 1 0-5m0-2c-2.48 0-4.5 2.02-4.5 4.5s2.02 4.5 4.5 4.5s4.5-2.02 4.5-4.5s-2.02-4.5-4.5-4.5" />
            </svg>
            {{ item.lateralidad }} - ${{ item.valor }}
          </span>
        </li>
      </ul>
      <h3 class="mt-4 font-semibold">Insumos</h3>
      <ul>
        <li v-for="detalle in cotizacion?.detalles" :key="detalle.id" class="flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
            viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
            <path fill="#1E9C07"
              d="m10.6 16.2l7.05-7.05l-1.4-1.4l-5.65 5.65l-2.85-2.85l-1.4 1.4zM5 21q-.825 0-1.412-.587T3 19V5q0-.825.588-1.412T5 3h14q.825 0 1.413.588T21 5v14q0 .825-.587 1.413T19 21zm0-2h14V5H5zM5 5v14z" />
          </svg>
          {{ detalle.codigo }} - {{ detalle.nombre }} <span v-show="!cotizacion?.codificacion?.numero_autorizacion">${{
            detalle.valor }}</span>
          <span v-if="detalle.tipo == 'L'" class="text-blue-600 font-bold">- (LENTE)
          </span>
        </li>
      </ul>

      <div v-if="cotizacion?.codificacion?.numero_autorizacion">
        <h3 class="mt-4 font-semibold">Autorización</h3>
        <ul>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg> Copago: {{ formatearNumero(cotizacion?.codificacion.copago) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>excedente tope: {{ formatearNumero(cotizacion?.codificacion.excedente_tope) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Lente: {{ formatearNumero(cotizacion?.codificacion.lente) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Pre-Anestesia: {{ formatearNumero(cotizacion?.codificacion.pre_anestesia) }}</li>
          <li class="flex items-center gap-1"><svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from BoxIcons by Atisa - https://creativecommons.org/licenses/by/4.0/ -->
              <path fill="#1E9C07" d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2m0 18a8 8 0 1 1 8-8a8 8 0 0 1-8 8" />
              <path fill="#1E9C07"
                d="M12 11c-2 0-2-.63-2-1s.7-1 2-1s1.39.64 1.4 1h2A3 3 0 0 0 13 7.12V6h-2v1.09C9 7.42 8 8.71 8 10c0 1.12.52 3 4 3c2 0 2 .68 2 1s-.62 1-2 1c-1.84 0-2-.86-2-1H8c0 .92.66 2.55 3 2.92V18h2v-1.08c2-.34 3-1.63 3-2.92c0-1.12-.52-3-4-3" />
            </svg>Otros costos: {{ formatearNumero(cotizacion?.codificacion.otros_costos) }}</li>
          <li class="flex items-center gap-1">
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"
              viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
              <path fill="#172983"
                d="M5 8h14V6H5zm0 0V6zm0 14q-.825 0-1.412-.587T3 20V6q0-.825.588-1.412T5 4h1V3q0-.425.288-.712T7 2t.713.288T8 3v1h8V3q0-.425.288-.712T17 2t.713.288T18 3v1h1q.825 0 1.413.588T21 6v4.675q0 .425-.288.713t-.712.287t-.712-.288t-.288-.712V10H5v10h5.8q.425 0 .713.288T11.8 21t-.288.713T10.8 22zm13 1q-2.075 0-3.537-1.463T13 18t1.463-3.537T18 13t3.538 1.463T23 18t-1.463 3.538T18 23m.5-5.2v-2.3q0-.2-.15-.35T18 15t-.35.15t-.15.35v2.275q0 .2.075.388t.225.337l1.525 1.525q.15.15.35.15t.35-.15t.15-.35t-.15-.35z" />
            </svg>
            Fecha de vigencia: <span class="text-red-700 font-bold">
              {{
                formatoFecha(cotizacion?.codificacion.fecha_vigencia) }}
            </span>
          </li>
        </ul>
      </div>
      <div>
        <h3 class="my-2 font-semibold">Observaciones:</h3>
        <textarea class="w-fit h-fit border rounded p-2 resize-none font-semibold"
          :disabled="cotizacion?.observaciones">{{
            cotizacion?.observaciones }}</textarea>
      </div>
      <p v-show="!cotizacion?.codificacion?.numero_autorizacion" class="mt-4">
        <span>
          <b>Total:</b> <span class="text-[#172983] font-bold text-2xl">
            ${{ totalConDetalles }}
          </span>
        </span>
      </p>
      <div class="mt-4 flex justify-end items-center">
        <div v-if="cotizacion">
          <NuxtLink :to="`/cotizacion/imprimir/${cotizacion.id}`"
            class="bg-green-600 text-white mt-4 px-4 py-2 rounded">
            Imprimir {{ cotizacion?.tipo_gestion == 'cotización' ? 'Cotización' : 'Codificación' }}</NuxtLink>
        </div>
      </div>
    </div>

    <h3 class="mt-4 text-xl font-bold">Comentarios</h3>
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
            <a :href="`https://api.cotizador.clinicaofta.com/storage/${adjunto.archivo_path}`" target="_blank">{{ adjunto.archivo_nombre
            }}</a>
          </li>
        </ul>
      </div>
    </div>

    <div class="mt-4 border-t pt-4">
      <div class="flex flex-col">
        <textarea v-model="nuevoComentario" placeholder="Escribe un comentario" class="border p-2 w-full"
          :disabled="savingComentario"></textarea>
        <input type="file" multiple @change="onFileChange" class="mt-2" />
        <button @click="agregarComentario" :disabled="savingComentario"
          class="w-fit bg-green-500 text-white px-4 py-2 mt-4 rounded-lg flex items-center gap-2">
          <template v-if="!savingComentario">Agregar comentario</template>
          <template v-else>
            <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
            Guardando información...
          </template>
        </button>
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
          <p><b>Estado anterior:</b> {{ estado.estado_anterior?.nombre || 'Desconocido' }}</p>
          <p><b>Estado nuevo:</b> {{ estado.estado_nuevo?.nombre || 'Desconocido' }}</p>
          <p><b>Usuario:</b> {{ estado.usuario?.name || 'Desconocido' }}</p>
          <p><b>Fecha:</b> {{ formatoFecha(estado.created_at) }}</p>
        </li>
      </ul>

    </div>
  </div>

  <div v-if="mostrarModalComentario" class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
    <div class="bg-white rounded-lg shadow-lg p-6 w-full max-w-lg relative">
      <button @click="cancelarModalComentario"
        class="absolute top-3 right-3 text-gray-600 hover:text-black text-xl">✕</button>
      <h3 class="text-lg font-bold mb-4">Comentario requerido</h3>
      <p class="mb-4">Este cambio de estado requiere que ingreses un comentario. Por favor escribe el comentario antes
        de
        continuar.</p>
      <textarea v-model="nuevoComentario" placeholder="Escribe un comentario"
        class="w-full border p-2 h-28 mb-4"></textarea>
      <input type="file" multiple @change="onFileChange" class="mb-4" />
      <div class="flex justify-end gap-2">
        <button @click="cancelarModalComentario" class="px-4 py-2 bg-gray-300 rounded">Cancelar</button>
        <button @click="enviarComentarioYEstado" :disabled="savingComentario"
          class="px-4 py-2 bg-blue-600 text-white rounded">
          <template v-if="!savingComentario">Enviar comentario y cambiar estado</template>
          <template v-else>Enviando...</template>
        </button>
      </div>
    </div>
  </div>
</template>
