# RutaYa 🛵

Optimizador de rutas de entrega para repartidores. Cargás las paradas en un mapa (buscando la dirección o tocando el mapa), la app calcula el **orden óptimo de visita** para minimizar el tiempo, y compartís la ruta por WhatsApp con un link que cualquiera puede abrir sin instalar nada.

## Funcionalidades

- 🗺️ Mapa a pantalla completa (mobile-first) con paradas numeradas en orden óptimo
- 🔍 Buscador de direcciones con autocomplete (sesgado a Argentina) + "Usar mi ubicación"
- ⚡ Optimización automática del orden en cada cambio (sin apretar nada)
- 🔁 Toggle "Volver al punto de partida" para circuitos de ida y vuelta
- 🔗 Link compartible: las paradas viajan comprimidas en la URL, sin backend
- 🧭 "Abrir en Google Maps" con las paradas ya ordenadas, para navegar
- 🔒 Viajes confirmados: al tocar "Crear viaje" queda bloqueado (nada lo modifica) y guardado en el dispositivo hasta "Terminar viaje"
- 🕘 Historial de los últimos 5 viajes para reabrirlos con un toque
- 📄 Importar planilla de Excel: la IA (Claude) detecta las direcciones y localidades en planillas sin formato fijo, la app las geolocaliza con Georef/Photon y las carga como paradas tras una pantalla de revisión — el punto de partida lo elige el usuario

## Stack

- React 19 + TypeScript + Vite 7, con [Bun](https://bun.sh) como runtime
- TanStack Router + TanStack Query, Tailwind CSS 4, Biome
- Leaflet + tiles de OpenStreetMap
- APIs públicas gratuitas: [OSRM](https://project-osrm.org) (optimización), [Photon](https://photon.komoot.io) (autocomplete), [Georef](https://datosgobar.github.io/georef-ar-api/) (direcciones oficiales argentinas con altura), [Nominatim](https://nominatim.org) (reverse geocoding)
- Importación de Excel: [SheetJS](https://sheetjs.com) lee la planilla en el navegador y una función serverless (`api/extract-stops.ts`) extrae dirección + localidad con la API de Claude (`claude-haiku-4-5`, salida estructurada). La geolocalización nunca pasa por la IA.

> ⚠️ Las APIs públicas son de **uso justo**: sobradas para un repartidor o un equipo chico. Si se escala a muchos usuarios, conviene self-hostear OSRM o pasar a un proveedor pago.

## Desarrollo

```bash
bun install
bun dev        # http://localhost:5173
bun run lint   # Biome
bun run build  # tsc + vite build → dist/
```

Para que funcione la importación de Excel en dev, creá un `.env.local` (gitignoreado) con:

```
ANTHROPIC_API_KEY=sk-ant-...
```

En dev el endpoint `/api/extract-stops` lo sirve un middleware de Vite con la misma lógica que la función de Vercel.

## Deploy

La app es estática salvo la función serverless de importación (`api/`). En Vercel se importa el repo (detecta Vite y `bun run build` automáticamente) y se agrega la variable de entorno **`ANTHROPIC_API_KEY`** en Settings → Environment Variables — conviene una API key propia creada en [console.anthropic.com](https://console.anthropic.com). Sin la key, la app funciona igual pero la importación de Excel responde "servicio no configurado".
