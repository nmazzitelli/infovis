# Datos del trabajo práctico

## Fuente

Los datos provienen de una descarga personal de **Spotify Extended Streaming History**. El historial disponible abarca del 1 de diciembre de 2015 al 9 de agosto de 2026.

Los archivos originales no se publican porque contienen información privada. Este repositorio incluye únicamente tablas procesadas y agregadas.

## Archivos

- `horas_musica_por_anio.csv`: años completos 2017–2025 y horas reproducidas. Es la fuente del gráfico de Datawrapper.
- `escucha_anual.csv`: resumen anual ampliado con horas, reproducciones, días activos, canciones y artistas únicos, duplicados y cobertura.
- `escucha_por_dia_y_hora.csv`: horas reproducidas según día de la semana y franja de dos horas. Es la fuente de la visualización de RAWGraphs.

## Procesamiento

Se conservaron únicamente reproducciones musicales, se apartaron 125 filas exactamente duplicadas y se sumó el tiempo reproducido por año. Los archivos originales no fueron modificados.

2015, 2016 y 2026 tienen cobertura parcial. Por eso el gráfico principal compara solamente 2017–2025.

Para la tabla semanal también se usaron solamente los años completos 2017–2025. Los timestamps de Spotify, originalmente en UTC, se convirtieron a `America/Argentina/Buenos_Aires` y se agruparon en franjas de dos horas.

## Privacidad

Se eliminaron datos de cuenta, IP, país, dispositivo, plataforma, timestamps exactos, canciones, artistas, álbumes e identificadores de Spotify.
