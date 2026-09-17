import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { getMinMajorFromRange, getMajorFromSpecifier, readNodeVersion } from '../src/version-utils.js';

const fixture = (name: string) => resolve(import.meta.dirname, 'fixtures', name, 'package.json');

describe('getMinMajorFromRange', () => {
  it.each([
    ['>=20', 20],
    ['^20.0.0', 20],
    ['~20.11.0', 20],
    ['20.x', 20],
    ['>=18 <22', 18],
    ['>=18.0.0 || >=20.0.0', 18],
    ['20', 20],
    ['>=18.17.0', 18],
    ['*', 0],
  ])('parses "%s" as major %i', (range, expected) => {
    expect(getMinMajorFromRange(range)).toBe(expected);
  });

  it('returns null for unparseable input', () => {
    expect(getMinMajorFromRange('not-a-version')).toBeNull();
  });

  it('treats empty string as unconstrained (major 0)', () => {
    expect(getMinMajorFromRange('')).toBe(0);
  });

  it('handles whitespace-padded range', () => {
    expect(getMinMajorFromRange(' >=20 ')).toBe(20);
  });

  it('handles >=0', () => {
    expect(getMinMajorFromRange('>=0')).toBe(0);
  });

  it('handles pre-release version', () => {
    expect(getMinMajorFromRange('>=20.0.0-rc.1')).toBe(20);
  });
});

describe('getMajorFromSpecifier', () => {
  it.each([
    ['^22.1.0', 22],
    ['~20.0.0', 20],
    ['22.x', 22],
    ['22', 22],
    ['22.0.0', 22],
    ['^20.11.5', 20],
  ])('parses "%s" as major %i', (specifier, expected) => {
    expect(getMajorFromSpecifier(specifier)).toBe(expected);
  });

  it('returns null for "*"', () => {
    expect(getMajorFromSpecifier('*')).toBeNull();
  });

  it('returns null for "latest"', () => {
    expect(getMajorFromSpecifier('latest')).toBeNull();
  });
});

describe('readNodeVersion', () => {
  it('reads engines.node from package.json', () => {
    const result = readNodeVersion(fixture('match'), 'engines');
    expect(result.raw).toBe('>=20');
    expect(result.major).toBe(20);
  });

  it('reads volta.node from package.json', () => {
    const result = readNodeVersion(fixture('volta'), 'volta');
    expect(result.raw).toBe('20.11.0');
    expect(result.major).toBe(20);
  });

  it('reads devEngines.runtime[.name=node].version from package.json', () => {
    const result = readNodeVersion(fixture('devEngines'), 'devEngines');
    expect(result.raw).toBe('>=20');
    expect(result.major).toBe(20);
  });

  it('reads .nvmrc file', () => {
    const result = readNodeVersion(fixture('nvmrc'), 'nvmrc');
    expect(result.major).toBe(20);
  });

  it('reads .node-version file', () => {
    const result = readNodeVersion(fixture('node-version'), 'node-version');
    expect(result.major).toBe(20);
  });

  it('handles .nvmrc with v prefix', () => {
    const result = readNodeVersion(fixture('nvmrc-v-prefix'), 'nvmrc');
    expect(result.major).toBe(20);
  });

  it('returns null for missing source', () => {
    const result = readNodeVersion(fixture('missing-types'), 'volta');
    expect(result.raw).toBeNull();
    expect(result.major).toBeNull();
  });

  it('returns null for nonexistent package.json', () => {
    const result = readNodeVersion('/nonexistent/package.json', 'engines');
    expect(result.raw).toBeNull();
  });
});
