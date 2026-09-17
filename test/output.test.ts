import { describe, it, expect } from 'vitest';
import { formatResult, formatJson } from '../src/output.js';
import type { CheckResult, CliOptions } from '../src/types.js';

const baseOptions: CliOptions = { package: '.', source: 'engines', json: false, print: false, quiet: false, color: false };

const passResult: CheckResult = {
  status: 'pass',
  source: 'engines',
  nodeVersion: { raw: '>=20', major: 20 },
  typesNode: { raw: '^20.11.0', major: 20, location: 'devDependencies' },
  message: '@types/node major (20) matches engines.node major (20).',
  fix: null,
};

const failResult: CheckResult = {
  status: 'fail',
  source: 'engines',
  nodeVersion: { raw: '>=20', major: 20 },
  typesNode: { raw: '^22.1.0', major: 22, location: 'devDependencies' },
  message: '@types/node major (22) does not match engines.node major (20).',
  fix: 'npm install -D @types/node@^20',
};

const warnResult: CheckResult = {
  status: 'warn',
  source: 'engines',
  nodeVersion: { raw: null, major: null },
  typesNode: { raw: '^20.0.0', major: 20, location: 'devDependencies' },
  message: 'No engines.node found. Cannot verify @types/node compatibility.',
  fix: 'Add "engines": { "node": ">=XX" } to your package.json.',
};

describe('formatResult', () => {
  it('shows single line for pass', () => {
    const output = formatResult(passResult, baseOptions);
    expect(output).toContain('PASS');
    expect(output.split('\n')).toHaveLength(1);
  });

  it('shows both majors and fix for fail', () => {
    const output = formatResult(failResult, baseOptions);
    expect(output).toContain('FAIL');
    expect(output).toContain('20');
    expect(output).toContain('22');
    expect(output).toContain('Fix:');
    expect(output).toContain('npm install -D @types/node@^20');
  });

  it('shows message and fix for warn', () => {
    const output = formatResult(warnResult, baseOptions);
    expect(output).toContain('WARN');
    expect(output).toContain('engines.node');
    expect(output).toContain('Fix:');
  });

  it('does not include ANSI codes when color is false', () => {
    const output = formatResult(failResult, baseOptions);
    expect(output).not.toMatch(/\x1b\[/);
  });

  it('includes ANSI codes when color is true', () => {
    const output = formatResult(failResult, { ...baseOptions, color: true });
    expect(output).toMatch(/\x1b\[/);
  });

  it('returns empty string for pass in quiet mode', () => {
    const output = formatResult(passResult, { ...baseOptions, quiet: true });
    expect(output).toBe('');
  });

  it('still shows output for fail in quiet mode', () => {
    const output = formatResult(failResult, { ...baseOptions, quiet: true });
    expect(output).toContain('FAIL');
  });

  it('shows detected versions in print mode', () => {
    const output = formatResult(passResult, { ...baseOptions, print: true });
    expect(output).toContain('engines.node');
    expect(output).toContain('>=20');
    expect(output).toContain('@types/node');
    expect(output).toContain('^20.11.0');
    expect(output).not.toContain('PASS');
  });

  it('shows "not found" in print mode when values are missing', () => {
    const output = formatResult(warnResult, { ...baseOptions, print: true });
    expect(output).toContain('not found');
  });

  it('uses correct source label for volta', () => {
    const voltaResult: CheckResult = { ...failResult, source: 'volta' };
    const output = formatResult(voltaResult, baseOptions);
    expect(output).toContain('volta.node');
  });

  it('uses correct source label for devEngines', () => {
    const devEnginesResult: CheckResult = { ...failResult, source: 'devEngines' };
    const output = formatResult(devEnginesResult, baseOptions);
    expect(output).toContain('devEngines.runtime[.name=node].version');
  });
});

describe('formatJson', () => {
  it('returns valid JSON matching the result structure', () => {
    const output = formatJson(failResult);
    const parsed = JSON.parse(output);
    expect(parsed.status).toBe('fail');
    expect(parsed.nodeVersion.major).toBe(20);
    expect(parsed.typesNode.major).toBe(22);
    expect(parsed.fix).toBe('npm install -D @types/node@^20');
  });

  it('returns pretty-printed JSON', () => {
    const output = formatJson(passResult);
    expect(output).toContain('\n');
    expect(output.startsWith('{')).toBe(true);
  });
});
