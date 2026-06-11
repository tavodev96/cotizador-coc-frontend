<script setup>
definePageMeta({
  middleware: ['sanctum:auth'],
});

import { Notivue, Notification, filledIcons, push } from 'notivue'
import { PDFDocument } from 'pdf-lib'

const route = useRoute()
const cotizacion = ref(null)
const contentRef = ref(null)
const loading = ref(true)
const loadingDescargar = ref(false)
const loadingImprimir = ref(false)
const loadingCorreo = ref(false)
const mostrarModalCorreo = ref(false)
const correoDestino = ref('')
const progresoCorreo = ref(0)
const imprimirParaPaciente = ref(false)
const imprimirParaPacienteDetallada = ref(false)
const verDetallado = ref(false)

// Detectar si viene desde la página de consultas
const modoConsulta = computed(() => route.query.modo === 'consulta')
const activarPacienteDesdeCodificacion = computed(() => route.query.paciente === '1' || route.query.origen === 'codificacion')

const esCodificacion = computed(() => cotizacion.value?.tipo_gestion === 'codificación')
const esCotizacion = computed(() => cotizacion.value?.tipo_gestion === 'cotización')
const tipoDocumentoLabel = computed(() => esCodificacion.value ? 'Codificación' : 'Cotización')
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
      correoDestino.value = cotizacion.value?.paciente?.correo || ''
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

const auxilioLenteCodificacion = computed(() => Number(cotizacion.value?.codificacion?.auxilio_lente ?? 0))

const valorLentesCodificacion = computed(() => {
  const sumaLentesDetalle = Number(totalLentes.value || 0)
  const baseLente = sumaLentesDetalle > 0 ? sumaLentesDetalle : Number(cotizacion.value?.codificacion?.lente ?? cotizacion.value?.codificacion?.lentes ?? 0)

  return Math.max(baseLente - auxilioLenteCodificacion.value, 0)
})

const totalCantidadInsumos = computed(() => {
  return detallesAgrupados.value.insumos.reduce((sum, item) => sum + item.cantidad, 0);
});

const totalCantidadLentes = computed(() => {
  return detallesAgrupados.value.lentes.reduce((sum, item) => sum + item.cantidad, 0);
});

const toNumber = (value) => Number(value || 0)

const polizaSeleccionada = computed(() => {
  const poliza = cotizacion.value?.poliza || null
  const valorPoliza = toNumber(poliza?.valor_poliza ?? cotizacion.value?.valor_poliza)
  const valorAsegurado = toNumber(poliza?.valor_asegurado ?? cotizacion.value?.valor_asegurado)

  if (!poliza && !cotizacion.value?.poliza_id && valorPoliza <= 0) return null

  return {
    nombre: poliza?.nombre || cotizacion.value?.nombre_poliza || 'Póliza',
    valor_asegurado: valorAsegurado,
    valor_poliza: valorPoliza,
  }
})
const polizaValor = computed(() => toNumber(polizaSeleccionada.value?.valor_poliza ?? cotizacion.value?.valor_poliza))
const mostrarValorProcedimiento = computed(() => verDetallado.value && !modoConsulta.value)
const procedimientosPrint = computed(() => {
  if (verDetallado.value && !modoConsulta.value && !modoPaciente.value) {
    return cotizacion.value?.items || []
  }

  return itemsAgrupados.value
})
const procedimientoGridStyle = computed(() => ({
  gridTemplateColumns: mostrarValorProcedimiento.value
    ? '74px minmax(0, 1fr) 96px 104px'
    : '74px minmax(0, 1fr) 96px'
}))

const totalBaseCodificacion = computed(() => {
  if (!esCodificacion.value) return 0

  const codificacion = cotizacion.value?.codificacion || {}

  return (
    toNumber(codificacion.copago) +
    toNumber(codificacion.excedente_tope) +
    toNumber(valorLentesCodificacion.value) +
    toNumber(codificacion.pre_anestesia) +
    toNumber(codificacion.otros_costos) +
    toNumber(codificacion.insumos)
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

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    dateStyle: 'long',
    timeStyle: 'short'
  }).format(fecha)
})

