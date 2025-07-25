import { config } from '@dotenvx/dotenvx';
import { readFileSync } from 'node:fs';
import { parseArgsWithHelp } from './utilities/parse_args_with_help.mjs';
import { packageJson } from './utilities/load_package_json.mjs';
import { spawnPromise } from './utilities/spawn_promise.mjs';
config({ override: true });

const { values: argv, outputPrefix } = parseArgsWithHelp(import.meta.url, {
  options: {
    development: {
      type: 'boolean',
      short: 'd',
      default: false,
      description: '(optional) Sets MODE env variable to "development"',
    },
    tag: {
      short: 't',
      type: 'string',
      default: packageJson.name,
    },
    platform: {
      short: 'p',
      type: 'string',
      default: 'linux/x86_64',
    },
    ['no-cache']: {
      short: 'c',
      type: 'boolean',
    },
  },
});

const envVars = {
  MODE: argv.development ? 'development' : 'production',
  NODE_ENV: argv.development ? 'development' : 'production',
  NODE_VERSION: readFileSync('.node-version').toString(),
  NEXT_PUBLIC_URL: process.env.NEXT_PUBLIC_URL,
  NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL,
  NEXT_PUBLIC_CDN_URL: process.env.NEXT_PUBLIC_CDN_URL,
  NEXT_PUBLIC_FEATURE_FLAG_APP_NAME: process.env.NEXT_PUBLIC_FEATURE_FLAG_APP_NAME,
  NEXT_PUBLIC_FEATURE_FLAG_URL: process.env.NEXT_PUBLIC_FEATURE_FLAG_URL,
  NEXT_PUBLIC_FEATURE_FLAG_CLIENT_KEY: process.env.NEXT_PUBLIC_FEATURE_FLAG_CLIENT_KEY,
};

const commands = [
  'docker',
  'build',
  '.',
  '--platform',
  argv.platform,
  '--tag',
  argv.tag,
  ...Object.entries(envVars).reduce((accumulator, [key, value]) => {
    if (value) {
      accumulator.push('--build-arg');
      accumulator.push(`${key}=${value}`);
    }
    return accumulator;
  }, []),
];
if (argv['no-cache']) {
  commands.push('--no-cache');
}

await spawnPromise(commands.join(' '), {
  forwardParams: false,
  outputPrefix,
});
