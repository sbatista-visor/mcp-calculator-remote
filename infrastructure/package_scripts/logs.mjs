import { config } from '@dotenvx/dotenvx';
import { createWriteStream } from 'node:fs';
import { parseArgsWithHelp } from './utilities/parse_args_with_help.mjs';
import { sshCommand } from './utilities/ssh_command.mjs';
config({ override: true });

const { outputPrefix, values: argv } = parseArgsWithHelp(import.meta.url, {
  options: {
    appName: {
      short: 'a',
      type: 'string',
      default: 'agent-newsletter-puppeteer',
      description: '(optional) dokku app name to get logs from',
    },
    lines: {
      short: 'l',
      type: 'string',
      default: '1000',
      description: '(optional) number of lines to print, defaults to 1000',
    },
    development: {
      short: 'd',
      type: 'boolean',
      description: '(optional) print logs for development environment, defaults to false',
    },
    outputToTile: {
      short: 'f',
      type: 'boolean',
      default: false,
      description:
        '(optional) print logs to a file (defaults to false): ./infrastructure/logs/{appName}_<timestamp>.log',
    },
  },
});

const finalAppName = `${argv.appName}${argv.development ? '-dev' : ''}`;
let writeStream;
if (argv.outputToTile) {
  const outputFilePath = `./infrastructure/logs/${finalAppName}_${Date.now()}.log`;
  writeStream = createWriteStream(outputFilePath);
}

try {
  await sshCommand(`dokku logs ${finalAppName} -n ${argv.lines} -t`, {
    outputPrefix,
    onStdout: writeToTile,
    onStderr: writeToTile,
  });
} catch (error) {
  console.error(`${outputPrefix}Error fetching logs for ${finalAppName}:`, error);
  process.exit(1);
} finally {
  writeStream?.end();
}

function writeToTile(chunk) {
  writeStream?.write(chunk.toString('utf8'));
}