const formatDate = (value) => {
  if (!value) return 'N/A'
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})(?:$|T)/)
  if (match) {
    return `${match[3]}/${match[2]}/${match[1]}`
  }

  const fecha = new Date(value)
  if (Number.isNaN(fecha.getTime())) return 'N/A'

  return new Intl.DateTimeFormat('es-CO', {
    timeZone: 'America/Bogota',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(fecha)
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
  if (c === 'HMDQ' || /HONORARIOS/i.test(name)) return 'HMDQ - Honorarios Cirujano';
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

const limpiarNombreArchivo = (value) => {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const nombreArchivoPdf = computed(() => {
  const codigo = limpiarNombreArchivo(cotizacion.value?.codigo || 'cotizacion')
  const paciente = limpiarNombreArchivo(cotizacion.value?.paciente?.nombre_completo || 'paciente')
  const identificacion = limpiarNombreArchivo(cotizacion.value?.paciente?.numero_identificacion || 'sin_identificacion')

  return `${codigo}_${paciente}_${identificacion}.pdf`
})

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
  if (!el) return () => { }

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
      scale: 4,
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

const rowHasContent = (context, width, y) => {
  const step = 10
  const pixels = context.getImageData(0, y, width, 1).data
  let visiblePixels = 0

  for (let x = 0; x < width; x += step) {
    const alpha = pixels[(x * 4) + 3]
    if (alpha > 8) visiblePixels += 1
  }

  return visiblePixels > 2
}

const findSafeSliceHeight = (canvas, sourceY, preferredHeight) => {
  const remaining = canvas.height - sourceY
  if (remaining <= preferredHeight) return remaining

  const context = canvas.getContext('2d')
  const minHeight = Math.floor(preferredHeight * 0.72)
  const scanLimit = Math.min(260, Math.floor(preferredHeight * 0.22))

  for (let offset = 0; offset < scanLimit; offset += 4) {
    const candidateHeight = preferredHeight - offset
    if (candidateHeight < minHeight) break

    const y = sourceY + candidateHeight
    const hasNearbyContent = rowHasContent(context, canvas.width, y)
      || rowHasContent(context, canvas.width, Math.max(sourceY, y - 4))
      || rowHasContent(context, canvas.width, Math.min(canvas.height - 1, y + 4))

    if (!hasNearbyContent) {
      return candidateHeight
    }
  }

  return preferredHeight
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
  const sliceHeightPx = Math.max(1, Math.floor((canvas.width * drawAreaHeight) / drawWidth))

  let sourceY = 0

  while (sourceY < canvas.height) {
    const currentSliceHeight = findSafeSliceHeight(canvas, sourceY, sliceHeightPx)
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

const buildPdfPacienteParaCorreo = async (html2canvas) => {
  const estadoImpresion = {
    imprimirParaPaciente: imprimirParaPaciente.value,
    imprimirParaPacienteDetallada: imprimirParaPacienteDetallada.value,
  }

  if (esCodificacion.value) {
    imprimirParaPaciente.value = true
    imprimirParaPacienteDetallada.value = false
  } else {
    imprimirParaPaciente.value = false
    imprimirParaPacienteDetallada.value = true
  }

  await nextTick()

  try {
    return await buildPdfOnTemplate(html2canvas)
  } finally {
    imprimirParaPaciente.value = estadoImpresion.imprimirParaPaciente
    imprimirParaPacienteDetallada.value = estadoImpresion.imprimirParaPacienteDetallada
    await nextTick()
  }
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
        link.download = nombreArchivoPdf.value
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

const abrirModalCorreo = () => {
  correoDestino.value = cotizacion.value?.paciente?.correo || ''
  progresoCorreo.value = 0
  mostrarModalCorreo.value = true
}

const enviarCorreo = async () => {
  if (!correoDestino.value || loadingCorreo.value) return

  loadingCorreo.value = true
  progresoCorreo.value = 15

  const timer = setInterval(() => {
    progresoCorreo.value = Math.min(progresoCorreo.value + 10, 85)
  }, 350)

  try {
    const html2canvas = (await import('html2canvas')).default
    const pdfBytes = await buildPdfPacienteParaCorreo(html2canvas)
    const pdfBlob = new Blob([pdfBytes], { type: 'application/pdf' })
    const formData = new FormData()

    formData.append('email', correoDestino.value)
    formData.append('pdf', pdfBlob, `Propuesta_${cotizacion.value?.codigo || route.params.id}.pdf`)
    progresoCorreo.value = 55

    const { error } = await useSanctumFetch(`/api/cotizacion/${route.params.id}/enviar-correo`, {
      method: 'POST',
      body: formData,
      headers: {},
    })

    if (error.value) {
      progresoCorreo.value = 0
      pushNotification('error', error.value?.data?.message || 'No se pudo enviar el correo.')
      return
    }

    progresoCorreo.value = 100
    pushNotification('success', 'Cotización enviada al correo indicado.', 'Enviado')
    setTimeout(() => {
      mostrarModalCorreo.value = false
      progresoCorreo.value = 0
    }, 600)
  } catch (error) {
    console.error('Error enviando correo:', error)
    progresoCorreo.value = 0
    pushNotification('error', 'No se pudo generar o enviar el PDF.')
  } finally {
    clearInterval(timer)
    loadingCorreo.value = false
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
    <div class="quote-print-document bg-white text-black p-5 text-sm" ref="contentRef"
      style="width: 210mm; height: auto; margin: 0 auto; font-family: Arial, sans-serif; font-size: 12px; line-height: 1.35;">
      <section class="quote-patient-data">
        <div class="quote-patient-col">
          <div class="quote-info-row">
            <strong>Paciente:</strong>
            <span>{{ cotizacion?.paciente?.nombre_completo || 'N/A' }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Documento:</strong>
            <span>{{ cotizacion?.paciente?.tipo_identificacion || '' }} {{ cotizacion?.paciente?.numero_identificacion || 'N/A' }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Correo:</strong>
            <span>{{ cotizacion?.paciente?.correo || 'N/A' }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Teléfono:</strong>
            <span>{{ cotizacion?.paciente?.telefono || 'N/A' }}</span>
          </div>
        </div>
        <div class="quote-patient-col">
          <div class="quote-info-row">
            <strong>{{ tipoDocumentoLabel }}:</strong>
            <span>{{ cotizacion?.codigo || 'N/A' }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Fecha de Creación:</strong>
            <span>{{ fechaHoraCreacion }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Médico:</strong>
            <span>{{ cotizacion?.medico?.nombre || 'N/A' }}</span>
          </div>
          <div class="quote-info-row">
            <strong>Entidad:</strong>
            <span>{{ cotizacion?.entidad?.nombre || 'N/A' }}</span>
          </div>
          <div v-if="esCodificacion" class="quote-info-row">
            <strong>Fecha de Autorización:</strong>
            <span>{{ fechaAutorizacion }}</span>
          </div>
          <div v-if="esCodificacion" class="quote-info-row">
            <strong>Fecha de Vigencia:</strong>
            <span>{{ fechaVigenciaCodificacion }}</span>
          </div>
        </div>
      </section>
      <hr class="quote-divider" />
      <template v-if="esCodificacion && modoPaciente">
        <h2 class="quote-section-title">PROCEDIMIENTO</h2>
        <div class="quote-grid" style="grid-template-columns: 92px minmax(0, 1fr) 116px;">
          <div class="quote-grid-head">CUPS</div>
          <div class="quote-grid-head">Nombre</div>
          <div class="quote-grid-head">Lateralidad</div>
          <template v-for="(item, idx) in procedimientosPaciente" :key="`paciente-codif-${idx}`">
            <div class="quote-grid-cell">{{ item.codigo }}</div>
            <div class="quote-grid-cell">{{ item.nombre }}</div>
            <div class="quote-grid-cell capitalize">{{ item.lateralidad }}</div>
          </template>
        </div>

        <template v-if="detallesDesglosados.insumos.length > 0">
          <h2 class="quote-section-title">INSUMOS</h2>
          <div class="quote-grid" style="grid-template-columns: 92px minmax(0, 1fr) 116px;">
            <div class="quote-grid-head">Código</div>
            <div class="quote-grid-head">Nombre</div>
            <div class="quote-grid-head">Lateralidad</div>
            <template v-for="(detalle, idx) in detallesDesglosados.insumos" :key="`paciente-insumo-${idx}`">
              <div class="quote-grid-cell">{{ detalle.codigo }}</div>
              <div class="quote-grid-cell">{{ detalle.nombre }}</div>
              <div class="quote-grid-cell capitalize">{{ detalle.lateralidad || '-' }}</div>
            </template>
          </div>
        </template>

        <template v-if="detallesDesglosados.lentes.length > 0">
          <h2 class="quote-section-title">LENTES</h2>
          <div class="quote-grid" style="grid-template-columns: 92px minmax(0, 1fr) 116px;">
            <div class="quote-grid-head">Código</div>
            <div class="quote-grid-head">Nombre</div>
            <div class="quote-grid-head">Lateralidad</div>
            <template v-for="(detalle, idx) in detallesDesglosados.lentes" :key="`paciente-lente-${idx}`">
              <div class="quote-grid-cell">{{ detalle.codigo }}</div>
              <div class="quote-grid-cell">{{ detalle.nombre }}</div>
              <div class="quote-grid-cell capitalize">{{ detalle.lateralidad || '-' }}</div>
            </template>
          </div>
        </template>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px; ">
          <div>
            <h2 class="quote-section-title">VALORES DE CODIFICACIÓN</h2>
            <div class="quote-grid cols-2 quote-values-grid" style="grid-template-columns: minmax(0, 1fr) 132px;">
              <div class="quote-grid-cell quote-label-cell">Copago</div>
              <div class="quote-grid-cell text-right">{{ formatMoney(cotizacion?.codificacion?.copago) }}</div>
              <div class="quote-grid-cell quote-label-cell">Excedente tope</div>
              <div class="quote-grid-cell text-right">{{ formatMoney(cotizacion?.codificacion?.excedente_tope) }}</div>
              <template v-if="valorLentesCodificacion > 0">
                <div class="quote-grid-cell quote-label-cell">Lente</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(valorLentesCodificacion) }}</div>
              </template>
              <template v-if="auxilioLenteCodificacion > 0">
                <div class="quote-grid-cell quote-label-cell">Auxilio de lente</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(auxilioLenteCodificacion) }}</div>
              </template>
              <div class="quote-grid-cell quote-label-cell">Preanestesia</div>
              <div class="quote-grid-cell text-right">{{ formatMoney(cotizacion?.codificacion?.pre_anestesia) }}</div>
              <div class="quote-grid-cell quote-label-cell">Otros</div>
              <div class="quote-grid-cell text-right">{{ formatMoney(cotizacion?.codificacion?.otros_costos) }}</div>
              <template v-if="Number(cotizacion?.codificacion?.insumos || 0) > 0">
                <div class="quote-grid-cell quote-label-cell">Insumos</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(cotizacion?.codificacion?.insumos) }}</div>
              </template>
            </div>
          </div>

          <div>
            <h2 style="font-size: 13px; font-weight: bold; margin: 6px 0 4px 0;">OBSERVACIONES</h2>
            <div class="border border-gray-400 rounded-sm p-3"
              style="border: 1px solid #ccc; padding: 8px; min-height: 104px; font-size: 11px;">
              <p style="white-space: pre-line; margin: 0;">{{ cotizacion?.observaciones || 'Ninguna' }}</p>
            </div>
          </div>
        </div>
      </template>

      <template v-else>
        <!-- Procedimientos -->
        <!-- HANQ, DP, null -->
        <h2 class="quote-section-title">PROCEDIMIENTO</h2>
        <div class="quote-grid" :class="{ 'cols-4': mostrarValorProcedimiento }" :style="procedimientoGridStyle">
          <div class="quote-grid-head">CUPS</div>
          <div class="quote-grid-head">Nombre</div>
          <div class="quote-grid-head">Lateralidad</div>
          <div v-if="mostrarValorProcedimiento" class="quote-grid-head text-right">Valor</div>
          <template v-for="(item, idx) in procedimientosPrint" :key="`proc-grid-${idx}`">
            <div class="quote-grid-cell">{{ item.codigo }}</div>
            <div class="quote-grid-cell">{{ item.nombre }}</div>
            <div class="quote-grid-cell capitalize">{{ item.lateralidad }}</div>
            <div v-if="mostrarValorProcedimiento" class="quote-grid-cell text-right">{{ formatMoney(item.valor) }}</div>
          </template>
        </div>


        <!-- Agrupado por concepto (mostrar en modo normal y modo consulta) -->
        <div v-if="!modoPaciente || modoConsulta">
          <h2 class="quote-section-title">AGRUPADO POR CONCEPTO</h2>
          <div class="quote-grid cols-2" style="grid-template-columns: minmax(0, 1fr) 170px;">
            <div class="quote-grid-head">Concepto</div>
            <div class="quote-grid-head text-right">Valor Total</div>
            <template v-for="c in agrupadoPorConcepto" :key="c.concepto">
              <div class="quote-grid-cell">{{ getConceptoLabel(c.concepto, c.connom) }}</div>
              <div class="quote-grid-cell text-right">{{ formatMoney(c.total) }}</div>
            </template>
          </div>
        </div>
        <div
          v-if="modoPacienteResumen && !modoConsulta && (detallesAgrupados.insumos.length > 0 || detallesAgrupados.lentes.length > 0)">
          <!-- Insumos (agregados con valores) -->
          <template v-if="detallesAgrupados.insumos.length > 0">
            <h2 class="quote-section-title">INSUMOS</h2>
            <div class="quote-grid" style="grid-template-columns: minmax(0, 1fr) 120px 132px;">
              <div class="quote-grid-head">Descripción</div>
              <div class="quote-grid-head text-center">Cantidad Total</div>
              <div class="quote-grid-head text-right">Valor Total</div>
              <div class="quote-grid-cell font-semibold">Insumos</div>
              <div class="quote-grid-cell text-center font-semibold">{{ totalCantidadInsumos }}</div>
              <div class="quote-grid-cell text-right font-semibold">{{ formatMoney(totalInsumos) }}</div>
            </div>
          </template>

          <!-- Lentes (agregados con valores) -->
          <template v-if="detallesAgrupados.lentes.length > 0">
            <h2 class="quote-section-title">LENTES</h2>
            <div class="quote-grid" style="grid-template-columns: minmax(0, 1fr) 120px 132px;">
              <div class="quote-grid-head">Descripción</div>
              <div class="quote-grid-head text-center">Cantidad Total</div>
              <div class="quote-grid-head text-right">Valor Total</div>
              <div class="quote-grid-cell font-semibold">Lentes</div>
              <div class="quote-grid-cell text-center font-semibold">{{ totalCantidadLentes }}</div>
              <div class="quote-grid-cell text-right font-semibold">{{ formatMoney(totalLentes) }}</div>
            </div>
          </template>
        </div>

        <div
          v-if="(modoPacienteDetallado || modoConsulta) && (detallesDesglosados.insumos.length > 0 || detallesDesglosados.lentes.length > 0)">
          <template v-if="detallesDesglosados.insumos.length > 0">
            <h2 class="quote-section-title">INSUMOS</h2>
            <div class="quote-grid cols-4" style="grid-template-columns: 86px minmax(0, 1fr) 68px 116px;">
              <div class="quote-grid-head">Código</div>
              <div class="quote-grid-head">Nombre</div>
              <div class="quote-grid-head text-center">Cantidad</div>
              <div class="quote-grid-head text-right">Valor</div>
              <template v-for="detalle in detallesDesglosados.insumos" :key="`pac-det-ins-${detalle.id || detalle.codigo}-${detalle.nombre}`">
                <div class="quote-grid-cell">{{ detalle.codigo }}</div>
                <div class="quote-grid-cell">{{ detalle.nombre }}</div>
                <div class="quote-grid-cell text-center">{{ detalle.cantidad }}</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(detalle.valor_total) }}</div>
              </template>
            </div>
          </template>

          <template v-if="detallesDesglosados.lentes.length > 0">
            <h2 class="quote-section-title">LENTES</h2>
            <div class="quote-grid cols-4" style="grid-template-columns: 86px minmax(0, 1fr) 68px 116px;">
              <div class="quote-grid-head">Código</div>
              <div class="quote-grid-head">Nombre</div>
              <div class="quote-grid-head text-center">Cantidad</div>
              <div class="quote-grid-head text-right">Valor</div>
              <template v-for="detalle in detallesDesglosados.lentes" :key="`pac-det-len-${detalle.id || detalle.codigo}-${detalle.nombre}`">
                <div class="quote-grid-cell">{{ detalle.codigo }}</div>
                <div class="quote-grid-cell">{{ detalle.nombre }}</div>
                <div class="quote-grid-cell text-center">{{ detalle.cantidad }}</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(detalle.valor_total) }}</div>
              </template>
            </div>
          </template>
        </div>

        <!-- Insumos y Lentes detallados (modo normal) -->
        <div
          v-if="!modoPaciente && !modoConsulta && (detallesDesglosados.insumos.length > 0 || detallesDesglosados.lentes.length > 0)">
          <template v-if="detallesDesglosados.insumos.length > 0">
            <h2 class="quote-section-title">INSUMOS</h2>
            <div class="quote-grid cols-4" style="grid-template-columns: 86px minmax(0, 1fr) 68px 116px;">
              <div class="quote-grid-head">Código</div>
              <div class="quote-grid-head">Nombre</div>
              <div class="quote-grid-head text-center">Cantidad</div>
              <div class="quote-grid-head text-right">Valor</div>
              <template v-for="detalle in detallesDesglosados.insumos" :key="detalle.id || `${detalle.codigo}-${detalle.nombre}`">
                <div class="quote-grid-cell">{{ detalle.codigo }}</div>
                <div class="quote-grid-cell">{{ detalle.nombre }}</div>
                <div class="quote-grid-cell text-center">{{ detalle.cantidad }}</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(detalle.valor_total) }}</div>
              </template>
            </div>
          </template>

          <template v-if="detallesDesglosados.lentes.length > 0">
            <h2 class="quote-section-title">LENTES</h2>
            <div class="quote-grid cols-4" style="grid-template-columns: 86px minmax(0, 1fr) 68px 116px;">
              <div class="quote-grid-head">Código</div>
              <div class="quote-grid-head">Nombre</div>
              <div class="quote-grid-head text-center">Cantidad</div>
              <div class="quote-grid-head text-right">Valor</div>
              <template v-for="detalle in detallesDesglosados.lentes" :key="detalle.id || `${detalle.codigo}-${detalle.nombre}`">
                <div class="quote-grid-cell">{{ detalle.codigo }}</div>
                <div class="quote-grid-cell">{{ detalle.nombre }}</div>
                <div class="quote-grid-cell text-center">{{ detalle.cantidad }}</div>
                <div class="quote-grid-cell text-right">{{ formatMoney(detalle.valor_total) }}</div>
              </template>
            </div>
          </template>

        </div>
      </template>
      <div v-if="polizaSeleccionada" class="quote-policy-row">
        <div>
          <span>Póliza</span>
          <strong>{{ polizaSeleccionada.nombre }}</strong>
        </div>
        <div>
          <span>Valor asegurado</span>
          <strong>{{ formatMoney(polizaSeleccionada.valor_asegurado) }}</strong>
        </div>
        <div>
          <span>Valor póliza</span>
          <strong>{{ formatMoney(polizaSeleccionada.valor_poliza) }}</strong>
        </div>
      </div>
      <p style="text-align: center; font-weight: bold; margin-bottom: 16px; font-size: 16px; margin-top: 24px;">
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

          <button class="px-4 py-2 rounded text-white"
            :class="imprimirParaPacienteDetallada ? 'bg-indigo-700' : 'bg-gray-500'"
            @click="toggleImprimirPacienteDetallada" :disabled="modoConsulta">
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

      <div class="mt-4 flex items-center gap-3">
        <label class="inline-flex items-center gap-2 text-sm text-slate-700">
          <input type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            v-model="verDetallado" :disabled="modoConsulta" />
          <span>Ver detallado</span>
        </label>
        <p class="text-sm text-slate-500">Grupo de procedimientos por defecto; activa para ver valores por item.</p>
      </div>
    </div>
    <!-- Botón imprimir -->
    <div class="mt-6 text-center print:hidden flex justify-center gap-4">
      <button class="mt-4 px-4 py-2 bg-blue-600 text-white rounded" @click="imprimirPDF" :disabled="loadingImprimir">
        <span v-if="loadingImprimir">Imprimiendo...</span>
        <span v-else>🖨 Imprimir</span>
      </button>
      <button v-if="!modoConsulta"
        class="flex justify-center items-center gap-2 mt-4 px-4 py-2 bg-green-600 text-white rounded"
        @click="abrirModalCorreo">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18"
          viewBox="0 0 24 24"><!-- Icon from Material Symbols by Google - https://github.com/google/material-design-icons/blob/master/LICENSE -->
          <path fill="currentColor"
            d="M12 22q-2.075 0-3.9-.788t-3.175-2.137T2.788 15.9T2 12t.788-3.9t2.137-3.175T8.1 2.788T12 2t3.9.788t3.175 2.137T21.213 8.1T22 12v1.45q0 1.475-1.012 2.513T18.5 17q-.875 0-1.65-.375t-1.3-1.075q-.725.725-1.638 1.088T12 17q-2.075 0-3.537-1.463T7 12t1.463-3.537T12 7t3.538 1.463T17 12v1.45q0 .65.425 1.1T18.5 15t1.075-.45t.425-1.1V12q0-3.35-2.325-5.675T12 4T6.325 6.325T4 12t2.325 5.675T12 20h4q.425 0 .713.288T17 21t-.288.713T16 22zm0-7q1.25 0 2.125-.875T15 12t-.875-2.125T12 9t-2.125.875T9 12t.875 2.125T12 15" />
        </svg>
        Correo electrónico
      </button>
      <button v-if="!modoConsulta"
        class="flex justify-center items-center gap-2 bg-red-600 text-white mt-4 px-4 py-2 rounded"
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

    <div v-if="mostrarModalCorreo" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
      <div class="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-xl">
        <div class="flex items-start justify-between gap-4">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Enviar cotizacion por correo</h2>
            <p class="mt-1 text-sm text-slate-600">Confirma el correo del paciente o corrigelo antes de enviar.</p>
          </div>
          <button class="text-xl text-slate-500 hover:text-slate-900" :disabled="loadingCorreo"
            @click="mostrarModalCorreo = false">x</button>
        </div>

        <label class="mt-4 block">
          <span class="text-sm font-semibold text-slate-700">Correo destino</span>
          <input v-model="correoDestino" type="email"
            class="mt-1 h-11 w-full rounded-lg border border-slate-300 px-3" />
        </label>

        <div v-if="loadingCorreo || progresoCorreo > 0" class="mt-4">
          <div class="h-2 overflow-hidden rounded-full bg-slate-200">
            <div class="h-full bg-emerald-600 transition-all" :style="{ width: `${progresoCorreo}%` }"></div>
          </div>
          <p class="mt-2 text-xs text-slate-500">Enviando correo... {{ progresoCorreo }}%</p>
        </div>

        <div class="mt-5 flex justify-end gap-2">
          <button class="h-10 rounded-lg bg-slate-200 px-4 text-sm font-semibold text-slate-700"
            :disabled="loadingCorreo" @click="mostrarModalCorreo = false">
            Cancelar
          </button>
          <button class="h-10 rounded-lg bg-emerald-600 px-4 text-sm font-semibold text-white disabled:opacity-60"
            :disabled="loadingCorreo || !correoDestino" @click="enviarCorreo">
            {{ loadingCorreo ? 'Enviando...' : 'Enviar a correo' }}
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<style>


.quote-patient-data {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
  column-gap: 28px;
  row-gap: 2px;
  margin: 0 0 6px;
  font-size: 12px;
  line-height: 1.25;
}

.quote-patient-col {
  display: grid;
  row-gap: 2px;
  align-content: start;
}

.quote-info-row {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr);
  column-gap: 6px;
  min-height: 16px;
  align-items: start;
}

