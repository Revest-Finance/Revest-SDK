import babel from '@rollup/plugin-babel';
import { terser } from 'rollup-plugin-terser';
import pkg from './package.json';
import { nodeResolve } from "@rollup/plugin-node-resolve";
import commonjs from "@rollup/plugin-commonjs";


const LIBRARY_NAME = 'Revest';
const EXTERNAL = ['../node_modules/json-to-graphql-query/lib/jsonToGraphQLQuery']; // Indicate which modules should be treated as external
const GLOBALS = {}; // https://rollupjs.org/guide/en/#outputglobals

const banner = `/*!
 * ${pkg.name}
 * ${pkg.description}
 *
 * @version v${pkg.version}
 * @author ${pkg.author}
 * @homepage ${pkg.homepage}
 * @repository ${pkg.repository.url}
 * @license ${pkg.license}
 */`;

const makeConfig = (env = 'development') => {
  let bundleSuffix = '';

  if (env === 'production') {
    bundleSuffix = 'min.';
  }

  const config = {
    input: 'src/index.js',
    external: [...Object.keys(pkg.dependencies), /^node:/],
    output: [
      {
        banner,
        name: LIBRARY_NAME,
        file: `dist/${LIBRARY_NAME}.umd.${bundleSuffix}js`, // UMD
        format: 'umd',
        globals: GLOBALS
      },
      {
        banner,
        file: `dist/${LIBRARY_NAME}.cjs.${bundleSuffix}js`, // CommonJS
        format: 'cjs',
        // We use `default` here as we are only exporting one thing using `export default`.
        // https://rollupjs.org/guide/en/#outputexports
        exports: 'default',
        globals: GLOBALS
      },
      {
        banner,
        file: `dist/${LIBRARY_NAME}.esm.${bundleSuffix}js`, // ESM
        format: 'es',
        exports: 'auto',
        globals: GLOBALS
      }
    ],
    plugins: [
      // Uncomment the following 2 lines if your library has external dependencies
      // resolve(), // teach Rollup how to find external modules
      // commonjs(), // so Rollup can convert external modules to an ES module
      babel({
        extensions: [".ts", ".tsx", ".js", ".mjs"],
        babelHelpers: 'bundled',
        exclude: ['node_modules/**'],
      })
      
      ,    nodeResolve({
        extensions: [".ts", ".tsx", ".mjs", ".js", ".json", ".node"],
        preferBuiltins: true,
      }),
      commonjs(),
    ]
  };

  if (env === 'production') {
    config.plugins.push(terser({
      output: {
        comments: /^!/
      }
    }));
  }

  return config;
};

export default commandLineArgs => {
  const configs = [
    makeConfig()
  ];

  // Production
  if (commandLineArgs.environment === 'BUILD:production') {
    configs.push(makeConfig('production'));
  }

  return configs;
};
