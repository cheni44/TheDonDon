# Spatial Trace

An open-data building footprint explorer for the web.

## Features

- Approximate location from visitor IP
- Address geocoding with OpenStreetMap Nominatim
- Pan and zoom OpenStreetMap tiles with nearby tile preloading
- Building footprint lookup through OpenStreetMap Overpass
- Optional OpenBuildingMap GeoJSON/bbox provider integration
- Footprint dimensions, area, source, and available floor metadata
- No generated fallback data when public building or indoor-layout data is unavailable

## Run locally

Serve this directory over HTTP:

```sh
python3 -m http.server 4173
```

Then open `http://127.0.0.1:4173/`.

## Public deployment

This project is static and can be published directly with GitHub Pages under
`/building-footprint-map/`.

## Data notes

The browser calls third-party public services at runtime. Availability, rate
limits, CORS behavior, and data completeness depend on those providers.
