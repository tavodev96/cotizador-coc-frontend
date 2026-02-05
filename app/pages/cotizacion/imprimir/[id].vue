<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons } from 'notivue'
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';

const route = useRoute()
const cotizacion = ref(null)
const contentRef = ref(null)
const loading = ref(true)
const loadingDescargar = ref(false)
const loadingImprimir = ref(false)
const privateContent = ref(false)

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

const detallesAgrupados = computed(() => {
  if (!cotizacion.value?.detalles) return { insumos: [], lentes: [] };

  const insumos = new Map();
  const lentes = new Map();

  cotizacion.value.detalles.forEach(detalle => {
    const tipo = detalle.tipo === 'L' ? lentes : insumos;

    if (!tipo.has(detalle.codigo)) {
      tipo.set(detalle.codigo, {
        ...detalle,
        valor: Number(detalle.valor || 0),
        cantidad: 1
      });
    } else {
      const item = tipo.get(detalle.codigo);
      item.valor += Number(detalle.valor || 0);
      item.cantidad += 1;
    }
  });

  return {
    insumos: Array.from(insumos.values()),
    lentes: Array.from(lentes.values())
  };
});

// Totales
const totalInsumos = computed(() => {
  return detallesAgrupados.value.insumos.reduce((sum, item) => sum + item.valor, 0);
});

const totalLentes = computed(() => {
  return detallesAgrupados.value.lentes.reduce((sum, item) => sum + item.valor, 0);
});

const totalCantidadInsumos = computed(() => {
  return detallesAgrupados.value.insumos.reduce((sum, item) => sum + item.cantidad, 0);
});

const totalCantidadLentes = computed(() => {
  return detallesAgrupados.value.lentes.reduce((sum, item) => sum + item.cantidad, 0);
});

// Agrupar procedimientos por concepto y calcular totales
const agrupadoPorConcepto = computed(() => {
  if (!cotizacion.value?.items) return [];

  const map = new Map();

  cotizacion.value.items.forEach(item => {
    const key = item.concepto ?? 'SIN_CONCEPTO';
    const connom = item.connom ?? '';
    const cantidad = Number(item.cantidad ?? 1);
    const valor = Number(item.valor || 0) * cantidad;

    if (!map.has(key)) {
      map.set(key, { concepto: key, connom: connom, total: valor, cantidad: cantidad });
    } else {
      const g = map.get(key);
      g.total += valor;
      g.cantidad += cantidad;
      map.set(key, g);
    }
  });

  return Array.from(map.values());
});

const getConceptoLabel = (concepto, connom) => {
  const c = concepto ?? '';
  const name = (connom || '').trim();

  if (c === 'DP' || /DERECHOS/i.test(name)) return 'DP - Derechos Clínicos';
  if (c === 'HANQ' || /ANEST/i.test(name)) return 'HANQ - Honorarios Anestesiologo';
  if (!c || c === 'SIN_CONCEPTO') return 'HM - Honorarios Médicos';
  return `${c} - ${name || 'Sin nombre'}`;
};

// Formato moneda
const formatMoney = (num) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(num || 0)
}

const togglePrivate = () => {
  privateContent.value = !privateContent.value
}

