export const useDashboardData = () => {
    const totalOrdenamientos = ref<number>(0);
    const totalCotizaciones = ref<number>(0);
    
    const fetchTotalOrdenamientos = async () => {
        try {
            // Aquí simulas la llamada a tu API
            // const response = await $fetch('/api/ordenamientos/total'); 
            // totalOrdenamientos.value = response.total;

            // ***** SIMULACIÓN DE DATOS DINÁMICOS *****
            await new Promise(resolve => setTimeout(resolve, 500)); // Simula un retraso de red
            const dataObtenida = 123; // ¡Valor dinámico obtenido de la API!
            totalOrdenamientos.value = dataObtenida;
            // ****************************************

        } catch (error) {
            console.error("Error al obtener total de ordenamientos:", error);
            totalOrdenamientos.value = 0; // Manejo de error
        }
    };

    const fetchTotalCotizaciones = async () => {
        try {
            // Aquí simulas la llamada a tu API
            // const response = await $fetch('/api/ordenamientos/total'); 
            // totalOrdenamientos.value = response.total;

            // ***** SIMULACIÓN DE DATOS DINÁMICOS *****
            await new Promise(resolve => setTimeout(resolve, 500)); // Simula un retraso de red
            const dataObtenida = 40; // ¡Valor dinámico obtenido de la API!
            totalCotizaciones.value = dataObtenida;
            // ****************************************

        } catch (error) {
            console.error("Error al obtener total de Cotizaciones:", error);
            totalCotizaciones.value = 0; // Manejo de error
        }
    };

    onMounted(() => {
        fetchTotalOrdenamientos();
        fetchTotalCotizaciones();
    });

    // Devuelve los valores reactivos y las funciones que necesites
    return {
        totalOrdenamientos,
        totalCotizaciones,
        fetchTotalOrdenamientos,
        fetchTotalCotizaciones,
    };
}