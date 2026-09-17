# check-node-types 🔬

**Keep `@types/node` in sync with your actual Node.js target.**

[![npm version](https://img.shields.io/npm/v/check-node-types.svg)](https://www.npmjs.com/package/check-node-types)
[![zero dependencies](https://img.shields.io/badge/dependencies-0-brightgreen.svg)](https://www.npmjs.com/package/check-node-types)
[![TypeScript](https://img.shields.io/badge/TypeScript-ready-blue.svg)](https://www.typescriptlang.org/)
[![node >= 20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)
[![license](https://img.shields.io/npm/l/check-node-types.svg)](https://github.com/janpaepke/check-node-types/blob/main/LICENSE)

---

## The Problem

`@types/node` major versions map directly to Node.js releases: `@types/node@22` provides types for Node.js 22.
If your project targets Node 20 but `@types/node` is `^22`, TypeScript will happily let you use Node 22 APIs that don't exist at runtime.

No existing linter, ESLint plugin, or package manager catches this drift. We searched. Extensively.

## Why Not Just…?

We evaluated every existing tool. None solve this.

| Tool                                      | What it does                                  | Why it's not enough                                                                                                                  |
| ----------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| **Dependabot**                            | Bumps `@types/node` to latest                 | [Cannot update `engines.node`](https://github.com/dependabot/dependabot-core/issues/1655). Will bump `@types/node` past your target. |
| **Renovate**                              | Can group `engines.node` + `@types/node` PRs  | Groups updates but doesn't _verify_ the majors match. Drift still possible from manual edits.                                        |
| **syncpack**                              | Enforces consistent versions across monorepos | Cannot cross-reference `engines` with `devDependencies`.                                                                             |
| **npm-package-json-lint**                 | Validates package.json fields                 | Has `valid-values-engines` but no cross-field comparison with dependency versions.                                                   |
| **eslint-plugin-package-json**            | Lints package.json                            | Has `require-engines` but nothing for dependency-to-engine consistency.                                                              |
| **ls-engines**                            | Checks dependency tree engine compatibility   | Checks engine _requirements_, not `@types/node` alignment.                                                                           |
| **check-engine** / **check-node-version** | Validates the running Node.js version         | Checks the _runtime_, not the _type definitions_.                                                                                    |
| **@tsconfig/node** bases                  | Sets `target`/`module` for a Node version     | Doesn't set or validate `@types/node`. Using `@tsconfig/node20` with `@types/node@24` produces no error.                             |
| **Shell one-liners**                      | Custom CI scripts                             | Work, but no standard solution — every team reinvents the wheel.                                                                     |

The gap is well-documented: [DefinitelyTyped Discussion #69418](https://github.com/DefinitelyTyped/DefinitelyTyped/discussions/69418) is the canonical thread where maintainers and users discuss the lack of tooling for this.

## The Recommended Workflow

`check-node-types` is designed as a **companion to [`check-node-version`](https://www.npmjs.com/package/check-node-version)**. Together they cover both sides of the Node.js version problem:

| Tool                 | What it checks                              |
| -------------------- | ------------------------------------------- |
| `check-node-version` | Is the **running** Node.js version correct? |
| `check-node-types`   | Is the **`@types/node` version** correct?   |

The recommended approach:

1. **Exclude `@types/node` from automated dependency updates** — tools like `npm-check-updates` or `npm-check` will always flag a new `@types/node` major as available, even when upgrading would be wrong for your project.
2. **Use `check-node-types` in CI or as a lint step** to verify that your `@types/node` stays in sync with your actual Node.js target.
3. **When you intentionally upgrade Node.js**, bump `@types/node` in the same commit.

This way you avoid the constant noise from update checkers, while still catching accidental drift.

---

## Install

```bash
npm install -D check-node-types
```

Or run directly:

```bash
npx check-node-types
```

## Usage

```bash
# Check using engines.node (default)
check-node-types

# Read Node.js version from different sources
check-node-types --source engines      # reads engines.node from package.json (default)
check-node-types --source devEngines   # reads devEngines.runtime from package.json
check-node-types --source volta        # reads volta.node from package.json
check-node-types --source nvmrc        # reads .nvmrc file
check-node-types --source node-version # reads .node-version file

# Point to a specific package.json
check-node-types --package ./packages/my-lib/package.json

# Print detected versions and exit
check-node-types --print

# Quiet mode — only output on error
check-node-types -q

# JSON output (for CI parsing)
check-node-types --json
```

### As an npm script

```json
{
	"scripts": {
		"check-types": "check-node-types"
	}
}
```

### In CI (GitHub Actions)

```yaml
- name: Verify @types/node matches target Node.js version
  run: npx check-node-types
```

### In a Dockerfile

```dockerfile
# Validate before installing dependencies
COPY package.json ./
RUN npx -y check-node-types
RUN npm ci
```

### With lint-staged / Husky

```json
{
	"lint-staged": {
		"package.json": ["check-node-types"]
	}
}
```

## Options

| Flag                | Short | Description                                   | Default          |
| ------------------- | ----- | --------------------------------------------- | ---------------- |
| `--source <source>` |       | Where to read the Node.js version (see below) | `engines`        |
| `--package <path>`  |       | Path to package.json                          | `./package.json` |
| `--print`           |       | Print detected versions and exit              |                  |
| `--quiet`           | `-q`  | Only output on error                          |                  |
| `--json`            |       | Output as JSON                                |                  |
| `--no-color`        |       | Disable colored output                        | auto-detect      |

### Version Sources

| Source         | Reads from                                             |
| -------------- | ------------------------------------------------------ |
| `engines`      | `engines.node` in package.json                         |
| `volta`        | `volta.node` in package.json                           |
| `devEngines`   | `devEngines.runtime` in package.json                   |
| `nvmrc`        | `.nvmrc` file in same directory as package.json        |
| `node-version` | `.node-version` file in same directory as package.json |

## Exit Codes

| Code | Meaning                                                                          |
| ---- | -------------------------------------------------------------------------------- |
| `0`  | Pass — versions match                                                            |
| `1`  | Fail — major version mismatch                                                    |
| `2`  | Warning — missing version source, missing `@types/node`, or unparseable versions |

## Example Output

**Pass:**

```
check-node-types: PASS
```

**Fail:**

```
check-node-types: FAIL
  engines.node major:  20
  @types/node major:   22

  Fix: npm install -D @types/node@^20
```

**Print:**

```
engines.node: >=20 (major: 20)
@types/node: ^20.11.0 (major: 20)
```

## How It Works

1. Reads the target Node.js version from the configured source (default: `engines.node`)
2. Reads the `@types/node` version from `devDependencies` or `dependencies`
3. Compares the major versions
4. Reports the result with an actionable fix command on mismatch

## License

MIT
