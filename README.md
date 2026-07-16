# RutaYa 🛵

Optimizador de rutas de entrega para repartidores. Cargás las paradas en un mapa (buscando la dirección o tocando el mapa), la app calcula el **orden óptimo de visita** para minimizar el tiempo, y compartís la ruta por WhatsApp con un link que cualquiera puede abrir sin instalar nada.

## Funcionalidades

- 🗺️ Mapa a pantalla completa (mobile-first) con paradas numeradas en orden óptimo
- 🔍 Buscador de direcciones con autocomplete (sesgado a Argentina) + "Usar mi ubicación"
- ⚡ Optimización automática del orden en cada cambio (sin apretar nada)
- 🔁 Toggle "Volver al punto de partida" para circuitos de ida y vuelta
- 🔗 Link compartible: las paradas viajan comprimidas en la URL, sin backend
- 🧭 "Abrir en Google Maps" con las paradas ya ordenadas, para navegar

## Stack

- React 19 + TypeScript + Vite 7, con [Bun](https://bun.sh) como runtime
- TanStack Router + TanStack Query, Tailwind CSS 4, Biome
- Leaflet + tiles de OpenStreetMap
- APIs públicas gratuitas: [OSRM](https://project-osrm.org) (optimización), [Photon](https://photon.komoot.io) (autocomplete), [Georef](https://datosgobar.github.io/georef-ar-api/) (direcciones oficiales argentinas con altura), [Nominatim](https://nominatim.org) (reverse geocoding)

> ⚠️ Las APIs públicas son de **uso justo**: sobradas para un repartidor o un equipo chico. Si se escala a muchos usuarios, conviene self-hostear OSRM o pasar a un proveedor pago.

## Desarrollo

```bash
bun install
bun dev        # http://localhost:5173
bun run lint   # Biome
bun run build  # tsc + vite build → dist/
```

## Deploy

App 100% estática (no hay variables de entorno ni backend). En Vercel se importa el repo y listo: detecta Vite y usa `bun run build` automáticamente.
