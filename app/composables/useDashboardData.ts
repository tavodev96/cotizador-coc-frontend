export const useDashboardData = () => {
    const totalOrdenamientos = ref<number>(0);
    const totalCotizaciones = ref<number>(0);
    
    const fetchTotalOrdenamientos = async () => {
        try {
            const { data } =  await useSanctumFetch('/api/ordenamientos/cantidad',{method: 'GET'});

            totalOrdenamientos.value = data.value.cantidad_ordenamientos;

        } catch (error) {
            console.error("Error al obtener total de ordenamientos:", error);
            totalOrdenamientos.value = 0;
        }
    };

    const fetchTotalCotizaciones = async () => {
        try {

            const { data } =  await useSanctumFetch('/api/cotizaciones/cantidad',{method: 'GET'});

            totalCotizaciones.value = data.value.cantidad;

        } catch (error) {
            console.error("Error al obtener total de Cotizaciones:", error);
            totalCotizaciones.value = 0;
        }
    };

    onMounted(() => {
        fetchTotalOrdenamientos();
        fetchTotalCotizaciones();
    });

    return {
        totalOrdenamientos,
        totalCotizaciones,
        fetchTotalOrdenamientos,
        fetchTotalCotizaciones,
    };
}