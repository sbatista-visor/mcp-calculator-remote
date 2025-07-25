// @ts-check
import { config } from '@dotenvx/dotenvx';
import { readMultipleChoice } from './utilities/read_multiple_choice.mjs';
import { parseArgsWithHelp } from './utilities/parse_args_with_help.mjs';
import { packageJson } from './utilities/load_package_json.mjs';
config({ override: true });

/** @description Build & deploy the docker application */
/** @example pnpm deploy                    ~ Deploy to development environment. */
/** @example pnpm deploy -d | --development ~ Deploy to development environment. */
/** @example pnpm deploy -p | --production  ~ Deploy to production environment. */
const { outputPrefix, values: argv } = parseArgsWithHelp(import.meta.url, {
  options: {
    dokkuApp: {
      type: 'string',
      short: 'a',
      default: packageJson.name,
      description: '(optional) Dokku app to deploy, defaults to syncado.',
    },
    production: {
      type: 'boolean',
      short: 'p',
      default: true,
      description: '(optional) Deploy to production environment.',
    },
    areYouSure: {
      type: 'boolean',
      short: 'y',
      default: false,
      description: '(optional) Skip are you sure check.',
    },
  },
});

const answer = argv.areYouSure
  ? 'yes'
  : await readMultipleChoice(
      `Are you sure you want to deploy to ${argv.production ? 'production' : 'development'}?`,
      ['no', 'yes'],
      {
        enableHotkeys: true,
      },
    );

if (!answer.toLowerCase().startsWith('y')) {
  console.log(`${outputPrefix}Aborting deployment to ${argv.production ? 'production' : 'development'}.`);
  process.exit(0);
}
process.env.MODE = argv.production ? 'production' : 'development';
process.argv.push(`--app_name=${argv.dokkuApp}${argv.production ? '' : '-dev'}`);

await import('./dokku/dokku_deploy.mjs');