const imprimirPDF = async () => {
  if (process.client) {
    loadingImprimir.value = true;

    const html2pdf = (await import('html2pdf.js')).default;

    if (contentRef.value && cotizacion.value) {
      const options = {
        margin: [0, 0, 0, 0],
        image: { type: 'png', quality: 1.0 },
        html2canvas: { scale: 4, logging: false, useCORS: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] }
      };

      html2pdf()
        .set(options)
        .from(contentRef.value)
        .toPdf()
        .get('pdf')
        .then(pdf => {
          const pageCount = pdf.internal.getNumberOfPages();

          // === FOOTER PÁGINAS ===
          for (let i = 1; i <= pageCount; i++) {
            pdf.setPage(i);

            const y = pdf.internal.pageSize.height - 15;
            const x = 10;
            const pageWidth = pdf.internal.pageSize.width;
            const rightMargin = 10;

            pdf.setFontSize(8);
            pdf.setLineWidth(0.2);
            pdf.line(x, y - 5, pageWidth - rightMargin, y - 5);

            pdf.text('Sede principal Cra 47 # 8c-94 | PBX: (602) 511 02 00', x, y);
            pdf.text('Cali - Colombia', x, y + 3);

            pdf.text(`Página ${i} de ${pageCount}`, pageWidth - rightMargin, y + 3, { align: 'right' });
          }

          // Convertir a blob y abrir ventana de impresión
          const pdfBlob = pdf.output('blob');
          const url = URL.createObjectURL(pdfBlob);

          const printWindow = window.open(url);
          if (printWindow) {
            setTimeout(() => {
              printWindow.print();
            }, 500);
          }
        })
        .finally(() => {
          loadingImprimir.value = false;
        });

    } else {
      console.error("No se encontró el contenido o la cotización.");
      loadingImprimir.value = false;
    }
  }
};

