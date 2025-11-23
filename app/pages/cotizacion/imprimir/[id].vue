<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons } from 'notivue'

const route = useRoute()
const cotizacion = ref(null)
const contentRef = ref(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const { data, error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}`)
    if (error.value) {
      console.error('Error fetching cotizacion:', error.value)
    } else {
      cotizacion.value = data.value.cotizacion
    }
  } catch (err) {
    pushNotification({
      type: 'error',
      message: 'Error al cargar la cotización.'
    })
  } finally {
    loading.value = false
  }

})

const pushNotification = (type, message, title) => {
  push[type]({
    title: title,
    message: message,
    ariaRole: 'alert'
  })
}

const itemsAgrupados = computed(() => {
  if (!cotizacion.value?.items) return [];

  // Crear un Map para agrupar por código
  const grupos = new Map();

  cotizacion.value.items.forEach(item => {
    if (!grupos.has(item.codigo)) {
      // Si es el primer item, lo guardamos como base
      grupos.set(item.codigo, {
        ...item,
        valor: Number(item.valor || 0),
        cantidad: 1
      });
    } else {
      // Si ya existe, sumamos el valor y aumentamos contador
      const grupo = grupos.get(item.codigo);
      grupo.valor += Number(item.valor || 0);
      grupo.cantidad += 1;
    }
  });

  return Array.from(grupos.values());
});

// Formato moneda
const formatMoney = (num) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num || 0)
}

const imprimir = () => {
  window.print()
}

const descargarPDF = async () => {
  if (process.client) {
    // Importación dinámica (Client-Only)
    const html2pdf = (await import('html2pdf.js')).default;

    if (contentRef.value && cotizacion.value) {

      const options = {
        margin: [0, 0, 0, 0],
        filename: `Cotizacion_${cotizacion.value.codigo || 'nueva'}.pdf`,
        image: { type: 'png', quality: 1.0 },
        putOnlyUsedFonts: true,
        html2canvas: {
          scale: 4,
          logging: false,
          useCORS: true
        },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      html2pdf().set(options).from(contentRef.value)
        .toPdf().get('pdf').then(function (pdf) {

          const pageCount = pdf.internal.getNumberOfPages();

          for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);

            const y = pdf.internal.pageSize.height - 15;
            const x = 10;
            const pageWidth = pdf.internal.pageSize.width;
            const rightMargin = 10;

            pdf.setFontSize(8);

            pdf.setLineWidth(0.2);
            pdf.line(x, y - 5, pageWidth - rightMargin, y - 5);

            const footerText1 = 'Sede principal Cra 47 # 8c-94 | PBX: (602) 511 02 00';
            const footerText2 = 'Cali - Colombia';

            pdf.text(footerText1, x, y);
            pdf.text(footerText2, x, y + 3);

            const pageNumText = `Página ${i} de ${pageCount}`;
            pdf.text(pageNumText, pageWidth - rightMargin, y + 3, { align: 'right' });
          }
        })
        .save();

    } else {
      console.error("No se encontró la referencia al contenido o los datos de la cotización.");
    }
  }
}
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
    <div class="py-6 px-6 bg-white text-black max-w-5xl mx-auto" ref="contentRef">
      <!-- Encabezado -->
      <div class="flex justify-between items-start mb-2">
        <div>
          <img src="/img/logo_clinica_oftalmologia.png" alt="clinicaofta" class="h-16 mb-4" />
          <p>Santiago de Cali,</p>
        </div>
        <div class="text-right">
          <p><strong>Cotización N°:</strong> {{ cotizacion?.codigo }}</p>
          <p><strong>Entidad:</strong> {{ cotizacion?.paciente?.entidad?.nombre }}</p>
          <p><strong>Médico:</strong> {{ cotizacion?.medico?.nombre }}</p>
        </div>
      </div>
      <hr class="mb-2" />
      <!-- Datos del paciente -->
      <div class="grid grid-cols-2 gap-6 mb-4">
        <div>
          <p><strong>Paciente:</strong> {{ cotizacion?.paciente?.nombre_completo }}</p>
          <p><strong>Número de Documento:</strong> {{ cotizacion?.paciente?.numero_identificacion }}</p>
          <p><strong>Correo:</strong> {{ cotizacion?.paciente?.correo }}</p>
        </div>
        <div>
          <p><strong>Tipo de Documento:</strong> {{ cotizacion?.paciente?.tipo_identificacion }}</p>
          <p><strong>Teléfono:</strong> {{ cotizacion?.paciente?.telefono }}</p>
        </div>
      </div>
      <hr class="mb-4" />
      <!-- Procedimientos -->
      <h2 class="text-base font-bold mb-2">PROCEDIMIENTO</h2>
      <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
        <thead class="bg-[#172983] text-white">
          <tr>
            <th class="border px-2 py-2 text-sm">CUPS</th>
            <th class="border px-2 py-2">Nombre</th>
            <th class="border px-2 py-2">Lateralidad</th>
            <th class="border px-2 py-2 text-right">Valor</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="item in itemsAgrupados" :key="item.id">
            <td class="border px-2 py-2">{{ item.codigo }}</td>
            <td class="border px-2 py-2">{{ item.nombre }}</td>
            <td class="border px-2 py-2">{{ item.lateralidad }}</td>
            <td class="border px-2 py-2 text-right">{{ formatMoney(item.valor) }}</td>
          </tr>
        </tbody>
      </table>
      <!-- Insumos -->
      <h2 class="text-base font-bold mb-2">INSUMOS</h2>
      <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
        <thead class="bg-[#172983] text-white">
          <th class="border px-2 py-2">Código</th>
          <th class="border px-2 py-2">Nombre</th>
          <th class="border px-2 py-2">Tipo</th>
          <th class="border px-2 py-2 text-right">Valor</th>
        </thead>
        <tr v-for="detalle in cotizacion?.detalles" :key="detalle.id">
          <td class="border border-gray-400 px-2 py-2">{{ detalle.codigo }}</td>
          <td class="border border-gray-400 px-2 py-2">{{ detalle.nombre }}</td>
          <td class="border border-gray-400 px-2 py-2">
            <span v-if="detalle.tipo === 'L'">(Lente)</span>
            <span v-else-if="detalle.tipo === 'I'">(Insumo)</span>
          </td>
          <td class="border border-gray-400 px-2 py-2 text-right">
            {{ formatMoney(detalle.valor) }}
          </td>
        </tr>
      </table>
      <p class="text-right font-bold mb-4">
        VALOR TOTAL DEL PROCEDIMIENTO: {{ formatMoney(cotizacion?.total) }}
      </p>

      <!-- Costos desglosados -->
      <!-- <div class="mb-8">
      <p><strong>Derechos Clínica:</strong> {{ formatMoney(cotizacion?.costos?.derechos_clinica) }}</p>
      <p><strong>Honorarios Médicos:</strong> {{ formatMoney(cotizacion?.costos?.honorarios_medicos) }}</p>
      <p><strong>Honorarios Anestesia:</strong> {{ formatMoney(cotizacion?.costos?.honorarios_anestesia) }}</p>
      <p><strong>Lente:</strong> {{
        formatMoney(cotizacion?.detalles?.filter(d => d.tipo === 'L').reduce((a, i) => a + i.valor, 0))}}</p>
      <p><strong>Insumos:</strong> {{
        formatMoney(cotizacion?.detalles?.filter(d => d.tipo === 'I').reduce((a, i) => a + i.valor, 0))}}</p>
    </div> -->

      <!-- Observaciones -->
      <div class="mb-4">
        <h2 class="text-lg font-bold">Observaciones</h2>
        <p class="text-sm">{{ cotizacion?.observaciones || 'Ninguna' }} OD. LENTE EYHANCE TORICO INCLUYE VISCOLASTICO
          DUOVISC IQ. ORDENES POR APARTE POR HONORARIOS MEDICOS. DERECHOS CLINICOS. HA. ENTIDAD CUBRE LENTE HASTA POR UN
          VALOR DE $700,000 VALOR YA DESCONTADO EN VALOR DE LIO. EXCEDENTE SERA A CARGO DE PACIENTE.</p>
      </div>

      <!-- Inclusiones -->
      <!-- <div class="mb-8">
      <h2 class="text-lg font-bold">Inclusiones</h2>
      <p>{{ cotizacion?.inclusiones || 'Ninguna' }}</p>
    </div> -->
      <!-- Pie de página -->
      <div class="mt-20 text-sm text-gray-700">
        <p class="mb-1 font-semibold text-xl">{{ cotizacion?.asesor?.name }}</p>
        <p>Asesor barra SAI</p>
        <p>Email: {{ cotizacion?.asesor?.email }}</p>

        <!-- <hr class="my-4" /> -->

        <!-- <div class="flex justify-between">
        <p>Sede principal Cra 47 # 8c-94<br />PBX: (602) 511 02 00</p>
        <p>Cali - Colombia</p>
      </div> -->
      </div>
    </div>

    <!-- Botón imprimir -->
    <div class="mt-6 text-center print:hidden flex justify-center gap-4">
      <button class="bg-blue-600 text-white px-4 py-2 rounded" @click="imprimir">
        Imprimir
      </button>
      <button class="bg-green-600 text-white px-4 py-2 rounded" @click="imprimir">
        Correo electrónico
      </button>
      <button class="bg-red-600 text-white px-4 py-2 rounded" @click="descargarPDF">
        Descargar PDF
      </button>
    </div>
  </div>
</template>
