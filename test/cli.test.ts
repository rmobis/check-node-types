import { describe, it, expect } from 'vitest';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const cli = resolve(import.meta.dirname, '../dist/cli.mjs');
const fixturePkg = (name: string) => resolve(import.meta.dirname, 'fixtures', name, 'package.json');

function run(args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const stdout = execFileSync('node', [cli, ...args], { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], env: { ...process.env, NO_COLOR: '1' } });
    return { stdout, stderr: '', exitCode: 0 };
  } catch (err: unknown) {
    const e = err as { stdout: string; stderr: string; status: number };
    return { stdout: e.stdout ?? '', stderr: e.stderr ?? '', exitCode: e.status };
  }
}

describe('CLI', () => {
  it('exits 0 for matching versions', () => {
    const { exitCode, stdout } = run(['--package', fixturePkg('match')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('exits 1 for mismatched versions', () => {
    const { exitCode, stdout } = run(['--package', fixturePkg('mismatch')]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('FAIL');
  });

  it('exits 2 for warnings', () => {
    const { exitCode, stdout } = run(['--package', fixturePkg('missing-engines')]);
    expect(exitCode).toBe(2);
    expect(stdout).toContain('WARN');
  });

  it('outputs valid JSON with --json flag', () => {
    const { stdout } = run(['--json', '--package', fixturePkg('match')]);
    const parsed = JSON.parse(stdout);
    expect(parsed.status).toBe('pass');
  });

  it('--print shows versions and exits 0', () => {
    const { exitCode, stdout } = run(['--print', '--package', fixturePkg('match')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('engines.node');
    expect(stdout).toContain('@types/node');
    expect(stdout).not.toContain('PASS');
  });

  it('--quiet suppresses output on pass', () => {
    const { exitCode, stdout } = run(['-q', '--package', fixturePkg('match')]);
    expect(exitCode).toBe(0);
    expect(stdout.trim()).toBe('');
  });

  it('--quiet still shows output on fail', () => {
    const { exitCode, stdout } = run(['-q', '--package', fixturePkg('mismatch')]);
    expect(exitCode).toBe(1);
    expect(stdout).toContain('FAIL');
  });

  it('--source volta reads from volta.node', () => {
    const { exitCode, stdout } = run(['--source', 'volta', '--package', fixturePkg('volta')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('--source nvmrc reads from .nvmrc', () => {
    const { exitCode, stdout } = run(['--source', 'nvmrc', '--package', fixturePkg('nvmrc')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('--source node-version reads from .node-version', () => {
    const { exitCode, stdout } = run(['--source', 'node-version', '--package', fixturePkg('node-version')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('--source devEngines reads from devEngines.runtime[.name=node].version', () => {
    const { exitCode, stdout } = run(['--source', 'devEngines', '--package', fixturePkg('devEngines')]);
    expect(exitCode).toBe(0);
    expect(stdout).toContain('PASS');
  });

  it('--print --json outputs JSON and preserves exit code', () => {
    const { exitCode, stdout } = run(['--print', '--json', '--package', fixturePkg('mismatch')]);
    const parsed = JSON.parse(stdout);
    expect(parsed.status).toBe('fail');
    expect(exitCode).toBe(1);
  });

  it('rejects invalid --source values', () => {
    const { exitCode, stderr } = run(['--source', 'bogus', '--package', fixturePkg('match')]);
    expect(exitCode).toBe(2);
    expect(stderr).toContain('Invalid source');
  });
});
