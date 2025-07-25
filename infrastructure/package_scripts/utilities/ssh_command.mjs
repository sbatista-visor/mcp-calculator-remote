// @ts-check
import { NodeSSH } from 'node-ssh';
import { printDuration } from './performance_utils.mjs';

/**
 * @typedef {{
 *  failOnError?: boolean;
 *  keepAlive?: boolean;
 * }} SshCommandOptions
 * @type {SshCommandOptions}
 */
const DEFAULT_OPTIONS = { failOnError: true, keepAlive: false };
/** @type {NodeSSH | undefined} */
let ssh;
/** @type {Promise<NodeSSH> | undefined} */
let sshPromise;
/**
 * @param {string} cmd
 * @param {Partial<
 *  SshCommandOptions &
 *  import('./spawn_promise.mjs').SpawnPromiseOptions & {
 *    onStdout: (chunk: Buffer) => void;
 *    onStderr: (chunk: Buffer) => void;
 *  }
 * >} [options]
 * @returns {Promise<() => void>} A function to close the connection if options.keepAlive is set to true
 */
export async function sshCommand(cmd, options) {
  const _options = { ...DEFAULT_OPTIONS, ...options };
  try {
    if (!ssh) {
      /* console.log(
        JSON.stringify(
          {
            host: process.env.SSH_HOST,
            username: process.env.SSH_USERNAME,
            password: process.env.SSH_PASSWORD,
            privateKey: process.env.SSH_PRIVATE_KEY,
            privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
            passphrase: process.env.SSH_PRIVATE_KEY_PASSWORD,
          },
          null,
          2,
        ),
      ); */
      sshPromise = (async () => {
        ssh = new NodeSSH();
        await ssh.connect({
          host: process.env.SSH_HOST,
          username: process.env.SSH_USERNAME,
          password: process.env.SSH_PASSWORD,
          privateKey: process.env.SSH_PRIVATE_KEY,
          privateKeyPath: process.env.SSH_PRIVATE_KEY_PATH,
          passphrase: process.env.SSH_PRIVATE_KEY_PASSWORD,
        });
        sshPromise = undefined;
        return ssh;
      })();
    }
    if (sshPromise) {
      await sshPromise;
    }
    const startTime = performance.now();
    if (!_options?.silent) {
      console.log(`${_options?.outputPrefix || ''}BEGIN_SSH: ${cmd}`);
    }
    await /** @type {NodeSSH} */ (ssh).execCommand(cmd, {
      ..._options,
      onStdout: (chunk) => {
        _options?.onStdout?.(chunk);
        if (!_options?.silent) process.stdout.write(chunk.toString('utf8'));
      },
      onStderr: (chunk) => {
        _options?.onStderr?.(chunk);
        process.stderr.write(chunk.toString('utf8'));
      },
    });
    if (!_options?.silent) {
      console.log(`${_options?.outputPrefix || ''}END_SSH: ${cmd} (${printDuration(startTime)})`);
    }
  } catch (error) {
    if (!_options?.silent) {
      console.error(`${_options?.outputPrefix || ''}ERROR_SSH: ${error}`);
    }
    if (_options?.failOnError) {
      ssh?.dispose();
      ssh = undefined;
      throw error;
    }
  }
  function closeConnection() {
    ssh?.dispose();
    ssh = undefined;
  }
  if (!options?.keepAlive) {
    closeConnection();
  }
  return closeConnection;
}
