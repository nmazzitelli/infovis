# Datos públicos del prototipo

## Fuente

Los datos se derivan de una descarga personal de **Spotify Extended Streaming History**, solicitada desde la cuenta de Spotify. La descarga original contiene 19 archivos de historial de audio y abarca desde el 1 de diciembre de 2015 hasta el 9 de agosto de 2026.

Los archivos originales **no se publican** en este repositorio. Además de los nombres de canciones, artistas y álbumes, contienen información que no es necesaria para el trabajo práctico: dirección IP, país, dispositivo/plataforma y fecha y hora exactas de cada reproducción.

Tampoco se publica el paquete **Spotify Account Data**, porque incluye datos de cuenta mucho más sensibles, como identidad, búsquedas, mensajes y pagos.

## Archivos publicados

- `escucha_anual.csv`: tabla simple, lista para importar en Datawrapper, RAWGraphs, Flourish o Tableau.
- `escucha_anual.json`: los mismos datos más metadatos sobre la fuente y el procesamiento.
- `muestra_anonimizada.json`: nueve registros representativos para mostrar la estructura de la fuente sin revelar canciones, artistas, dispositivos, IP ni timestamps exactos.

## Transformación

1. Se leyeron únicamente los archivos `Streaming_History_Audio_*.json`.
2. Se conservaron los registros con `spotify_track_uri`, que identifican reproducciones musicales; se excluyeron podcasts y otros contenidos.
3. Se detectaron filas exactamente idénticas comparando el registro completo. Se apartaron 125 repeticiones en la base musical procesada, sin borrar ni modificar los originales.
4. Se sumó `ms_played` por año y se convirtió el resultado a horas.
5. Se publicaron sólo métricas agregadas y conteos, sin nombres ni identificadores personales.

## Diccionario de `escucha_anual`

| Campo | Descripción |
|---|---|
| `year` | Año calendario de la reproducción. |
| `hours` | Horas de música luego de apartar duplicados exactos. Es la medida usada en el gráfico. |
| `raw_hours` | Horas antes de apartar duplicados exactos. Permite auditar el impacto de la limpieza. |
| `playback_events` | Cantidad de registros musicales procesados, incluidos eventos muy breves. |
| `active_days` | Días distintos con al menos una reproducción. |
| `unique_tracks` | Cantidad de URI de canciones distintas. No se publican las URI. |
| `unique_artists` | Cantidad de nombres de artistas distintos. No se publican los nombres. |
| `exact_duplicate_rows` | Filas idénticas apartadas durante el procesamiento. |
| `coverage` | `complete` para 2017–2025 y `partial` para años con cobertura incompleta. |

## Cobertura y decisiones

- El gráfico principal usa 2017–2025 porque son los nueve años completos y comparables.
- 2015 comienza en diciembre; 2016 tiene pocos días registrados; 2026 termina el 9 de agosto. Esos años permanecen en los archivos públicos con la etiqueta `partial`, pero no se muestran en la comparación principal.
- Las horas representan tiempo efectivamente reproducido. Una canción puede aportar tiempo aunque se haya saltado antes del final.
- La descarga no trae un campo de género. Para estudiar géneros se necesita enriquecer cada artista con otra fuente y documentar cómo se agrupan etiquetas equivalentes.

## Privacidad

La publicación excluye: nombre y datos de cuenta, correo, fecha de nacimiento, dirección, pagos, búsquedas, mensajes, IP, país, plataforma, dispositivo, timestamp exacto, canciones, artistas, álbumes y URI de Spotify. Los secretos de una eventual aplicación de Spotify (`client_id` y `client_secret`) tampoco deben subirse a GitHub.
