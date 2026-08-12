# E2E Tests: Geolocalización

**Suite ID:** `GEO`
**Feature:** Sesgo de cercanía por GPS: las sugerencias del buscador y el geocoding del import priorizan las direcciones más cercanas a la posición del usuario; el centro del mapa queda solo como fallback.

La posición se emula con `test.use({ geolocation })` (Rosario); las APIs externas siguen mockeadas por `tests/helpers.ts`. Un init script instrumenta `navigator.geolocation` para sincronizar sin hooks de test en la app.

---

## `GEO-E2E-001` — El GPS sesga las sugerencias del buscador

**Priority:** `critical`

**Preconditions:** permiso de geolocalización otorgado, posición emulada en Rosario.

**Flow:** Abrir la app → esperar el fix → tipear una búsqueda.

**Key verification points:** el request a Photon lleva `lat`/`lon` de Rosario (el GPS le ganó al default Buenos Aires sin tocar el mapa).

## `GEO-E2E-002` — Permiso denegado: fallback silencioso

**Priority:** `high`

**Preconditions:** permiso de geolocalización no otorgado.

**Flow:** Abrir la app → tipear una búsqueda.

**Key verification points:** el request a Photon lleva `lat`/`lon` de Buenos Aires (centro del mapa); no aparece ningún toast de error.

## `GEO-E2E-003` — El prompt espera al tour de bienvenida

**Priority:** `medium`

**Preconditions:** primera visita (sin flags en localStorage).

**Flow:** Abrir la app → tour visible → cerrarlo con "¡Empezar!".

**Key verification points:** con el tour en pantalla no hubo ningún pedido de posición; tras cerrarlo se dispara el primero.
