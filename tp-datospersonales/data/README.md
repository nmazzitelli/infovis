# Datos del trabajo práctico

## Fuente

Los datos provienen de una descarga personal de **Spotify Extended Streaming History**. El historial disponible abarca del 1 de diciembre de 2015 al 9 de agosto de 2026.

Los originales no se publican porque contienen direcciones IP. `fuente_anonimizada/` conserva los registros completos sin ese campo.

## Archivos

- `horas_musica_por_anio.csv`: años completos 2017–2025 y horas reproducidas. Es la fuente del gráfico de Datawrapper.
- `escucha_anual.csv`: resumen anual ampliado con horas, reproducciones, días activos, canciones y artistas únicos, duplicados y cobertura.
- `escucha_por_dia_y_hora.csv`: horas acumuladas por día y franja horaria, del 1/1/2017 al 31/12/2025. Fuente de RAWGraphs.

  Campos: `Día` y `Hora` identifican el momento; `Horas` es el total escuchado; `Orden día` y `Orden hora` conservan el orden cronológico.

- `fuente_anonimizada/spotify_extended/`: 19 historiales extendidos de audio y un manifiesto con 164.553 registros.
- `../scripts/anonimizar_historial_spotify.mjs`: genera las copias sin IP.

## Procesamiento

Para los CSV se conservaron reproducciones musicales, se apartaron 125 filas exactamente duplicadas y se agregaron los tiempos. Los originales no fueron modificados.

2015, 2016 y 2026 tienen cobertura parcial. Por eso el gráfico principal compara solamente 2017–2025.

Para la tabla semanal, los horarios se convirtieron a hora argentina y se agruparon en franjas de dos horas.

## Privacidad

En los historiales publicados solo se eliminó `ip_addr`. Se conservaron timestamps, país, plataforma, dispositivo y metadatos de contenido.
