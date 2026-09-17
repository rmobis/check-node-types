import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';
import { Command } from 'commander';
import { check } from './checker.js';
import { formatResult, formatJson } from './output.js';
import type { VersionSource } from './types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(resolve(__dirname, '../package.json'), 'utf-8'));

const program = new Command();

program
  .name('check-node-types')
  .description('Verify @types/node major version matches your target Node.js version')
  .version(pkg.version)
  .option('--source <source>', 'where to read Node.js version from (engines, volta, nvmrc, node-version, devEngines)', 'engines')
  .option('--package <path>', 'path to package.json', resolve(process.cwd(), 'package.json'))
  .option('--print', 'print detected versions and exit', false)
  .option('-q, --quiet', 'only output on error', false)
  .option('--json', 'output results as JSON', false)
  .option('--no-color', 'disable colored output')
  .action((options) => {
    const validSources: VersionSource[] = ['engines', 'volta', 'nvmrc', 'node-version', 'devEngines'];
    if (!validSources.includes(options.source)) {
      console.error(`Invalid source: "${options.source}". Must be one of: ${validSources.join(', ')}`);
      process.exit(2);
    }

    const result = check({
      packagePath: resolve(options.package),
      source: options.source as VersionSource,
    });

    const useColor = options.color !== false && !process.env.NO_COLOR;
    const cliOptions = { ...options, color: useColor };

    if (options.json) {
      console.log(formatJson(result));
    } else {
      const output = formatResult(result, cliOptions);
      if (output) console.log(output);
    }

    // --print without --json is purely informational — always exit 0
    if (options.print && !options.json) {
      process.exit(0);
    }

    const exitCode = result.status === 'pass' ? 0 : result.status === 'fail' ? 1 : 2;
    process.exit(exitCode);
  });

program.parse();
