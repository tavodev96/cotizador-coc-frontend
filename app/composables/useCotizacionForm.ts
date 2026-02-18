export const useCotizacionForm = () => {

  const paciente = useState('cotizacion.paciente', () => ({
    id: null,
    tipo_identificacion: '',
    numero_identificacion: '',
    nombres: '',
    apellidos: '',
    correo: '',
    telefono: '',
    entidad_id: null,
  }))

  const cotizacion = useState('cotizacion.cotizacion', () => ({
    origen: '',
    tipo_gestion: '',
    medico_id: '',
    consultorio_id: '',
    observaciones: '',
    items: [],
    insumos: [],
    lentes: [],
  }))

  const codificacion = useState('cotizacion.codificacion', () => ({
    autorizacion: '',
    copago: '0',
    excedenteTope: '0',
    lentes: '0',
    preAnestesia: '0',
    otros: '0',
    fechaVigencia: '',
  }))

  const totalProcedimientos = computed(() =>
    cotizacion.value.items.reduce((acc, i) => {
      const valor = Number(i.valor_con_descuento ?? i.valor) || 0
      const cantidad = Number(i.cantidad ?? 1) || 1
      return acc + valor * cantidad
    }, 0)
  )

  const totalInsumos = computed(() =>
    (cotizacion.value.insumos || []).reduce((acc, i) => {
      const valor = Number(i.valor) || 0
      const cantidad = Number(i.cantidad ?? 1) || 1
      return acc + valor * cantidad
    }, 0)
  )

  const totalLentes = computed(() =>
    (cotizacion.value.lentes || []).reduce((acc, l) => {
      const valor = Number(l.valor) || 0
      const cantidad = Number(l.cantidad ?? 1) || 1
      return acc + valor * cantidad
    }, 0)
  )

  const totalCotizacion = computed(() =>
    totalProcedimientos.value + totalInsumos.value + totalLentes.value
  )

  return {
    paciente,
    cotizacion,
    codificacion,
    totalCotizacion,
  }
}
