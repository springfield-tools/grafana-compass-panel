# Custom compass panel

## Status

Accepted

## Context

A Particle Photon weather station publishes `wind_direction_degrees` (0–360, meteorological direction the wind comes from) and `wind_speed_miles_per_hour` to Prometheus. Those series are shown on Grafana OSS 13.0.2, running in Docker on a Synology NAS.

Grafana's built-in gauge can show the number, and the Canvas panel can place a static needle image, but neither can rotate a needle by the series value with a continuous short-way animation. A CSS or Canvas rotation bound to the raw angle interpolates numerically, so a change from 359° to 1° sweeps almost the whole dial instead of stepping across north. The gauge also has no place for a 16-point bearing name, a speed readout, or a trail of recent directions.

The panel has to load in Grafana 13, which runs React 19 for plugins. Grafana shares one React instance with every plugin. Bundling React, or bundling the React 18 `react/jsx-runtime`, crashes or misbehaves because React 19 renamed `__SECRET_INTERNALS_DO_NOT_USE`.

## Decision

Build a frontend panel plugin, `springfield-compass-panel`, with `@grafana/create-plugin`. The panel draws an SVG compass that scales to the panel, rotates the needle with shortest-path easing, and reads the latest numeric sample of a chosen field.

`react`, `react-dom`, and `react/jsx-runtime` are webpack externals, so the installed plugin does not ship its own React. `grafanaDependency` is `>=12.3.0`, the version that started providing those modules to plugins and the floor documented in the Grafana 12.x → 13.x migration guide. That range includes Grafana OSS 13.0.2. The plugin is not signed; Grafana is started with `GF_PLUGINS_ALLOW_LOADING_UNSIGNED_PLUGINS=springfield-compass-panel`.

## Consequences

- Installation is a directory mount into `/var/lib/grafana/plugins/springfield-compass-panel`, not a catalog install. A git tag `v*` builds a zip and attaches it to a GitHub release.
- Grafana older than 12.3.0 cannot load the plugin, because it would not supply `react/jsx-runtime`.
- The panel code stays on APIs that exist in Grafana 13.0 (panel options, field name picker, theme). It does not use React 19-only APIs, so a React 18 rollback inside the 13.x line would not strand it.
- Direction is a number in degrees. Values outside 0–360 do not move the needle; null and empty queries leave the dial in a no-data state.
- The animated angle lives in the browser. It resets when the panel remounts, then eases toward the next sample.
