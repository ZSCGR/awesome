import ejs from 'ejs';
import * as core from '@actions/core';
import { remark } from 'remark';
import toc from 'remark-toc';
import { Octokit } from '@octokit/rest';

export const REPO_USERNAME = process.env.GITHUB_REPOSITORY?.split('/')[0];
export const API_STARRED_URL = `${process.env.GITHUB_API_URL}/users/${REPO_USERNAME}/starred`;

// ⚡ 降维打击：将原版 EJS 模板作为固件直接内嵌在代码中，彻底斩断对物理文件的依赖
const DEFAULT_TEMPLATE = `# Awesome Stars

A curated list of my GitHub stars by language/topic!

## Contents

<% stars.forEach(function([category, repos]) { %>
- [<%= category %>](#<%= category.toLowerCase().replace(/[^a-z0-9]+/g, '-') %>)
<% }); %>

<% stars.forEach(function([category, repos]) { %>
## <%= category %>

<% repos.forEach(function(repo) { %>
- [<%= repo.full_name %>](<%= repo.html_url %>) - <%= repo.description || 'No description' %>
<% }); %>
  
<% }); %>
`;

export async function renderer(
  data: { [key: string]: unknown },
  templateString: string
): Promise<string> {
  try {
    // 如果外部没有成功传入自定义模板内容，直接使用内置的默认模板进行渲染
    return ejs.render(templateString || DEFAULT_TEMPLATE, data);
  } catch (error) {
    core.setFailed(`#renderer: ${error}`);
    return '';
  }
}

export function generateMd(data: string): Promise<string> {
  return new Promise((resolve) => {
    remark()
      .use(toc)
      .process(data, function (error, file) {
        if (error) {
          core.error('#generateMd');
          core.error(error);
          resolve('');
        }
        resolve(String(file));
      });
  });
}

export const MARKDOWN_FILENAME: string = core.getInput('output-filename');

/**
 * 官方正统异步分页迭代器：拉取用户所有的 Star 仓库
 */
export async function fetchAllStars(accessToken: string, username: string): Promise<any[]> {
  const octokit = new Octokit({ auth: accessToken });
  const stars: any[] = [];

  const iterator = octokit.paginate.iterator(octokit.rest.activity.listReposStarredByUser, {
    username: username,
    per_page: 100,
  });

  for await (const { data } of iterator) {
    stars.push(...data);
  }

  return stars;
}

/**
 * 原生语言分类工具
 */
export function compactByLanguage(stars: any[] = []) {
  return stars.reduce((acc: any, star: any) => {
    const lang = star.language || 'miscellaneous';
    if (!acc[lang]) acc[lang] = [];
    acc[lang].push(star);
    return acc;
  }, {});
}

/**
 * 原生标签分类工具
 */
export function compactByTopic(stars: any[] = []) {
  return stars.reduce((acc: any, star: any) => {
    const targetTopics = (star as any).topics;
    if (!Array.isArray(targetTopics)) return acc;
    
    const topics = targetTopics.length === 0 ? ['miscellaneous'] : targetTopics;
    for (const topic of topics) {
      if (!acc[topic]) acc[topic] = [];
      acc[topic].push(star);
    }
    return acc;
  }, {});
}