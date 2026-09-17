export type VersionSource = 'engines' | 'volta' | 'nvmrc' | 'node-version' | 'devEngines';

export interface CheckResult {
  status: 'pass' | 'fail' | 'warn';
  source: VersionSource;
  nodeVersion: {
    raw: string | null;
    major: number | null;
  };
  typesNode: {
    raw: string | null;
    major: number | null;
    location: 'devDependencies' | 'dependencies' | null;
  };
  message: string;
  fix: string | null;
}

export interface CliOptions {
  package: string;
  source: VersionSource;
  json: boolean;
  print: boolean;
  quiet: boolean;
  color: boolean;
}
