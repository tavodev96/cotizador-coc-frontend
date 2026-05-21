<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons, push } from 'notivue'
import tippy from 'tippy.js';
import 'tippy.js/dist/tippy.css';
import { PDFDocument } from 'pdf-lib'

const route = useRoute()
const cotizacion = ref(null)
const contentRef = ref(null)
const loading = ref(true)
const loadingDescargar = ref(false)
const loadingImprimir = ref(false)
const imprimirParaPaciente = ref(false)
const imprimirParaPacienteDetallada = ref(false)

// Detectar si viene desde la página de consultas
const modoConsulta = computed(() => route.query.modo === 'consulta')
const activarPacienteDesdeCodificacion = computed(() => route.query.paciente === '1' || route.query.origen === 'codificacion')

const esCodificacion = computed(() => cotizacion.value?.tipo_gestion === 'codificación')
const esCotizacion = computed(() => cotizacion.value?.tipo_gestion === 'cotización')
const modoPaciente = computed(() => imprimirParaPaciente.value || imprimirParaPacienteDetallada.value || modoConsulta.value)
const modoPacienteResumen = computed(() => imprimirParaPaciente.value && !imprimirParaPacienteDetallada.value)
const modoPacienteDetallado = computed(() => !modoConsulta.value && imprimirParaPacienteDetallada.value)

const modoActivoLabel = computed(() => {
  if (modoConsulta.value) {
    return 'Modo activo: Consulta (paciente detallada de insumos y lentes)'
  }

  if (imprimirParaPacienteDetallada.value) {
    return 'Modo activo: Paciente detallada'
  }

  if (imprimirParaPaciente.value) {
    return 'Modo activo: Paciente resumida'
  }

  return 'Modo activo: Interno'
})

const TEXTOS_EXCLUIDOS_CODIFICACION = [
  'honorarios cirujano'
]

