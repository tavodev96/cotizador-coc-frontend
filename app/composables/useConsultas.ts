export const useConsultas = () => {
  // const { useSanctumFetch } = useNuxtApp();

  /**
   * Sanitiza el input removiendo espacios y caracteres especiales
   * Solo permite letras, números y guiones
   */
  const sanitizarHistoria = (historia: string): string => {
    let sanitizado = historia.trim().replace(/\s+/g, '');
    sanitizado = sanitizado.replace(/[^a-zA-Z0-9\-]/g, '');
    return sanitizado;
  };

  /**
   * Consulta una cotización por número de historia
   * @param historia - Número de historia del paciente
   * @returns Datos de la cotización
   * @throws Error si la historia es inválida o no se encuentra
   */
  const consultarPorHistoria = async (historia: string) => {

    const historiaSanitizada = sanitizarHistoria(historia);

    if (!historiaSanitizada || historiaSanitizada.length === 0) {
      throw new Error('El número de historia es inválido');
    }

    if (historiaSanitizada.length < 3) {
      throw new Error('El número de historia debe tener al menos 3 caracteres');
    }

    try {
      const response = await useSanctumFetch(`/api/cotizaciones/${historiaSanitizada}`, {
        method: 'GET',
      });

      return response.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error('No se encontró una cotización con ese número de historia');
      }
      throw error;
    }
  };

  return {
    consultarPorHistoria,
    sanitizarHistoria, // Exportar por si se necesita usar externamente
  };
};
