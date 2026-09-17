import { readFileSync } from 'node:fs';
import type { CheckResult, VersionSource } from './types.js';
import { readNodeVersion, getMajorFromSpecifier, sourceLabel, sourceFix } from './version-utils.js';

export interface CheckOptions {
  packagePath: string;
  source: VersionSource;
}

export function check({ packagePath, source }: CheckOptions): CheckResult {
  // Read target Node.js version from the chosen source
  const nodeVersion = readNodeVersion(packagePath, source);
  const label = sourceLabel(source);
  const fix = sourceFix(source);

  // Read @types/node from package.json
  let typesNodeRaw: string | null = null;
  let typesLocation: 'devDependencies' | 'dependencies' | null = null;

  try {
    const pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
    const devDeps = pkg.devDependencies as Record<string, string> | undefined;
    const deps = pkg.dependencies as Record<string, string> | undefined;

    if (devDeps?.['@types/node']) {
      typesNodeRaw = devDeps['@types/node'];
      typesLocation = 'devDependencies';
    } else if (deps?.['@types/node']) {
      typesNodeRaw = deps['@types/node'];
      typesLocation = 'dependencies';
    }
  } catch {
    return {
      status: 'warn',
      source,
      nodeVersion: { raw: null, major: null },
      typesNode: { raw: null, major: null, location: null },
      message: `Could not read or parse ${packagePath}`,
      fix: null,
    };
  }

  const typesNodeMajor = typesNodeRaw ? getMajorFromSpecifier(typesNodeRaw) : null;

  // Neither field present
  if (!nodeVersion.raw && !typesNodeRaw) {
    return {
      status: 'warn',
      source,
      nodeVersion,
      typesNode: { raw: null, major: null, location: null },
      message: `Neither ${label} nor @types/node found.`,
      fix: null,
    };
  }

  // Missing node version source
  if (!nodeVersion.raw) {
    return {
      status: 'warn',
      source,
      nodeVersion,
      typesNode: { raw: typesNodeRaw, major: typesNodeMajor, location: typesLocation },
      message: `No ${label} found. Cannot verify @types/node compatibility.`,
      fix,
    };
  }

  // Missing @types/node
  if (!typesNodeRaw) {
    return {
      status: 'warn',
      source,
      nodeVersion,
      typesNode: { raw: null, major: null, location: null },
      message: '@types/node is not installed. Cannot verify compatibility.',
      fix: nodeVersion.major ? `npm install -D @types/node@^${nodeVersion.major}` : null,
    };
  }

  // Could not parse node version
  if (nodeVersion.major === null) {
    return {
      status: 'warn',
      source,
      nodeVersion,
      typesNode: { raw: typesNodeRaw, major: typesNodeMajor, location: typesLocation },
      message: `Could not parse version from ${label}: "${nodeVersion.raw}"`,
      fix: null,
    };
  }

  // Could not parse @types/node
  if (typesNodeMajor === null) {
    return {
      status: 'warn',
      source,
      nodeVersion,
      typesNode: { raw: typesNodeRaw, major: null, location: typesLocation },
      message: `Could not parse major version from @types/node: "${typesNodeRaw}"`,
      fix: null,
    };
  }

  // Both parsed — compare
  if (nodeVersion.major === typesNodeMajor) {
    return {
      status: 'pass',
      source,
      nodeVersion,
      typesNode: { raw: typesNodeRaw, major: typesNodeMajor, location: typesLocation },
      message: `@types/node major (${typesNodeMajor}) matches ${label} major (${nodeVersion.major}).`,
      fix: null,
    };
  }

  return {
    status: 'fail',
    source,
    nodeVersion,
    typesNode: { raw: typesNodeRaw, major: typesNodeMajor, location: typesLocation },
    message: `@types/node major (${typesNodeMajor}) does not match ${label} major (${nodeVersion.major}).`,
    fix: `npm install -D @types/node@^${nodeVersion.major}`,
  };
}
