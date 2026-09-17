import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import semver from 'semver';
import type { VersionSource } from './types.js';

/**
 * Extract the minimum major version from a semver range string.
 * ">=20" -> 20, "^20.0.0" -> 20, ">=18 <22" -> 18, "20.x" -> 20
 */
export function getMinMajorFromRange(range: string): number | null {
  try {
    const min = semver.minVersion(range);
    if (min) return min.major;
  } catch {
    // Invalid range — fall through to coerce
  }

  const coerced = semver.coerce(range);
  if (coerced) return coerced.major;

  return null;
}

/**
 * Extract the major version from a dependency version specifier.
 * "^22.1.0" -> 22, "~20.0.0" -> 20, "22.x" -> 22
 * Returns null for "*", "latest", or unparseable values.
 */
export function getMajorFromSpecifier(specifier: string): number | null {
  if (specifier === '*' || specifier === 'latest') return null;

  const coerced = semver.coerce(specifier);
  if (coerced) return coerced.major;

  return null;
}

/**
 * Read the target Node.js version from the given source.
 * Returns { raw, major } or { raw: null, major: null } if not found.
 */
export function readNodeVersion(
  packagePath: string,
  source: VersionSource,
): { raw: string | null; major: number | null } {
  const dir = dirname(packagePath);

  switch (source) {
    case 'engines':
    case 'volta':
    case 'devEngines': {
      let pkg: Record<string, unknown>;
      try {
        pkg = JSON.parse(readFileSync(packagePath, 'utf-8'));
      } catch {
        return { raw: null, major: null };
      }

      if (source === 'engines') {
        const engines = pkg.engines as Record<string, string> | undefined;
        const raw = engines?.node ?? null;
        return { raw, major: raw ? getMinMajorFromRange(raw) : null };
      } else if (source === 'volta') {
        const volta = pkg.volta as Record<string, string> | undefined;
        const raw = volta?.node ?? null;
        return { raw, major: raw ? getMajorFromSpecifier(raw) : null };
      } else {
        const devEngines = pkg.devEngines as Record<string, unknown>;
        const runtimeEngines = devEngines?.runtime as Record<string, string>[];
        const nodeEngine = runtimeEngines?.find(devEngine => devEngine?.name === 'node') as Record<string, string>;
        const raw = nodeEngine?.version ?? null;
        return { raw, major: raw ? getMinMajorFromRange(raw) : null };
      }
    }

    case 'nvmrc':
    case 'node-version': {
      const filename = source === 'nvmrc' ? '.nvmrc' : '.node-version';
      try {
        const raw = readFileSync(resolve(dir, filename), 'utf-8').trim();
        if (!raw) return { raw: null, major: null };
        // Strip leading "v" if present
        const cleaned = raw.startsWith('v') ? raw.slice(1) : raw;
        return { raw, major: getMajorFromSpecifier(cleaned) };
      } catch {
        return { raw: null, major: null };
      }
    }
  }
}

const SOURCE_LABELS: Record<VersionSource, string> = {
  engines: 'engines.node',
  volta: 'volta.node',
  nvmrc: '.nvmrc',
  'node-version': '.node-version',
  devEngines: 'devEngines.runtime[.name=node].version',
};

export function sourceLabel(source: VersionSource): string {
  return SOURCE_LABELS[source];
}
