export const useDashboardData = () => {
    type DashboardPeriodo = 'hoy' | '7d' | '30d' | 'todo';

    type DashboardCard = {
        titulo: string;
        valor: string | number;
        descripcion: string;
        enlace: string | null;
        accion: string | null;
    };

    type DashboardBlockItem = {
        etiqueta: string;
        valor: string | number;
        extra: string | null;
    };

    type DashboardBlock = {
        titulo: string;
        tipo: 'lista' | 'texto';
        valor: string | number | null;
        descripcion: string | null;
        items: DashboardBlockItem[];
    };

    type RoleDashboard = {
        rol: string;
        etiqueta: string;
        titulo: string;
        descripcion: string;
        cards: DashboardCard[];
        blocks: DashboardBlock[];
        notice: { titulo: string; descripcion: string } | null;
    };

    type RespuestaCantidad = {
        cantidad?: number;
        cantidad_ordenamientos?: number;
    };

    type RespuestaDashboard = {
        role_panel?: RoleDashboard;
        conversion?: {
            total_cotizaciones?: number;
            cotizaciones_con_codificacion?: number;
            porcentaje?: number;
        };
        top_medicos?: Array<{ nombre: string; total: number }>;
        promedio_horas_actualizacion?: number;
        distribucion_tipo_gestion?: Array<{ tipo_gestion: string; total: number; porcentaje: number }>;
        top_entidades?: Array<{ nombre: string; total: number; monto_total: number }>;
        alertas_sin_movimiento_48h?: number;
    };

    const createEmptyMetricasDashboard = () => ({
        top_medicos: [] as Array<{ nombre: string; total: number }> ,
        promedio_horas_actualizacion: 0,
        distribucion_tipo_gestion: [] as Array<{ tipo_gestion: string; total: number; porcentaje: number }>,
        conversion: {
            total_cotizaciones: 0,
            cotizaciones_con_codificacion: 0,
            porcentaje: 0,
        },
        top_entidades: [] as Array<{ nombre: string; total: number; monto_total: number }>,
        alertas_sin_movimiento_48h: 0,
    });

    const createEmptyRoleDashboard = (): RoleDashboard => ({
        rol: '',
        etiqueta: 'Panel',
        titulo: 'Resumen',
        descripcion: '',
        cards: [],
        blocks: [],
        notice: null,
    });

    const totalOrdenamientos = ref<number>(0);
    const totalCotizaciones = ref<number>(0);
    const metricasDashboard = ref(createEmptyMetricasDashboard());
    const roleDashboard = ref<RoleDashboard>(createEmptyRoleDashboard());
    const cargandoDashboard = ref(false);
    const avisoFiltroSinResultados = ref('');

    const buildRequestKey = (prefix: string, periodo: DashboardPeriodo) => {
        return `${prefix}-${periodo}-${Date.now()}`;
    };
    
    const getRangoFechas = (periodo: Exclude<DashboardPeriodo, 'todo'>) => {
        const fin = new Date();
        const inicio = new Date();

        if (periodo === '7d') {
            inicio.setDate(fin.getDate() - 6);
        } else if (periodo === '30d') {
            inicio.setDate(fin.getDate() - 29);
        }

        const toISODate = (d: Date) => d.toISOString().slice(0, 10);

        return {
            inicio: toISODate(inicio),
            fin: toISODate(fin),
        };
    };

    const fetchTotalOrdenamientos = async (periodo: DashboardPeriodo = 'hoy') => {
        try {
            if (periodo === 'todo') {
                totalOrdenamientos.value = 0;
                return;
            }

            const { inicio, fin } = getRangoFechas(periodo);

            const params = periodo === 'hoy'
                ? { fecha: fin }
                : { fecha_inicio: inicio, fecha_fin: fin };

            const { data } = await useSanctumFetch<RespuestaCantidad>(
                '/api/ordenamientos/cantidad',
                {
                    method: 'GET',
                    params,
                },
                undefined,
                buildRequestKey('dashboard-ordenamientos', periodo)
            );

            totalOrdenamientos.value = Number(
                data.value?.cantidad_ordenamientos ?? data.value?.cantidad ?? 0
            );

        } catch (error) {
            console.error("Error al obtener total de ordenamientos:", error);
            totalOrdenamientos.value = 0;
        }
    };

    const fetchTotalCotizaciones = async (periodo: DashboardPeriodo = 'hoy') => {
        try {

            const { data } =  await useSanctumFetch<RespuestaCantidad>(
                '/api/cotizaciones/cantidad',
                {
                    method: 'GET',
                    params: { periodo },
                },
                undefined,
                buildRequestKey('dashboard-cotizaciones', periodo)
            );

            totalCotizaciones.value = Number(data.value?.cantidad ?? 0);

        } catch (error) {
            console.error("Error al obtener total de Cotizaciones:", error);
            totalCotizaciones.value = 0;
        }
    };

    const fetchMetricasDashboard = async (periodo: DashboardPeriodo = '30d') => {
        await fetchDashboard(periodo);
    };

    const ejecutarFetchDashboard = async (periodo: DashboardPeriodo) => {
        const { data } = await useSanctumFetch<RespuestaDashboard>(
            '/api/dashboard/metricas',
            {
                method: 'GET',
                params: { periodo },
            },
            undefined,
            buildRequestKey('dashboard-metricas', periodo)
        );

        if (data.value) {
            metricasDashboard.value = {
                ...createEmptyMetricasDashboard(),
                ...data.value,
                conversion: {
                    ...createEmptyMetricasDashboard().conversion,
                    ...(data.value?.conversion || {}),
                },
            };
            roleDashboard.value = data.value.role_panel || createEmptyRoleDashboard();
            totalCotizaciones.value = Number(data.value?.conversion?.total_cotizaciones ?? 0);
        }
    };

    const fetchDashboard = async (periodo: DashboardPeriodo = '30d') => {
        cargandoDashboard.value = true;

        try {
            await ejecutarFetchDashboard(periodo);

            if (periodo !== 'todo' && totalCotizaciones.value === 0) {
                await ejecutarFetchDashboard('todo');

                const etiqueta = {
                    hoy: 'Hoy',
                    '7d': 'Últimos 7 días',
                    '30d': 'Últimos 30 días',
                }[periodo] || 'el periodo seleccionado';

                avisoFiltroSinResultados.value = `No hay registros para ${etiqueta}. Se muestra el consolidado general.`;
            } else {
                avisoFiltroSinResultados.value = '';
            }
        } catch (error) {
            console.error('Error al obtener métricas del dashboard:', error);
            metricasDashboard.value = createEmptyMetricasDashboard();
            roleDashboard.value = createEmptyRoleDashboard();
            avisoFiltroSinResultados.value = '';
        } finally {
            cargandoDashboard.value = false;
        }
    };

    return {
        totalOrdenamientos,
        totalCotizaciones,
        metricasDashboard,
        roleDashboard,
        cargandoDashboard,
        avisoFiltroSinResultados,
        fetchTotalOrdenamientos,
        fetchTotalCotizaciones,
        fetchMetricasDashboard,
        fetchDashboard,
    };
}