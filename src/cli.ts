import { Command } from 'commander';
import * as p from '@clack/prompts';

import { generateProject } from './generator/index.js';
import { resolveLayers } from './layers.js';
import { askQuestions } from './prompts.js';
import { info } from './utils/logger.js';

export async function run(): Promise<void> {
  const program = new Command()
    .name('create-yourname')
    .argument('[project-name]', 'name of the project')
    .option('-y, --yes', 'skip confirmation prompts')
    .parse();

  const options = program.opts<{ yes?: boolean }>();
  const [projectName] = program.args as [string | undefined];
  p.intro('create-yourname');

  const projectOptions = await askQuestions({
    name: projectName,
    yes: options.yes === true,
  });
  const layers = resolveLayers(projectOptions);
  await generateProject(projectOptions);

  info(
    [
      'Project options:',
      `  name: ${projectOptions.name}`,
      `  language: ${projectOptions.language}`,
      `  auth: ${projectOptions.auth}`,
      `  docker: ${projectOptions.docker}`,
      `  testing: ${projectOptions.testing}`,
      `  install: ${projectOptions.install}`,
      '',
      `Layers: ${layers.join(' -> ')}`,
      '',
      'Next steps:',
      `  cd ${projectOptions.name}`,
      ...(projectOptions.install ? [] : ['  npm install']),
      '  npm run dev',
    ].join('\n'),
  );
  p.outro('Project created.');
}
