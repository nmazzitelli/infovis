# Datos

Historial personal de Spotify del 1 de diciembre de 2015 al 9 de agosto de 2026.

- `horas_musica_por_anio.csv`: horas escuchadas por año completo (2017–2025).
- `escucha_anual.csv`: resumen anual ampliado.
- `escucha_por_dia_y_hora.csv`: horas por día y franja horaria, en hora argentina (2017–2025).
- `escucha_por_artista_y_anio.csv`: horas, reproducciones y canciones por artista y año (2017–2025).
- `artistas_generos_musicbrainz.json`: artistas y etiquetas originales de MusicBrainz, sin agrupar.
- `generos_musicbrainz_sin_clasificar.csv`: las mismas etiquetas en formato tabular.
- `generos_por_anio_flourish.csv`: horas anuales por macro-género para Flourish.
- `fuente_anonimizada/spotify_extended/`: 19 archivos JSON del historial extendido.

Cada artista se asignó a un único macro-género; los casos sin etiquetas claras quedaron como `Sin clasificar`.

Los CSV excluyen 125 registros exactamente duplicados. En los JSON publicados solo se eliminaron las direcciones IP.
