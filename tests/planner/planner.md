# E2E Tests: Planner

**Suite ID:** `PLANNER`
**Feature:** Planificación de rutas de entrega: agregar paradas, calcular la ruta óptima, crear/terminar viajes y compartirlos por link.

Todas las APIs externas (OSRM, Photon, Georef, Nominatim, tiles OSM) se mockean en `tests/helpers.ts`; cada tramo de ruta responde 10 min / 3 km.

---

## `PLANNER-E2E-001` — Planificar una ruta con el buscador

**Priority:** `critical`

**Flow:** Buscar y agregar dos paradas → ver resumen "2 paradas · 10 min · 3 km" → expandir panel → marcar el punto de partida con "Empezar acá".

**Key verification points:** resumen con totales; sin punto de partida elegido "Crear viaje" está deshabilitado y se ofrece el selector "¿Desde dónde salís?"; al marcarlo la parada muestra "Origen" y el botón se habilita.

## `PLANNER-E2E-002` — Ida y vuelta

**Priority:** `high`

**Flow:** Con 2 paradas cargadas, activar "Volver al punto de partida".

**Key verification points:** el resumen suma el tramo de vuelta (20 min · 6 km); aparece la fila "Vuelta al origen".

## `PLANNER-E2E-003` — Crear viaje y persistencia

**Priority:** `critical`

**Flow:** Cargar 2 paradas → marcar el punto de partida → "Crear viaje" → recargar la página.

**Key verification points:** badge "Viaje en curso"; el buscador desaparece (edición bloqueada); tras reload el viaje sigue activo (localStorage).

## `PLANNER-E2E-004` — Terminar viaje e historial

**Priority:** `high`

**Flow:** Crear viaje (con punto de partida marcado) → "Terminar viaje" → confirmar en el diálogo → expandir panel.

**Key verification points:** vuelve al editor vacío; el viaje aparece en "Viajes anteriores" con su origen.

## `PLANNER-E2E-005` — Abrir link compartido

**Priority:** `critical`

**Preconditions:** `?r=` generado con `encodeRouteState` real (helpers.buildShareParam).

**Flow:** Abrir `/?r=<payload>` → "Guardar como mi viaje".

**Key verification points:** badge "Viaje recibido" con resumen calculado; al guardarlo pasa a "Viaje en curso".

## `PLANNER-E2E-006` — Link inválido

**Priority:** `medium`

**Flow:** Abrir `/?r=enlace-invalido`.

**Key verification points:** toast "El enlace no es válido"; cae al editor vacío.

## `PLANNER-E2E-007` — Tour de bienvenida

**Priority:** `medium`

**Preconditions:** primera visita (sin flags en localStorage).

**Flow:** Abrir la app → cerrar el tour con "¡Empezar!".

**Key verification points:** el tour aparece solo en la primera visita y se puede cerrar.

## `PLANNER-E2E-008` — Historial de puntos de partida

**Priority:** `high`

**Flow:** Crear un viaje con origen marcado → terminarlo → elegir ese origen desde las partidas rápidas del selector.

**Key verification points:** el origen del viaje anterior aparece como botón de partida rápida (se guardan los últimos 3); al tocarlo queda elegido como punto de partida ("Salís desde …").

## `PLANNER-E2E-009` — Marcar entregas y próxima parada

**Priority:** `critical`

**Flow:** Crear viaje de 3 paradas → marcar una entregada tocando su fila → recargar → desmarcarla.

**Key verification points:** el progreso "Entregadas X de Y" acompaña cada marca; "Ir a la próxima parada" apunta a la primera sin entregar en orden de visita (link solo con destino, sin origin); las marcas sobreviven el reload; desmarcar revierte progreso y próxima.

## `PLANNER-E2E-010` — Entregar todo y viaje siguiente limpio

**Priority:** `high`

**Flow:** Viaje de 2 paradas → marcar la única entregable → terminar viaje → rearmar el mismo viaje.

**Key verification points:** con todo entregado aparece "¡Todas las paradas entregadas!" y desaparece el link de próxima parada; el viaje nuevo arranca sin marcas heredadas.

## `PLANNER-E2E-011` — Modificar viaje preservando entregas

**Priority:** `critical`

**Flow:** Viaje de 3 paradas con la última marcada entregada → "Modificar viaje" + confirmar → borrar una parada intermedia y agregar otra → "Guardar cambios" → recargar.

**Key verification points:** el banner "Estás modificando tu viaje en curso" aparece y el buscador vuelve (edición desbloqueada); al guardar, la marca sigue en la parada correcta aunque su índice cambió (remapeo por id); la próxima parada apunta a la agregada; tras reload el storage tiene los índices nuevos.

## `PLANNER-E2E-012` — Descartar cambios

**Priority:** `high`

**Flow:** Viaje de 3 paradas con una entregada → Modificar → borrar una parada → "Descartar cambios" + confirmar.

**Key verification points:** vuelve el viaje bloqueado exactamente como estaba (paradas, resumen y marcas); el banner desaparece.

## `PLANNER-E2E-013` — Recargar a mitad de una modificación

**Priority:** `medium`

**Flow:** Viaje de 3 paradas con una entregada → Modificar → borrar una parada → recargar sin guardar.

**Key verification points:** el registro guardado no se tocó durante la edición: vuelve el viaje bloqueado con sus 3 paradas y sus marcas (los cambios sin guardar se pierden, red de seguridad).
