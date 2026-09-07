# Session Replay

SDK verificado: `@sentry/react 10.72.0`. Usa `replayIntegration()` incluido en el SDK.
Muestreo: 1% de sesiones normales; 100% de sesiones con errores capturados por Sentry.
Solo se habilita con un build de producción y `VITE_SENTRY_DSN` definido.
No se agregó tracing ni dependencias. `sendDefaultPii` sigue en `false`.

Todos los textos e inputs se enmascaran. Se bloquean formularios completos, campos
sueltos, contenido editable, media, canvas, iframes y fondos con imágenes inline.
Para nuevas zonas privadas, usar `data-sentry-private` en su contenedor.
No se permiten excepciones de desenmascarado. Se descartan los eventos adicionales
de consola, red, navegación y clics; no se habilitan bodies ni headers de red.

El hook de Replay de esta versión no filtra las capturas rrweb ni su URL inicial.
Por eso el transporte elimina URLs, atributos privados y datos de scope del Replay,
conservando los IDs que lo vinculan con errores. Se desactiva la compresión del SDK
para poder sanear el formato antes del envío: esto aumenta el tamaño transferido.
Si cambia el formato y no puede sanearse, se descarta ese envío de Replay.
Las grabaciones tienen menos detalle visual y no incluyen el panel de actividad de red/consola.
El filtro de transporte se limita a Replay; no reemplaza el filtrado de errores existente.

## Comprobación manual sin desplegar

1. Con `VITE_SENTRY_DSN` configurado, ejecutar `npm run build` y `npm run preview`.
   `npm run dev` mantiene Sentry deshabilitado.
2. Abrir la URL local del preview. Navegar e interactuar durante unos 10 segundos.
   Para revisar privacidad, usar únicamente datos ficticios en formularios.
3. En la consola del navegador ejecutar:

   ```js
   setTimeout(() => { throw new Error('SENTRY_REPLAY_TEST_PUBLIC_WEB') }, 0)
   ```

4. Mantener la pestaña abierta otros 15–30 segundos. En Network, buscar `envelope`:
   debe haber un evento de error y un envío con `replay_event` y `replay_recording`,
   con respuesta 2xx. Revisar que el payload de Replay no contenga los datos ficticios.
5. En el proyecto de Sentry, buscar el issue `SENTRY_REPLAY_TEST_PUBLIC_WEB`, abrir
   el evento correspondiente y su Session Replay. Confirmar textos enmascarados,
   formularios/media bloqueados y ausencia de datos de consola/red.

El 100% es la tasa de muestreo ante errores, no una garantía de entrega: el SDK debe
estar activo y el error no debe estar filtrado; bloqueadores, red y cuotas de Sentry
pueden impedir el envío. No se agregó ningún error de prueba permanente a la aplicación.

Verificación local del filtro: `node --test tests/sentry-replay.test.ts`.
Prueba en Chromium sobre el build, interceptando toda la telemetría localmente:
`node tests/sentry-replay.browser.mjs`.