.quote-info-row strong {
  font-weight: 700;
  white-space: nowrap;
}

.quote-info-row span {
  overflow-wrap: anywhere;
}

.quote-divider {
  margin: 6px 0 8px;
  border: 0;
  border-top: 1px solid #9ca3af;
}

.quote-policy-row {
  display: grid;
  grid-template-columns: minmax(0, 1.2fr) minmax(0, 1fr) minmax(0, 1fr);
  gap: 0;
  margin: 6px 0 8px;
  border: 1px solid #9ca3af;
  font-size: 12px;
}

.quote-policy-row > div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-height: 28px;
  padding: 4px 8px 5px;
  border-right: 1px solid #9ca3af;
}

.quote-policy-row > div:last-child {
  border-right: 0;
}

.quote-policy-row span {
  color: #334155;
  font-weight: 700;
  white-space: nowrap;
}

.quote-policy-row strong {
  color: #0f172a;
  text-align: right;
  overflow-wrap: anywhere;
}

.quote-section-title {
  font-size: 14px;
  font-weight: 700;
  margin: 7px 0 6px;
  line-height: 1.1;
}

.quote-grid {
  display: grid;
  width: 100%;
  min-width: 0;
  border: 1px solid #9ca3af;
  border-radius: 2px;
  font-size: 12px;
  margin-bottom: 8px;
  box-sizing: border-box;
}

