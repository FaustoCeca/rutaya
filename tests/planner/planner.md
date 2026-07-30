# E2E Tests: Planner

**Suite ID:** `PLANNER`
**Feature:** Planificación de rutas de entrega: agregar paradas, calcular la ruta óptima, crear/terminar viajes y compartirlos por link.

Todas las APIs externas (OSRM, Photon, Georef, Nominatim, tiles OSM) se mockean en `tests/helpers.ts`; cada tramo de ruta responde 10 min / 3 km.

---

## `PLANNER-E2E-001` — Planificar una ruta con el buscador

**Priority:** `critical`

**Flow:** Buscar y agregar dos paradas → ver resumen "2 paradas · 10 min · 3 km" → expandir panel.

**Key verification points:** resumen con totales; la primera parada queda marcada como "Origen".

## `PLANNER-E2E-002` — Ida y vuelta

**Priority:** `high`

**Flow:** Con 2 paradas cargadas, activar "Volver al punto de partida".

**Key verification points:** el resumen suma el tramo de vuelta (20 min · 6 km); aparece la fila "Vuelta al origen".

## `PLANNER-E2E-003` — Crear viaje y persistencia

**Priority:** `critical`

**Flow:** Cargar 2 paradas → "Crear viaje" → recargar la página.

**Key verification points:** badge "Viaje en curso"; el buscador desaparece (edición bloqueada); tras reload el viaje sigue activo (localStorage).

## `PLANNER-E2E-004` — Terminar viaje e historial

**Priority:** `high`

**Flow:** Crear viaje → "Terminar viaje" → confirmar en el diálogo → expandir panel.

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
