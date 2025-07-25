import { config } from '@dotenvx/dotenvx';
import { parseArgsWithHelp } from './utilities/parse_args_with_help.mjs';
import { spawnPromise } from './utilities/spawn_promise.mjs';
import { packageJson } from './utilities/load_package_json.mjs';

const { values: argv, outputPrefix } = parseArgsWithHelp(import.meta.url, {
  options: {
    tag: {
      short: 't',
      type: 'string',
      default: packageJson.name,
    },
    name: {
      short: 'n',
      type: 'string',
      default: packageJson.name,
    },
  },
});

const dotEnvVars = {};
config({ processEnv: dotEnvVars });

const envVars = Object.keys(dotEnvVars).reduce((accumulator, key) => {
  return accumulator + ` --env ${key}=${JSON.stringify(dotEnvVars[key])}`;
}, '');

try {
  await import('./docker_stop.mjs');
} catch {
  /* noop */
}

await spawnPromise(`docker container run --name ${argv.name} -p 127.0.0.1:5000:5000/tcp ${envVars} ${argv.tag}`, {
  forwardParams: false,
  outputPrefix,
});
