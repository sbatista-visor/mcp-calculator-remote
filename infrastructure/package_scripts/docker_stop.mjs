import { parseArgsWithHelp } from './utilities/parse_args_with_help.mjs';
import { spawnPromise } from './utilities/spawn_promise.mjs';

const { values: argv, outputPrefix } = parseArgsWithHelp(import.meta.url, {
  options: {
    tag: {
      short: 't',
      type: 'string',
      default: packageJson.name,
    },
    name: {
      short: 't',
      type: 'string',
      default: packageJson.name,
    },
  },
});

await spawnPromise(`docker stop ${argv.name} && docker rm ${argv.name}`, {
  forwardParams: false,
  outputPrefix,
});