const descargarPDF = async () => {
  if (process.client) {

    loadingDescargar.value = true;
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
    loadingDescargar.value = false;
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
          <p><strong>{{ cotizacion?.tipo_gestion == 'cotización' ? 'Cotización' : 'Codificación' }} N°:</strong> {{
            cotizacion?.codigo }}</p>
          <p><strong>Médico:</strong> {{ cotizacion?.medico?.nombre }}</p>
          <p><strong>Entidad:</strong> <span class="text-[12px]">{{ cotizacion?.entidad?.nombre }}</span> </p>
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
      <!-- HANQ, DP, null -->
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
          <tr v-if="privateContent" v-for="item in itemsAgrupados" :key="item.id">
            <td class="border px-2 py-2">{{ item.codigo }}</td>
            <td class="border px-2 py-2">{{ item.nombre }}</td>
            <td class="border px-2 py-2">{{ item.lateralidad }}</td>
            <td class="border px-2 py-2 text-right">{{ formatMoney(item.valor) }}</td>
          </tr>
          <tr v-if="!privateContent" v-for="item in cotizacion?.items" :key="item.id">
            <td class="border px-2 py-2">{{ item.codigo }}</td>
            <td class="border px-2 py-2">{{ item.nombre }}</td>
            <td class="border px-2 py-2">{{ item.lateralidad }}</td>
            <td class="border px-2 py-2 text-right">{{ formatMoney(item.valor) }}</td>
          </tr>
        </tbody>
      </table>

      <!-- Agrupado por concepto -->
      <div v-if="!privateContent">
        <h2 class="text-base font-bold mb-2">AGRUPADO POR CONCEPTO</h2>
        <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
          <thead class="bg-[#172983] text-white">
            <tr>
              <th class="border px-2 py-2">Concepto</th>
              <th class="border px-2 py-2 text-right">Valor Total</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="c in agrupadoPorConcepto" :key="c.concepto">
              <td class="border px-2 py-2">{{ getConceptoLabel(c.concepto, c.connom) }}</td>
              <td class="border px-2 py-2 text-right">{{ formatMoney(c.total) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-if="privateContent && (detallesAgrupados.insumos.length > 0 || detallesAgrupados.lentes.length > 0)">
        <!-- Insumos (agregados) -->
        <template v-if="detallesAgrupados.insumos.length > 0">
          <h2 class="text-base font-bold mb-2">INSUMOS</h2>
          <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
            <thead class="bg-[#172983] text-white">
              <tr>
                <th class="border px-2 py-2">Descripción</th>
                <th class="border px-2 py-2 text-center">Cantidad Total</th>
                <th class="border px-2 py-2 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-400 px-2 py-2 font-semibold">Insumos</td>
                <td class="border border-gray-400 px-2 py-2 text-center font-semibold">{{ totalCantidadInsumos }}</td>
                <td class="border border-gray-400 px-2 py-2 text-right font-semibold">
                  {{ formatMoney(totalInsumos) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>

        <!-- Lentes (agregados) -->
        <template v-if="detallesAgrupados.lentes.length > 0">
          <h2 class="text-base font-bold mb-2">LENTES</h2>
          <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
            <thead class="bg-[#172983] text-white">
              <tr>
                <th class="border px-2 py-2">Descripción</th>
                <th class="border px-2 py-2 text-center">Cantidad Total</th>
                <th class="border px-2 py-2 text-right">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td class="border border-gray-400 px-2 py-2 font-semibold">Lentes</td>
                <td class="border border-gray-400 px-2 py-2 text-center font-semibold">{{ totalCantidadLentes }}</td>
                <td class="border border-gray-400 px-2 py-2 text-right font-semibold">
                  {{ formatMoney(totalLentes) }}
                </td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>

      <!-- Insumos -->
      <div v-if="!privateContent && (detallesAgrupados.insumos.length > 0 || detallesAgrupados.lentes.length > 0)">
        <template v-if="detallesAgrupados.insumos.length > 0">
          <h2 class="text-base font-bold mb-2">INSUMOS</h2>
          <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
            <thead class="bg-[#172983] text-white">
              <tr>
                <th class="border px-2 py-2">Código</th>
                <th class="border px-2 py-2">Nombre</th>
                <th class="border px-2 py-2">Tipo</th>
                <th class="border px-2 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detalle in detallesAgrupados.insumos" :key="detalle.id">
                <td class="border border-gray-400 px-2 py-2">{{ detalle.codigo }}</td>
                <td class="border border-gray-400 px-2 py-2">{{ detalle.nombre }}</td>
                <td class="border border-gray-400 px-2 py-2">(Insumo)</td>
                <td class="border border-gray-400 px-2 py-2 text-right">{{ formatMoney(detalle.valor) }}</td>
              </tr>
            </tbody>
          </table>
        </template>

        <template v-if="detallesAgrupados.lentes.length > 0">
          <h2 class="text-base font-bold mb-2">LENTES</h2>
          <table class="w-full border-collapse border border-gray-400 text-sm mb-6">
            <thead class="bg-[#172983] text-white">
              <tr>
                <th class="border px-2 py-2">Código</th>
                <th class="border px-2 py-2">Nombre</th>
                <th class="border px-2 py-2">Tipo</th>
                <th class="border px-2 py-2 text-right">Valor</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="detalle in detallesAgrupados.lentes" :key="detalle.id">
                <td class="border border-gray-400 px-2 py-2">{{ detalle.codigo }}</td>
                <td class="border border-gray-400 px-2 py-2">{{ detalle.nombre }}</td>
                <td class="border border-gray-400 px-2 py-2">(Lente)</td>
                <td class="border border-gray-400 px-2 py-2 text-right">{{ formatMoney(detalle.valor) }}</td>
              </tr>
            </tbody>
          </table>
        </template>
      </div>
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
        <p class="text-sm">{{ cotizacion?.observaciones || 'Ninguna' }}</p>
      </div>

      <!-- Inclusiones -->
      <!-- <div class="mb-8">
      <h2 class="text-lg font-bold">Inclusiones</h2>
      <p>{{ cotizacion?.inclusiones || 'Ninguna' }}</p>
    </div> -->
      <!-- Pie de página -->
      <div class="flex flex-col items-start leading-none mt-20 text-sm text-gray-700">
        <p class="mb-1 font-semibold text-xl">{{ cotizacion?.asesor?.name }}</p>
        <p>Asesor barra SAI</p>
        <p>Email: {{ cotizacion?.asesor?.email }}</p>
      </div>
    </div>

    <div class="py-6 px-6 bg-white text-black max-w-5xl mx-auto">
      <div class="inline-flex items-center">
        <label class="relative flex cursor-pointer items-center rounded-full p-3" for="login" data-ripple-dark="true">
          <input id="login" type="checkbox"
            class="before:content[''] peer relative h-5 w-5 cursor-pointer appearance-none rounded-md border border-blue-400 transition-all before:absolute before:top-2/4 before:left-2/4 before:block before:h-12 before:w-12 before:-translate-y-2/4 before:-translate-x-2/4 before:rounded-full before:bg-blue-gray-500 before:opacity-0 before:transition-opacity checked:border-blue-500 checked:bg-blue-500 checked:before:bg-blue-500 hover:before:opacity-10"
            v-model="private" @change="togglePrivate" />
          <div
            class="pointer-events-none absolute top-2/4 left-2/4 -translate-y-2/4 -translate-x-2/4 text-white opacity-0 transition-opacity peer-checked:opacity-100">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor"
              stroke="currentColor" stroke-width="1">
              <path fill-rule="evenodd"
                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                clip-rule="evenodd"></path>
            </svg>
          </div>
        </label>
        <label class="mt-px cursor-pointer select-none font-light text-gray-700" for="login">
          Imprimir información de la <span class="font-bold ">{{ cotizacion?.tipo_gestion == 'cotización' ? 'cotización'
            : 'codificación' }} </span> para el paciente
        </label>
      </div>
    </div>
    <!-- Botón imprimir -->
    <div class="mt-6 text-center print:hidden flex justify-center gap-4">
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded" @click="imprimirPDF" :disabled="loadingImprimir">
        <span v-if="loadingImprimir">Imprimiendo...</span>
        <span v-else>🖨 Imprimir</span>
      </button>
      <button class="flex justify-center items-center gap-2 mt-4 px-4 py-2 bg-green-600 text-white rounded"
        v-tippy="{ content: 'Muy pronto, estamos en construcción' }">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
          <path fill="currentColor"
            d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12v1.45q0 1.475-1.012 2.513T18.5 17q-.875 0-1.65-.375t-1.3-1.075q-.725.725-1.638 1.088T12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12v1.45q0 .65.425 1.1T18.5 15t1.075-.45t.425-1.1V12q0-3.35-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20h4q.425 0 .713.288T17 21t-.288.713T16 22zm0-7q1.25 0 2.125-.875T15 12t-.875-2.125T12 9t-2.125.875T9 12t.875 2.125T12 15" />
        </svg>
        Correo electrónico
      </button>
      <button class="flex justify-center items-center gap-2 bg-red-600 text-white mt-4 px-4 py-2 rounded"
        @click="descargarPDF" :disabled="loadingDescargar">
        <template v-if="!loadingDescargar">
          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
            viewBox="0 0 24 24"><!-- Icon from Material Design Icons by Pictogrammers - https://github.com/Templarian/MaterialDesign/blob/master/LICENSE -->
            <path
              d="M14 2l6 6v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h8m4 18V9h-5V4H6v16h12m-7.08-7.69c-.24-.77-.77-3.23.63-3.27c1.4-.04.48 3.12.48 3.12c.39 1.49 2.02 2.56 2.02 2.56c.5-.15 3.35-.48 2.95 1c-.43 1.48-3.5.09-3.5.09c-1.95.14-3.41.66-3.41.66c-1.13 2.11-2.45 3.03-2.99 2.14c-.67-1.11 2.13-2.54 2.13-2.54c1.45-2.35 1.67-3.72 1.69-3.76m.65.84c-.4 1.3-1.2 2.69-1.2 2.69c.85-.34 2.71-.73 2.71-.73c-1.14-1-1.49-1.95-1.51-1.96m3.14 2.17s1.75.65 1.79.39c.07-.27-1.33-.51-1.79-.39m-5.66 1.49c-.77.3-1.51 1.58-1.33 1.58c.18.01.91-.6 1.33-1.58m2.52-5.55c0-.05.43-1.68 0-1.73c-.3-.03-.01 1.69 0 1.73z"
              fill="currentColor" />
          </svg>
          Descargar PDF
        </template>
        <template v-else>
          <svg class="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
            <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
          </svg>
          Generando PDF...
        </template>
      </button>
    </div>
  </div>
</template>