.quote-grid-cell {
  min-width: 0;
  min-height: 26px;
  display: grid;
  place-items: center start;
  align-content: center;
  padding: 2px 7px 4px;
  border-right: 1px solid #cbd5e1;
  border-bottom: 1px solid #cbd5e1;
  line-height: 1.08;
  overflow-wrap: anywhere;
  word-break: break-word;
  white-space: normal;
  box-sizing: border-box;
}

.quote-grid:not(.cols-2):not(.cols-4) .quote-grid-cell:nth-last-child(-n + 3),
.quote-grid.cols-4 .quote-grid-cell:nth-last-child(-n + 4),
.quote-grid.cols-2 .quote-grid-cell:nth-last-child(-n + 2) {
  border-bottom: 0;
}

.quote-grid-head {
  min-width: 0;
  min-height: 26px;
  display: grid;
  place-items: center;
  align-content: center;
  padding: 2px 7px 4px;
  border-right: 1px solid #cbd5e1;
  border-bottom: 1px solid #9ca3af;
  background: #1570b1;
  color: #fff;
  font-weight: 700;
  line-height: 1.05;
  overflow-wrap: anywhere;
  word-break: break-word;
  box-sizing: border-box;
}

.quote-label-cell {
  background: #f8fafc;
  font-weight: 700;
}

.quote-values-grid .quote-grid-cell {
  min-height: 24px;
}

.quote-grid .font-semibold {
  font-weight: 700;
}

.quote-grid-cell:nth-child(3n),
.quote-grid-head:nth-child(3n) {
  border-right: 0;
}

.quote-grid.cols-4 .quote-grid-cell:nth-child(4n),
.quote-grid.cols-4 .quote-grid-head:nth-child(4n),
.quote-grid.cols-2 .quote-grid-cell:nth-child(2n),
.quote-grid.cols-2 .quote-grid-head:nth-child(2n) {
  border-right: 0;
}

.quote-grid .text-right {
  justify-content: end;
  justify-items: end;
  place-items: center end;
  text-align: right;
}

.quote-grid .text-center {
  justify-content: center;
  justify-items: center;
  place-items: center;
  text-align: center;
}

.quote-grid .capitalize {
  text-transform: capitalize;
}

@media print {
  .quote-print-document {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  .quote-section-title {
    margin-bottom: 6px !important;
  }

  .quote-grid-cell,
  .quote-grid-head {
    display: grid !important;
    align-items: center !important;
    align-content: center !important;
    box-sizing: border-box !important;
    line-height: 1.05 !important;
  }
}

</style>
