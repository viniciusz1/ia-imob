# Neighborhood boundary catalog

Files are versioned as `<city-slug>-<state>.v<version>.geojson`. Each file is a
GeoJSON `FeatureCollection`; every feature must have a canonical neighborhood
name in `properties.name` and a `Polygon` or `MultiPolygon` geometry.

Top-level `version` and `source` metadata are returned by the Offer Map API so
the UI can identify the boundary dataset and its license. A city without a
matching file deliberately falls back to the equivalent list view.

`jaragua-do-sul-sc.v1.geojson` contains the initially supported Centro and Vila
Lenzi boundaries from OpenStreetMap, retrieved through Nominatim on 2026-07-17
and distributed under ODbL 1.0. Additional neighborhoods should be added from
the same licensed source without changing existing versioned files.