onMounted(async () => {
  // Si viene desde consultas, activar modo privado automáticamente
  if (modoConsulta.value) {
    imprimirParaPaciente.value = false
    imprimirParaPacienteDetallada.value = false
  } else if (activarPacienteDesdeCodificacion.value) {
    imprimirParaPaciente.value = true
    imprimirParaPacienteDetallada.value = false
  }

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
  const notification = typeof type === 'object' ? type : { type, message, title }
  const notify = push[notification.type] || push.error

  notify({
    title: notification.title,
    message: notification.message,
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

const procedimientosPaciente = computed(() => {
  if (!cotizacion.value?.items) return [];

  const gruposFiltrados = new Map();
  const gruposBase = new Map();

  cotizacion.value.items.forEach(item => {
    const nombre = `${item.nombre || ''}`.toLowerCase();
    const connom = `${item.connom || ''}`.toLowerCase();
    const nombreFinal = item.nombre || item.connom || 'Sin nombre';
    const lateralidadFinal = item.lateralidad || '-';
    const key = `${item.codigo || ''}`;

    if (!gruposBase.has(key)) {
      gruposBase.set(key, {
        codigo: item.codigo || '-',
        nombre: nombreFinal,
        lateralidad: lateralidadFinal
      });
    }

    const excluirPorCodificacion = esCodificacion.value && TEXTOS_EXCLUIDOS_CODIFICACION.some((texto) =>
      nombre.includes(texto) || connom.includes(texto)
    );

    if (excluirPorCodificacion) {
      return;
    }

    if (!gruposFiltrados.has(key)) {
      gruposFiltrados.set(key, {
        codigo: item.codigo || '-',
        nombre: nombreFinal,
        lateralidad: lateralidadFinal
      });
    }
  });

  if (gruposFiltrados.size > 0) {
    return Array.from(gruposFiltrados.values());
  }

  return Array.from(gruposBase.values());
});

const detallesAgrupados = computed(() => {
  if (!cotizacion.value?.detalles) return { insumos: [], lentes: [] };

  const insumos = new Map();
  const lentes = new Map();

  cotizacion.value.detalles.forEach(detalle => {
    const tipo = detalle.tipo === 'L' ? lentes : insumos;
    const cantidadRegistro = Number(detalle.cantidad || 1)
    const valorUnitario = Number(detalle.valor || 0)
    const valorTotalRegistro = valorUnitario * cantidadRegistro
    const key = `${detalle.codigo || ''}-${detalle.nombre || ''}`

    if (!tipo.has(key)) {
      tipo.set(key, {
        ...detalle,
        valor_unitario: valorUnitario,
        valor_total: valorTotalRegistro,
        cantidad: cantidadRegistro
      });
    } else {
      const item = tipo.get(key);
      item.valor_total += valorTotalRegistro;
      item.cantidad += cantidadRegistro;
    }
  });

  return {
    insumos: Array.from(insumos.values()),
    lentes: Array.from(lentes.values())
  };
});

const detallesDesglosados = computed(() => {
  const detalles = Array.isArray(cotizacion.value?.detalles) ? cotizacion.value.detalles : []

  const mapDetalle = (detalle) => {
    const cantidad = Number(detalle.cantidad || 1)
    const valorUnitario = Number(detalle.valor || 0)

    return {
      ...detalle,
      cantidad,
      valor_unitario: valorUnitario,
      valor_total: valorUnitario * cantidad,
    }
  }

  return {
    insumos: detalles.filter((d) => d.tipo !== 'L').map(mapDetalle),
    lentes: detalles.filter((d) => d.tipo === 'L').map(mapDetalle),
  }
})

// Totales
const totalInsumos = computed(() => {
  return detallesAgrupados.value.insumos.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
});

const totalLentes = computed(() => {
  return detallesAgrupados.value.lentes.reduce((sum, item) => sum + Number(item.valor_total || 0), 0);
});

const valorLentesCodificacion = computed(() => {
  const sumaLentesDetalle = Number(totalLentes.value || 0)
  if (sumaLentesDetalle > 0) {
    return sumaLentesDetalle
  }

  const codificacion = cotizacion.value?.codificacion || {}
  return Number(codificacion.lente ?? codificacion.lentes ?? 0)
})

const totalCantidadInsumos = computed(() => {
  return detallesAgrupados.value.insumos.reduce((sum, item) => sum + item.cantidad, 0);
});

const totalCantidadLentes = computed(() => {
  return detallesAgrupados.value.lentes.reduce((sum, item) => sum + item.cantidad, 0);
});

const toNumber = (value) => Number(value || 0)

const totalBaseCodificacion = computed(() => {
  if (!esCodificacion.value) return 0

  const codificacion = cotizacion.value?.codificacion || {}

  return (
    toNumber(codificacion.copago) +
    toNumber(codificacion.excedente_tope) +
    toNumber(valorLentesCodificacion.value) +
    toNumber(codificacion.pre_anestesia) +
    toNumber(codificacion.otros_costos)
  )
})

const totalMostrado = computed(() => {
  if (!esCodificacion.value) {
    return toNumber(cotizacion.value?.total)
  }

  // En codificación se imprime exclusivamente el total de codificación (sin sumar valor del procedimiento).
  return totalBaseCodificacion.value
})

const fechaHoraCreacion = computed(() => {
  const value = cotizacion.value?.created_at
  if (!value) return 'Fecha no disponible'

  const fecha = new Date(value)
  if (Number.isNaN(fecha.getTime())) return String(value)

  // timeStyle: 'short',
  return new Intl.DateTimeFormat('es-CO', {
    dateStyle: 'long',
  }).format(fecha)
})

const formatDate = (value) => {
  if (!value) return 'N/A'
  const fecha = new Date(value)
  if (Number.isNaN(fecha.getTime())) return 'N/A'
  const dia = String(fecha.getDate()).padStart(2, '0')
  const mes = String(fecha.getMonth() + 1).padStart(2, '0')
  const anio = fecha.getFullYear()
  return `${dia}/${mes}/${anio}`
}

const fechaAutorizacion = computed(() => formatDate(cotizacion.value?.codificacion?.fecha_autorizacion))
const fechaVigenciaCodificacion = computed(() => formatDate(cotizacion.value?.codificacion?.fecha_vigencia))

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
  if (c === 'HMLA' || /HONORARIOS/i.test(name)) return 'HMLA - Honorarios Medicos Laser';
  if (c === 'LASH' || /LASER/i.test(name)) return 'LASH - Derechos Clínicos';
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

const toggleImprimirPaciente = () => {
  imprimirParaPaciente.value = !imprimirParaPaciente.value
  if (imprimirParaPaciente.value) {
    imprimirParaPacienteDetallada.value = false
  }
}

const toggleImprimirPacienteDetallada = () => {
  imprimirParaPacienteDetallada.value = !imprimirParaPacienteDetallada.value
  if (imprimirParaPacienteDetallada.value) {
    imprimirParaPaciente.value = false
  }
}

const mmToPx = (mm) => (mm * 96) / 25.4

const applySinglePageScale = () => {
  const el = contentRef.value
  if (!el) return () => {}

  const originalStyles = {
    transform: el.style.transform,
    transformOrigin: el.style.transformOrigin,
    width: el.style.width,
  }

  // Reservamos espacio para el footer que se dibuja en el PDF.
  const availableHeightPx = mmToPx(278)
  const contentHeightPx = el.scrollHeight
  const scaleByHeight = Math.min(1, availableHeightPx / Math.max(1, contentHeightPx))
  // Factor de seguridad para evitar que el redondeo de html2canvas/jsPDF cree una página extra.
  const scale = Math.min(0.92, scaleByHeight * 0.98)

  if (scale < 1) {
    el.style.transform = `scale(${scale})`
    el.style.transformOrigin = 'top left'
    el.style.width = `${100 / scale}%`
  }

  return () => {
    el.style.transform = originalStyles.transform
    el.style.transformOrigin = originalStyles.transformOrigin
    el.style.width = originalStyles.width
  }
}

const renderContentCanvas = async (html2canvas) => {
  const el = contentRef.value
  const originalBackground = el.style.backgroundColor

  // El fondo transparente permite que la plantilla PDF siga siendo visible.
  el.style.backgroundColor = 'transparent'

  try {
    return await html2canvas(el, {
      scale: 3,
      useCORS: true,
      logging: false,
      backgroundColor: null
    })
  } finally {
    el.style.backgroundColor = originalBackground
  }
}

const createCanvasSlice = (canvas, sourceY, sourceHeight) => {
  const slice = document.createElement('canvas')
  slice.width = canvas.width
  slice.height = sourceHeight

  const context = slice.getContext('2d')
  context.drawImage(
    canvas,
    0,
    sourceY,
    canvas.width,
    sourceHeight,
    0,
    0,
    canvas.width,
    sourceHeight
  )

  return slice
}

const buildPdfOnTemplate = async (html2canvas) => {
  const canvas = await renderContentCanvas(html2canvas)
  const templateResponse = await fetch('/report-template.pdf')

  if (!templateResponse.ok) {
    throw new Error('No se pudo cargar la plantilla report-template.pdf')
  }

  const templateBytes = await templateResponse.arrayBuffer()
  const templatePdf = await PDFDocument.load(templateBytes)
  const pdfDoc = await PDFDocument.create()
  const [firstTemplatePage] = await pdfDoc.copyPages(templatePdf, [0])
  const pageWidth = firstTemplatePage.getWidth()
  const pageHeight = firstTemplatePage.getHeight()

  const marginX = 28
  const marginTop = 112
  const marginBottom = 58
  const drawWidth = pageWidth - (marginX * 2)
  const drawAreaHeight = pageHeight - marginTop - marginBottom
  const sliceHeightPx = Math.floor((canvas.width * drawAreaHeight) / drawWidth)

  let sourceY = 0

  while (sourceY < canvas.height) {
    const currentSliceHeight = Math.min(sliceHeightPx, canvas.height - sourceY)
    const pageSlice = createCanvasSlice(canvas, sourceY, currentSliceHeight)
    const pageImage = await pdfDoc.embedPng(pageSlice.toDataURL('image/png'))
    const drawHeight = (currentSliceHeight * drawWidth) / canvas.width
    const [page] = await pdfDoc.copyPages(templatePdf, [0])

    pdfDoc.addPage(page)
    page.drawImage(pageImage, {
      x: marginX,
      y: pageHeight - marginTop - drawHeight,
      width: drawWidth,
      height: drawHeight
    })

    sourceY += currentSliceHeight
  }

  return await pdfDoc.save()
}

const imprimirPDF = async () => {
  if (process.client) {
    loadingImprimir.value = true;

    try {
      const html2canvas = (await import('html2canvas')).default;

      if (contentRef.value && cotizacion.value) {
        const pdfBytes = await buildPdfOnTemplate(html2canvas)
        const blob = new Blob([pdfBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const printWindow = window.open(url);
        if (printWindow) {
          setTimeout(() => {
            printWindow.print();
          }, 500);
        }
        
        
        // Cargar y agregar la plantilla PDF como fondo
        
        
        // Convertir la página de la plantilla a imagen
        

        // Posicionar el contenido con márgenes apropiados
        

        // Abrir en ventana de impresión
      } else {
        console.error("No se encontró el contenido o la cotización.");
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      pushNotification('error', 'Error al generar el PDF.');
    } finally {
      loadingImprimir.value = false;
    }
  }
};

const descargarPDF = async () => {
  if (process.client) {
    loadingDescargar.value = true;

    try {
      const html2canvas = (await import('html2canvas')).default;

      if (contentRef.value && cotizacion.value) {
        const pdfBytes = await buildPdfOnTemplate(html2canvas)
        const blob = new Blob([pdfBytes], { type: 'application/pdf' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')

        link.href = url
        link.download = `Cotizacion_${cotizacion.value.codigo || 'nueva'}.pdf`
        link.click()
        URL.revokeObjectURL(url)
        

        // Posicionar el contenido con márgenes apropiados
      } else {
        console.error("No se encontró el contenido o la cotización.");
      }
    } catch (error) {
      console.error('Error generando PDF:', error);
      pushNotification('error', 'Error al generar el PDF.');
    } finally {
      loadingDescargar.value = false;
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
    <div class="bg-white text-black p-6 text-sm" ref="contentRef" style="width: 210mm; height: auto; margin: 0 auto; font-family: Arial, sans-serif;">
      <!-- Datos del paciente -->
      <div class="grid grid-cols-2 gap-6 mb-4" style="font-size: 12px; line-height: 1.4;">
        <div>
          <p style="margin: 2px 0;"><strong>Paciente:</strong> {{ cotizacion?.paciente?.nombre_completo }}</p>
          <p style="margin: 2px 0;"><strong>Tipo de Documento:</strong> {{ cotizacion?.paciente?.tipo_identificacion }}</p>
          <p style="margin: 2px 0;"><strong>Número de Documento:</strong> {{ cotizacion?.paciente?.numero_identificacion }}</p>
          <p style="margin: 2px 0;"><strong>Correo:</strong> {{ cotizacion?.paciente?.correo }}</p>
          <p style="margin: 2px 0;"><strong>Teléfono:</strong> {{ cotizacion?.paciente?.telefono }}</p>
        </div>
        <div>
          
          
          <p style="margin: 2px 0;"><strong>Fecha de Creación:</strong> {{ fechaHoraCreacion }}</p>
          <p style="margin: 2px 0;"><strong>Médico:</strong> {{ cotizacion?.medico?.nombre }}</p>
          <p style="margin: 2px 0;"><strong>Entidad:</strong> {{ cotizacion?.entidad?.nombre }}</p>
          <p style="margin: 2px 0;" v-if="esCodificacion"><strong>Fecha de Autorización:</strong> {{ fechaAutorizacion }}</p>
          <p style="margin: 2px 0;" v-if="esCodificacion"><strong>Fecha de Vigencia:</strong> {{ fechaVigenciaCodificacion }}</p>
        </div>
      </div>
      <hr class="mb-4" />
      <template v-if="esCodificacion && modoPaciente">
        <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">PROCEDIMIENTO</h2>
        <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 16px;">
          <thead class="bg-[#1570b1] text-white">
            <tr>
              <th class="border px-2 py-1" style="padding: 6px 4px;">CUPS</th>
              <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
              <th class="border px-2 py-1" style="padding: 6px 4px;">Lateralidad</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(item, idx) in procedimientosPaciente" :key="`paciente-codif-${idx}`">
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.codigo }}</td>
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.nombre }}</td>
              <td class="border px-2 py-1 capitalize" style="padding: 4px;">{{ item.lateralidad }}</td>
            </tr>
          </tbody>
        </table>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-bottom: 24px;">
          <div>
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">VALORES DE CODIFICACIÓN</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px;">
              <tbody>
                <tr>
                  <td class="border px-2 py-1 font-semibold bg-gray-50" style="padding: 4px;">Copago</td>
                  <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(cotizacion?.codificacion?.copago) }}</td>
                </tr>
                <tr>
                  <td class="border px-2 py-1 font-semibold bg-gray-50" style="padding: 4px;">Excedente tope</td>
                  <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(cotizacion?.codificacion?.excedente_tope) }}</td>
                </tr>
                <tr>
                  <td class="border px-2 py-1 font-semibold bg-gray-50" style="padding: 4px;">Lente</td>
                  <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(valorLentesCodificacion) }}</td>
                </tr>
                <tr>
                  <td class="border px-2 py-1 font-semibold bg-gray-50" style="padding: 4px;">Preanestesia</td>
                  <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(cotizacion?.codificacion?.pre_anestesia) }}</td>
                </tr>
                <tr>
                  <td class="border px-2 py-1 font-semibold bg-gray-50" style="padding: 4px;">Otros</td>
                  <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(cotizacion?.codificacion?.otros_costos) }}</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div>
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">OBSERVACIONES</h2>
            <div class="border border-gray-400 rounded-sm p-3" style="border: 1px solid #ccc; padding: 8px; min-height: 120px; font-size: 11px;">
              <p style="white-space: pre-line; margin: 0;">{{ cotizacion?.observaciones || 'Ninguna' }}</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Procedimientos -->
        <!-- HANQ, DP, null -->
        <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">PROCEDIMIENTO</h2>
        <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
          <thead class="bg-[#1570b1] text-white">
            <tr>
              <th class="border px-2 py-1" style="padding: 6px 4px;">CUPS</th>
              <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
              <th class="border px-2 py-1" style="padding: 6px 4px;">Lateralidad</th>
              <th v-if="!modoConsulta" class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor</th>
            </tr>
          </thead>
          <tbody>
            <!-- Modo consulta: mostrar agrupado sin valores -->
            <tr v-if="modoConsulta" v-for="(item, idx) in itemsAgrupados" :key="`consulta-${idx}`">
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.codigo }}</td>
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.nombre }}</td>
              <td class="border px-2 py-1 capitalize" style="padding: 4px;">{{ item.lateralidad }}</td>
            </tr>
            <!-- Modo privado: mostrar agrupado con valores -->
            <tr v-else-if="modoPaciente" v-for="(item, idx) in itemsAgrupados" :key="`privado-${idx}`">
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.codigo }}</td>
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.nombre }}</td>
              <td class="border px-2 py-1 capitalize" style="padding: 4px;">{{ item.lateralidad }}</td>
              <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(item.valor) }}</td>
            </tr>
            <!-- Modo normal: mostrar todos los items con valores -->
            <tr v-else v-for="(item, idx) in cotizacion?.items" :key="`normal-${idx}`">
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.codigo }}</td>
              <td class="border px-2 py-1" style="padding: 4px;">{{ item.nombre }}</td>
              <td class="border px-2 py-1 capitalize" style="padding: 4px;">{{ item.lateralidad }}</td>
              <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(item.valor) }}</td>
            </tr>
          </tbody>
        </table>

        <!-- Agrupado por concepto (mostrar en modo normal y modo consulta) -->
        <div v-if="!modoPaciente || modoConsulta">
          <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">AGRUPADO POR CONCEPTO</h2>
          <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
            <thead class="bg-[#1570b1] text-white">
              <tr>
                <th class="border px-2 py-1" style="padding: 6px 4px;">Concepto</th>
                <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor Total</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="c in agrupadoPorConcepto" :key="c.concepto">
                <td class="border px-2 py-1" style="padding: 4px;">{{ getConceptoLabel(c.concepto, c.connom) }}</td>
                <td class="border px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(c.total) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-if="modoPacienteResumen && !modoConsulta && (detallesAgrupados.insumos.length > 0 || detallesAgrupados.lentes.length > 0)">
          <!-- Insumos (agregados con valores) -->
          <template v-if="detallesAgrupados.insumos.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">INSUMOS</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Descripción</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad Total</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-gray-400 px-2 py-1 font-semibold" style="padding: 4px;">Insumos</td>
                  <td class="border border-gray-400 px-2 py-1 font-semibold" style="padding: 4px;">Insumos</td>
                  <td class="border border-gray-400 px-2 py-1 text-center font-semibold" style="padding: 4px;">{{ totalCantidadInsumos }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right font-semibold" style="padding: 4px;">
                    {{ formatMoney(totalInsumos) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>

          <!-- Lentes (agregados con valores) -->
          <template v-if="detallesAgrupados.lentes.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">LENTES</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Descripción</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad Total</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor Total</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td class="border border-gray-400 px-2 py-1 font-semibold" style="padding: 4px;">Lentes</td>
                  <td class="border border-gray-400 px-2 py-1 text-center font-semibold" style="padding: 4px;">{{ totalCantidadLentes }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right font-semibold" style="padding: 4px;">
                    {{ formatMoney(totalLentes) }}
                  </td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>

        <div v-if="(modoPacienteDetallado || modoConsulta) && (detallesDesglosados.insumos.length > 0 || detallesDesglosados.lentes.length > 0)">
          <template v-if="detallesDesglosados.insumos.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">INSUMOS</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Código</th>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detalle in detallesDesglosados.insumos" :key="`pac-det-ins-${detalle.id || detalle.codigo}-${detalle.nombre}`">
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.codigo }}</td>
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.nombre }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center" style="padding: 4px;">{{ detalle.cantidad }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(detalle.valor_total) }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <template v-if="detallesDesglosados.lentes.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">LENTES</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Código</th>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detalle in detallesDesglosados.lentes" :key="`pac-det-len-${detalle.id || detalle.codigo}-${detalle.nombre}`">
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.codigo }}</td>
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.nombre }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center" style="padding: 4px;">{{ detalle.cantidad }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(detalle.valor_total) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>

        <!-- Insumos y Lentes detallados (modo normal) -->
        <div v-if="!modoPaciente && !modoConsulta && (detallesDesglosados.insumos.length > 0 || detallesDesglosados.lentes.length > 0)">
          <template v-if="detallesDesglosados.insumos.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">INSUMOS</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Código</th>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detalle in detallesDesglosados.insumos" :key="detalle.id || `${detalle.codigo}-${detalle.nombre}`">
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.codigo }}</td>
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.nombre }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center" style="padding: 4px;">{{ detalle.cantidad }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(detalle.valor_total) }}</td>
                </tr>
              </tbody>
            </table>
          </template>

          <template v-if="detallesDesglosados.lentes.length > 0">
            <h2 style="font-size: 14px; font-weight: bold; margin: 8px 0 6px 0;">LENTES</h2>
            <table class="w-full border-collapse border border-gray-400" style="font-size: 11px; margin-bottom: 24px;">
              <thead class="bg-[#1570b1] text-white">
                <tr>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Código</th>
                  <th class="border px-2 py-1" style="padding: 6px 4px;">Nombre</th>
                  <th class="border px-2 py-1 text-center" style="padding: 6px 4px;">Cantidad</th>
                  <th class="border px-2 py-1 text-right" style="padding: 6px 4px;">Valor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="detalle in detallesDesglosados.lentes" :key="detalle.id || `${detalle.codigo}-${detalle.nombre}`">
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.codigo }}</td>
                  <td class="border border-gray-400 px-2 py-1" style="padding: 4px;">{{ detalle.nombre }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-center" style="padding: 4px;">{{ detalle.cantidad }}</td>
                  <td class="border border-gray-400 px-2 py-1 text-right" style="padding: 4px;">{{ formatMoney(detalle.valor_total) }}</td>
                </tr>
              </tbody>
            </table>
          </template>
        </div>
      </template>
      <p style="text-align: right; font-weight: bold; margin-bottom: 16px; font-size: 12px;">
        {{ esCodificacion ? 'VALOR TOTAL:' : 'VALOR TOTAL DEL PROCEDIMIENTO:' }} {{ formatMoney(totalMostrado) }}
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
      <div v-if="!(esCodificacion && modoPaciente)" class="mb-4">
        <h2 class="text-lg font-bold">Observaciones</h2>
        <p class="text-sm">{{ cotizacion?.observaciones || 'Ninguna' }}</p>
      </div>

      <div>
        <strong>Asesor:</strong> {{ cotizacion?.asesor.name }}
        <br>
        <strong>SAI:</strong> 315 6671052
        <br>
        <strong>Correo SAI: </strong> {{ cotizacion?.asesor.email }}
      </div>

      <!-- Inclusiones -->
      <!-- <div class="mb-8">
      <h2 class="text-lg font-bold">Inclusiones</h2>
      <p>{{ cotizacion?.inclusiones || 'Ninguna' }}</p>
    </div> -->
    </div>

    <div class="mt-2 py-6 px-6 bg-white text-black max-w-5xl mx-auto">
      <div v-if="esCodificacion" class="inline-flex items-center gap-3">
        <button class="px-4 py-2 rounded text-white" :class="modoPaciente ? 'bg-[#162983]' : 'bg-gray-500'"
          @click="toggleImprimirPaciente" :disabled="modoConsulta">
          {{ modoPaciente ? 'Imprimir para paciente: Activo' : 'Imprimir para paciente' }}
        </button>
        <span class="text-sm" :class="modoConsulta ? 'text-blue-600' : 'text-gray-700'">
          <template v-if="modoConsulta">Modo consulta activado automáticamente</template>
          <template v-else>Si está activo, se muestra versión resumida para paciente</template>
        </span>
      </div>

      <div v-else-if="esCotizacion" class="inline-flex items-center">
        <div class="inline-flex items-center gap-3 flex-wrap">
          <!-- <button
            class="px-4 py-2 rounded text-white"
            :class="imprimirParaPaciente && !imprimirParaPacienteDetallada ? 'bg-[#162983]' : 'bg-gray-500'"
            @click="toggleImprimirPaciente"
            :disabled="modoConsulta"
          >
            Imprimir información de la cotización para el paciente
          </button> -->

          <button
            class="px-4 py-2 rounded text-white"
            :class="imprimirParaPacienteDetallada ? 'bg-indigo-700' : 'bg-gray-500'"
            @click="toggleImprimirPacienteDetallada"
            :disabled="modoConsulta"
          >
            Imprimir detallada
          </button>

          <span class="text-sm" :class="modoConsulta ? 'text-blue-600' : 'text-gray-700'">
            <template v-if="modoConsulta">Modo consulta activado automáticamente</template>
            <template v-else>Selecciona el modo de impresión para paciente que necesitas</template>
          </span>
        </div>
      </div>

      <div class="mt-3">
        <span class="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold bg-slate-100 text-slate-700">
          {{ modoActivoLabel }}
        </span>
      </div>
    </div>
    <!-- Botón imprimir -->
    <div class="mt-6 text-center print:hidden flex justify-center gap-4">
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded" @click="imprimirPDF" :disabled="loadingImprimir">
        <span v-if="loadingImprimir">Imprimiendo...</span>
        <span v-else>🖨 Imprimir</span>
      </button>
      <button v-if="!modoConsulta" class="flex justify-center items-center gap-2 mt-4 px-4 py-2 bg-green-600 text-white rounded"
        v-tippy="{ content: 'Muy pronto, estamos en construcción' }">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
          <path fill="currentColor"
            d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12v1.45q0 1.475-1.012 2.513T18.5 17q-.875 0-1.65-.375t-1.3-1.075q-.725.725-1.638 1.088T12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12v1.45q0 .65.425 1.1T18.5 15t1.075-.45t.425-1.1V12q0-3.35-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20h4q.425 0 .713.288T17 21t-.288.713T16 22zm0-7q1.25 0 2.125-.875T15 12t-.875-2.125T12 9t-2.125.875T9 12t.875 2.125T12 15" />
        </svg>
        Correo electrónico
      </button>
      <button v-if="!modoConsulta" class="flex justify-center items-center gap-2 bg-red-600 text-white mt-4 px-4 py-2 rounded"
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
