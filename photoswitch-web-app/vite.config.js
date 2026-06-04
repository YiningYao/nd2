import { defineConfig } from 'vite';

function getGitHubPagesBase() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!repository) return './';
  const repoName = repository.split('/')[1];
  return repoName ? `/${repoName}/` : './';
}

export default defineConfig({
  base: process.env.VITE_BASE_PATH || getGitHubPagesBase(),
});
