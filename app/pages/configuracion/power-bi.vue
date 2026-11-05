<script setup lang="ts">
definePageMeta({
  middleware: ['sanctum:auth'],
})

const { hasPermission, hasRole, ensureUserPermissions } = useUserPermissions()
const copiado = ref(false)

const puedeVer = computed(() => {
  return hasPermission('reportes.cotizaciones.exportar')
    || hasRole('administrador')
    || hasRole('Admin')
    || hasRole('superadmin')
    || hasRole('Superadmin')
})

const consultaPowerBi = `let
    UrlBase = "https://<HOST_BACKEND>/api/reportes/cotizaciones/power-bi",
    Token = "<TOKEN_DE_ACCESO>",
    ObtenerPagina = (pagina as number) =>
        Json.Document(
            Web.Contents(
                UrlBase,
                [
                    Query = [page = Text.From(pagina), per_page = "1000"],
                    Headers = [Authorization = "Bearer " & Token, Accept = "application/json"]
                ]
            )
        ),
    PrimeraPagina = ObtenerPagina(1),
    Paginas = {1..Number.From(PrimeraPagina[last_page])},
    Respuestas = List.Transform(Paginas, each if _ = 1 then PrimeraPagina else ObtenerPagina(_)),
    Registros = List.Combine(List.Transform(Respuestas, each _[data])),
    Tabla = Table.FromRecords(Registros)
in
    Tabla`

const copiarConsulta = async () => {
  try {
    await navigator.clipboard.writeText(consultaPowerBi)
    copiado.value = true
    window.setTimeout(() => { copiado.value = false }, 2000)
  } catch (error) {
    console.error('No fue posible copiar la consulta de Power BI:', error)
  }
}

onMounted(async () => {
  await ensureUserPermissions()

  if (!puedeVer.value) {
    await navigateTo('/403')
  }
})
</script>

<template>
  <div class="max-w-5xl mx-auto px-4 md:px-6 py-6 space-y-5">
    <section class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p class="text-sm font-semibold uppercase tracking-wide text-indigo-700">Configuración</p>
      <h1 class="mt-1 text-2xl font-semibold text-slate-900">Integración Power BI</h1>
      <p class="mt-2 text-sm leading-6 text-slate-600">
        Consulta el reporte de cotizaciones desde Power BI mediante una API paginada y protegida. La fuente incluye los CUPS y el nombre de cada procedimiento en pares de columnas.
      </p>
    </section>

    <section v-if="puedeVer" class="space-y-5">
      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Datos requeridos</h2>
        <ul class="mt-3 list-disc space-y-2 pl-5 text-sm leading-6 text-slate-600">
          <li>La URL pública HTTPS del backend. No use <code>localhost</code> para una actualización en Power BI Service.</li>
          <li>Un usuario exclusivo para Power BI con el permiso <code>reportes.cotizaciones.exportar</code>.</li>
          <li>Un token de acceso de ese usuario. Trátelo como una contraseña y no lo comparta ni lo guarde en repositorios.</li>
        </ul>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <h2 class="text-lg font-semibold text-slate-900">Paso a paso</h2>
        <ol class="mt-3 list-decimal space-y-3 pl-5 text-sm leading-6 text-slate-600">
          <li>Un administrador crea o designa el usuario exclusivo de integración y le asigna únicamente el permiso de exportación del reporte.</li>
          <li>
            Obtenga el token llamando <code>POST /api/login</code> con el correo y contraseña de ese usuario. Guarde solo el valor <code>token</code> de la respuesta.
          </li>
          <li>En Power BI Desktop seleccione <strong>Obtener datos → Consulta en blanco</strong>, abra el <strong>Editor avanzado</strong> y pegue la consulta siguiente.</li>
          <li>Reemplace <code>&lt;HOST_BACKEND&gt;</code> por el dominio HTTPS del backend y <code>&lt;TOKEN_DE_ACCESO&gt;</code> por el token obtenido.</li>
          <li>Cuando Power BI solicite credenciales para el origen, seleccione <strong>Anónimo</strong>: la autorización viaja en el encabezado <code>Bearer</code> de la consulta.</li>
          <li>Cargue la tabla. Para actualizarla en Power BI Service, el backend debe ser accesible por HTTPS desde el servicio (o mediante un gateway configurado por TI).</li>
        </ol>

        <pre class="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"><code>POST https://&lt;HOST_BACKEND&gt;/api/login
Content-Type: application/json

{
  "email": "usuario-powerbi@dominio.com",
  "password": "&lt;CLAVE_DEL_USUARIO&gt;"
}</code></pre>
      </div>

      <div class="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 class="text-lg font-semibold text-slate-900">Consulta para Power Query</h2>
            <p class="mt-1 text-sm text-slate-500">Lee todas las páginas disponibles, hasta 1.000 registros por solicitud.</p>
          </div>
          <button
            type="button"
            class="h-10 rounded-lg border border-slate-300 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            @click="copiarConsulta"
          >
            {{ copiado ? 'Copiada' : 'Copiar consulta' }}
          </button>
        </div>
        <pre class="mt-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-xs leading-5 text-slate-100"><code>{{ consultaPowerBi }}</code></pre>
      </div>

      <div class="rounded-2xl border border-indigo-200 bg-indigo-50 p-5 text-sm leading-6 text-indigo-950">
        <h2 class="font-semibold">Estructura y seguridad</h2>
        <p class="mt-1">
          La API es <code>GET /api/reportes/cotizaciones/power-bi</code>, usa los mismos filtros del reporte web y pagina la respuesta con <code>page</code>, <code>per_page</code> y <code>last_page</code>. Cada procedimiento agrega <code>cup_1</code>, <code>nombre_procedimiento_1</code>, <code>cup_2</code>, <code>nombre_procedimiento_2</code>, y así sucesivamente.
        </p>
        <p class="mt-2">
          Rote el token si deja de utilizarse. Cerrar sesión con ese token lo revoca; por eso se recomienda que el usuario de Power BI no se use para el acceso diario a la aplicación.
        </p>
      </div>
    </section>
  </div>
</template>
