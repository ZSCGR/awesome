import path from 'path';
import * as core from '@actions/core';
import { readFile } from 'fs/promises';

import {
  renderer,
  REPO_USERNAME,
  generateMd,
  MARKDOWN_FILENAME,
  fetchAllStars,
  compactByLanguage,
  compactByTopic,
} from './fetchstars';
import git from './git';

export async function main() {
  let template = '';

  const customTemplatePath = core.getInput('template-path');
  if (customTemplatePath) {
    core.info(`check if customTemplatePath: ${customTemplatePath} exists`);
    try {
      template = await readFile(customTemplatePath, 'utf8');
    } catch {
      core.info("Couldn't find custom template file, using built-in default template");
    }
  }

  const accessToken = core.getInput('api-token', { required: true });

  const results = await fetchAllStars(accessToken, REPO_USERNAME || '');
  const files = [];

  const compactedByLanguage = compactByLanguage(results);
  const byLanguage = await renderer(
    {
      username: REPO_USERNAME,
      stars: Object.entries(compactedByLanguage),
      updatedAt: Date.now(),
    },
    template
  );

  files.push(
    {
      filename: MARKDOWN_FILENAME,
      data: await generateMd(byLanguage),
    },
    {
      filename: 'data.json',
      data: JSON.stringify(compactedByLanguage, null, 2),
    }
  );

  if (core.getInput('compact-by-topic') === 'true') {
    const compactedByTopic = compactByTopic(results);
    const byTopic = await renderer(
      {
        username: REPO_USERNAME,
        stars: Object.entries(compactedByTopic),
        updatedAt: Date.now(),
      },
      template
    );
    files.push({
      filename: 'topics.md',
      data: await generateMd(byTopic),
    });
  }

  await git.pushNewFiles(files);
}

export async function run(): Promise<void> {
  try {
    await main();
  } catch (error) {
    core.setFailed(`#run: ${error}`);
  }
}

const catchAll = (info: string) => {
  core.setFailed(`#catchAll: ${info}`);
  core.error(info);
};
process.on('unhandledRejection', catchAll);
process.on('uncaughtException', catchAll);

run().catch(core.error);