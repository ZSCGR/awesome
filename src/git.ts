import * as core from '@actions/core';
import * as exec from '@actions/exec';
import fs from 'fs/promises';

const { GITHUB_REPOSITORY, GITHUB_REF } = process.env;
const branch = GITHUB_REF?.replace('refs/heads/', '') || 'main';

type File = {
  filename: string;
  data: string;
};

class Git {
  private isInitialized = false;

  constructor() {
    const githubToken = core.getInput('api-token', { required: true });
    core.setSecret(githubToken);
  }

  /**
   * 严格串行初始化 Git 配置，防止多进程抢占 .git/config 锁
   */
  async init() {
    if (this.isInitialized) return;

    const githubToken = core.getInput('api-token', { required: true });
    const githubName = core.getInput('github-name') || 'GitHub Actions';
    const githubEmail = core.getInput('github-email') || 'actions@users.noreply.github.com';

    await this.config('user.name', githubName);
    await this.config('user.email', githubEmail);
    await this.config('pull.rebase', 'false');

    // 拥抱现代 WHATWG URL API 拼接长 Token，原生安全不报错
    const rawUrl = `https://github.com/${GITHUB_REPOSITORY}.git`;
    const remoteUrl = new URL(rawUrl);
    remoteUrl.username = 'x-access-token';
    remoteUrl.password = githubToken;

    await this.updateOrigin(remoteUrl.toString());
    this.isInitialized = true;
  }

  isShallow = async () => {
    const isShallow: string = await this.exec('rev-parse --is-shallow-repository');
    return isShallow.trim().replace('\n', '') === 'true';
  };

  async exec(command: string): Promise<string> {
    let execOutput = '';

    const options = {
      listeners: {
        stdout: (data: Buffer) => {
          execOutput += data.toString();
        },
      },
      ignoreReturnCode: true 
    };

    const exitCode = await exec.exec(`git ${command}`, undefined, options);

    if (exitCode === 0) {
      return execOutput;
    } else {
      core.error(`Command "git ${command}" exited with code ${exitCode}.`);
      throw new Error(`Command "git ${command}" exited with code ${exitCode}.`);
    }
  }

  config = (prop: string, value: string) => this.exec(`config ${prop} "${value}"`);

  add = (file: string | string[]) => {
    let str = Array.isArray(file) ? file.join(' ') : file;
    return this.exec(`add ${str}`);
  };

  commit = (message: string) => this.exec(`commit -m "${message}"`);

  pull = async () => {
    const args = ['pull'];
    if (await this.isShallow()) {
      args.push('--unshallow');
    }
    args.push('--tags');
    
    const pullMethod = core.getInput('git-pull-method');
    if (pullMethod) args.push(pullMethod);

    return this.exec(args.join(' '));
  };

  push = () => this.exec(`push origin ${branch} --follow-tags`);
  updateOrigin = (repo: string) => this.exec(`remote set-url origin "${repo}"`);

  async pushNewFiles(files: File[] = []): Promise<unknown> {
    await this.init();
    if (!files.length) return;

    await this.pull();

    await Promise.all(
      files.map(({ filename, data }) => fs.writeFile(filename, data))
    );

    await this.add(files.map(({ filename }) => filename));
    await this.commit(`chore(updates): updated entries in files`);
    await this.push();
  }
}

export default new Git();