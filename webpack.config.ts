import type { Configuration } from 'webpack';
import { merge } from 'webpack-merge';
import grafanaConfig, { type Env } from './.config/webpack/webpack.config';

/**
 * Grafana 13 runs React 19 and renamed React's secret internals.
 * A bundled copy of react/jsx-runtime (the React 18 build) crashes on load.
 * Externalize it so the panel uses the runtime Grafana already provides.
 * See https://grafana.com/developers/plugin-tools/migration-guides/update-from-grafana-versions/migrate-12_x-to-13_x
 */
const config = async (env: Env): Promise<Configuration> => {
  const baseConfig = await grafanaConfig(env);

  return merge(baseConfig, {
    externals: ['react', 'react-dom', 'react/jsx-runtime', 'react/jsx-dev-runtime'],
  });
};

export default config;
