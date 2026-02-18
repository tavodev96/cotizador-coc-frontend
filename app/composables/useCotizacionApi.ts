export const useCotizacionApi = () => {

  const getById = async (id: number) => {
    return await useSanctumFetch(`/api/cotizacion/${id}`)
  }

  const create = async (payload: any) => {
    return await useSanctumFetch('/api/cotizaciones', {
      method: 'POST',
      body: payload,
    })
  }

  const update = async (id: number, payload: any) => {
    return await useSanctumFetch(`/api/cotizacion/editar/${id}`, {
      method: 'PUT',
      body: payload,
    })
  }

  return { getById, create, update }
}
