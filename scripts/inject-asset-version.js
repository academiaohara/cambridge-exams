/**
 * Inyecta ?v=<build-id> en assets locales antes del deploy.
 * Usa VERCEL_GIT_COMMIT_SHA en Vercel o el hash git local en desarrollo.
 */
import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');

function getBuildId() {
  if (process.env.VERCEL_GIT_COMMIT_SHA) {
    return process.env.VERCEL_GIT_COMMIT_SHA.slice(0, 8);
  }
  try {
    return execSync('git rev-parse --short HEAD', {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore']
    }).trim();
  } catch {
    return 'dev';
  }
}

function versionizeUrl(url, buildId) {
  const base = url.split('?')[0];
  return `${base}?v=${buildId}`;
}

function patchIndexHtml(html, buildId) {
  return html.replace(
    /(href|src)=(["'])((?!https?:\/\/)(?:\/?)(?:css|js|Assets)\/[^"']+)(\2)/g,
    (match, attr, quote, url) => `${attr}=${quote}${versionizeUrl(url, buildId)}${quote}`
  );
}

function patchConfigJs(source, buildId) {
  if (/BUILD_ID:\s*['"][^'"]*['"]/.test(source)) {
    return source.replace(/BUILD_ID:\s*['"][^'"]*['"]/, `BUILD_ID: '${buildId}'`);
  }
  return source.replace(
    /APP_VERSION:\s*['"][^'"]*['"],/,
    (line) => `${line}\n    BUILD_ID: '${buildId}',`
  );
}

const buildId = getBuildId();
const indexPath = path.join(root, 'index.html');
const configPath = path.join(root, 'js', 'config.js');

const indexHtml = fs.readFileSync(indexPath, 'utf8');
const configJs = fs.readFileSync(configPath, 'utf8');

fs.writeFileSync(indexPath, patchIndexHtml(indexHtml, buildId));
fs.writeFileSync(configPath, patchConfigJs(configJs, buildId));

console.log(`Asset version injected: ${buildId}`);
