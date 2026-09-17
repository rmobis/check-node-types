import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { check } from '../src/checker.js';

const fixturePkg = (name: string) => resolve(import.meta.dirname, 'fixtures', name, 'package.json');

describe('check (engines source)', () => {
  it('passes when @types/node matches engines.node', () => {
    const result = check({ packagePath: fixturePkg('match'), source: 'engines' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(20);
    expect(result.fix).toBeNull();
  });

  it('fails when @types/node does not match engines.node', () => {
    const result = check({ packagePath: fixturePkg('mismatch'), source: 'engines' });
    expect(result.status).toBe('fail');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(22);
    expect(result.fix).toContain('@types/node@^20');
  });

  it('warns when engines.node is missing', () => {
    const result = check({ packagePath: fixturePkg('missing-engines'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.nodeVersion.raw).toBeNull();
    expect(result.message).toContain('engines.node');
  });

  it('warns when @types/node is missing', () => {
    const result = check({ packagePath: fixturePkg('missing-types'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.typesNode.raw).toBeNull();
    expect(result.fix).toContain('@types/node@^20');
  });

  it('handles complex engine ranges', () => {
    const result = check({ packagePath: fixturePkg('complex-range'), source: 'engines' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(18);
    expect(result.typesNode.major).toBe(18);
  });

  it('finds @types/node in dependencies (not just devDependencies)', () => {
    const result = check({ packagePath: fixturePkg('types-in-deps'), source: 'engines' });
    expect(result.status).toBe('pass');
    expect(result.typesNode.location).toBe('dependencies');
  });

  it('warns when neither field is present', () => {
    const result = check({ packagePath: fixturePkg('neither'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Neither');
  });

  it('warns when engines.node is unparseable', () => {
    const result = check({ packagePath: fixturePkg('unparseable-engines'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Could not parse');
  });

  it('warns when @types/node specifier is unparseable', () => {
    const result = check({ packagePath: fixturePkg('unparseable-types'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Could not parse');
  });

  it('warns when package.json does not exist', () => {
    const result = check({ packagePath: '/nonexistent/package.json', source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Could not read');
  });

  it('warns when package.json is malformed JSON', () => {
    const result = check({ packagePath: fixturePkg('malformed-json'), source: 'engines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Could not read');
  });

  it('prefers devDependencies over dependencies when both have @types/node', () => {
    const result = check({ packagePath: fixturePkg('both-deps'), source: 'engines' });
    expect(result.status).toBe('pass');
    expect(result.typesNode.location).toBe('devDependencies');
    expect(result.typesNode.major).toBe(20);
  });
});

describe('check (volta source)', () => {
  it('passes when @types/node matches volta.node', () => {
    const result = check({ packagePath: fixturePkg('volta'), source: 'volta' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.source).toBe('volta');
  });
});

describe('check (nvmrc source)', () => {
  it('passes when @types/node matches .nvmrc', () => {
    const result = check({ packagePath: fixturePkg('nvmrc'), source: 'nvmrc' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
  });

  it('handles v prefix in .nvmrc', () => {
    const result = check({ packagePath: fixturePkg('nvmrc-v-prefix'), source: 'nvmrc' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
  });
});

describe('check (node-version source)', () => {
  it('passes when @types/node matches .node-version', () => {
    const result = check({ packagePath: fixturePkg('node-version'), source: 'node-version' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
  });
});

describe('check (devEngines source)', () => {
  it('passes when @types/node matches devEngines.runtime object', () => {
    const result = check({ packagePath: fixturePkg('devEngines'), source: 'devEngines' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(20);
    expect(result.fix).toBeNull();
  });

  it('passes when @types/node matches devEngines.runtime array', () => {
    const result = check({ packagePath: fixturePkg('devEngines-array'), source: 'devEngines' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(20);
    expect(result.fix).toBeNull();
  });

  it('passes when @types/node matches devEngines.runtime array with multiple runtimes', () => {
    const result = check({ packagePath: fixturePkg('devEngines-array-multi'), source: 'devEngines' });
    expect(result.status).toBe('pass');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(20);
    expect(result.fix).toBeNull();
  });

  it('fails when @types/node does not match devEngines.runtime object', () => {
    const result = check({ packagePath: fixturePkg('mismatch-devEngines'), source: 'devEngines' });
    expect(result.status).toBe('fail');
    expect(result.nodeVersion.major).toBe(20);
    expect(result.typesNode.major).toBe(22);
    expect(result.fix).toContain('@types/node@^20');
  });

  it('warns when devEngines.runtime is missing', () => {
    const result = check({ packagePath: fixturePkg('missing-devEngines'), source: 'devEngines' });
    expect(result.status).toBe('warn');
    expect(result.nodeVersion.raw).toBeNull();
    expect(result.message).toContain('devEngines.runtime');
  });

  it('warns when devEngines.runtime is unparseable', () => {
    const result = check({ packagePath: fixturePkg('unparseable-devEngines'), source: 'devEngines' });
    expect(result.status).toBe('warn');
    expect(result.message).toContain('Could not parse');
  });
});
