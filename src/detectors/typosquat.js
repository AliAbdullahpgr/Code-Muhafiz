// Typosquat detector (DETECTION_RULES §3). Pure heuristic, no network.

const POPULAR_NPM = [
  'cross-env', 'express', 'lodash', 'react', 'react-dom', 'axios', 'chalk', 'debug', 'request',
  'moment', 'commander', 'vue', 'angular', 'jquery', 'underscore', 'async', 'bluebird', 'uuid',
  'classnames', 'prop-types', 'yargs', 'minimist', 'mkdirp', 'rimraf', 'glob', 'semver', 'colors',
  'webpack', 'babel-core', 'typescript', 'eslint', 'prettier', 'jest', 'mocha', 'chai', 'sinon',
  'next', 'nuxt', 'socket.io', 'mongoose', 'mongodb', 'mysql', 'mysql2', 'pg', 'redis', 'ioredis',
  'sequelize', 'knex', 'dotenv', 'cors', 'body-parser', 'cookie-parser', 'morgan', 'helmet',
  'jsonwebtoken', 'bcrypt', 'bcryptjs', 'passport', 'nodemon', 'fs-extra', 'inquirer', 'ora',
  'node-fetch', 'cheerio', 'puppeteer', 'electron', 'rxjs', 'tslib', 'core-js', 'regenerator-runtime',
  'qs', 'ws', 'graphql', 'apollo-server', 'redux', 'react-redux', 'react-router', 'react-router-dom',
  'styled-components', 'tailwindcss', 'postcss', 'autoprefixer', 'sass', 'less', 'vite', 'rollup',
  'esbuild', 'parcel', 'gulp', 'grunt', 'browserify', 'nodemailer', 'multer', 'sharp', 'jimp',
  'validator', 'joi', 'yup', 'zod', 'ajv', 'date-fns', 'dayjs', 'luxon', 'immutable', 'ramda',
  'npm', 'yarn', 'pnpm', 'event-stream', 'ua-parser-js', 'coa', 'rc', 'node-ipc', 'faker',
  'eslint-scope', 'mime', 'mime-types', 'through2', 'readable-stream', 'once', 'inherits',
  'safe-buffer', 'string-width', 'strip-ansi', 'ansi-regex', 'ansi-styles', 'supports-color',
  'escape-string-regexp', 'has-flag', 'ms', 'electron-builder', 'shelljs', 'execa', 'cross-spawn',
  'which', 'chokidar', 'handlebars', 'ejs', 'pug', 'marked', 'highlight.js', 'd3', 'three',
  'chart.js', 'socket.io-client', 'superagent', 'got', 'form-data', 'http-proxy', 'koa', 'hapi',
  'fastify', 'nestjs', 'loopback', 'winston', 'pino', 'bunyan', 'log4js', 'cookie', 'jsdom',
  'xml2js', 'yaml', 'js-yaml', 'json5', 'crypto-js', 'node-sass', 'bootstrap', 'web3', 'ethers',
  'discord.js', 'telegraf', 'openai', 'aws-sdk', 'firebase', 'stripe', 'twilio', 'babel-loader',
  'css-loader', 'style-loader', 'file-loader', 'url-loader', 'html-webpack-plugin',
];

const POPULAR_PYPI = [
  'requests', 'numpy', 'flask', 'django', 'urllib3', 'beautifulsoup4', 'pandas', 'scipy',
  'matplotlib', 'scikit-learn', 'tensorflow', 'torch', 'keras', 'pillow', 'boto3', 'botocore',
  'setuptools', 'pip', 'wheel', 'six', 'python-dateutil', 'pytz', 'pyyaml', 'jinja2', 'click',
  'certifi', 'idna', 'chardet', 'charset-normalizer', 'cryptography', 'pyopenssl', 'paramiko',
  'sqlalchemy', 'psycopg2', 'pymysql', 'redis', 'celery', 'fastapi', 'uvicorn', 'pydantic',
  'pytest', 'tox', 'black', 'flake8', 'pylint', 'mypy', 'colorama', 'tqdm', 'selenium',
  'scrapy', 'lxml', 'httpx', 'aiohttp', 'jellyfish', 'simplejson', 'openai',
  'transformers', 'opencv-python', 'nltk', 'virtualenv', 'gunicorn', 'werkzeug', 'markupsafe',
  'attrs', 'protobuf', 'grpcio',
];

const POPULAR = { npm: new Set(POPULAR_NPM), PyPI: new Set(POPULAR_PYPI) };

// Legitimate packages that happen to sit 1-2 edits from a popular name.
const KNOWN_GOOD = new Set([
  'preact', 'color', 'inherit', 'cookies', 'tslint', 'nest', 'through', 'safer-buffer',
  'boto', 'scapy', 'pymssql', 'jinja', 'urllib', 'mysql2', 'react-is', 'yamljs',
]);

export function levenshtein(a, b) {
  if (a === b) return 0;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    const cur = [i];
    for (let j = 1; j <= b.length; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[b.length];
}

// Strip separators and js/py/python prefixes/suffixes so "lodash-js" ~ "lodash".
function normalize(name) {
  return name
    .toLowerCase()
    .replace(/^(node|python|py|js)[-_.]/, '')
    .replace(/[-_.](js|py|python)$/, '')
    .replace(/[-_.]/g, '');
}

/** Return the popular package `name` imitates, or null. */
export function findImitated(name, ecosystem = 'npm') {
  const list = POPULAR[ecosystem] || POPULAR.npm;
  const lower = String(name).toLowerCase();
  // PyPI names are case/separator-insensitive; treat "-" and "_" as equal.
  const canon = ecosystem === 'PyPI' ? lower.replace(/[_.]/g, '-') : lower;
  if (list.has(canon) || KNOWN_GOOD.has(canon)) return null;
  // Scoped packages (@org/x) are out of scope for this heuristic.
  if (canon.startsWith('@')) return null;

  const norm = normalize(canon);
  for (const pop of list) {
    const maxDist = canon.length >= 8 ? 2 : 1;
    // Avoid flagging very short names (e.g. "pg" vs "pm") — too noisy.
    if (pop.length >= 4 && Math.abs(pop.length - canon.length) <= maxDist && levenshtein(canon, pop) <= maxDist) {
      return pop;
    }
    if (norm.length >= 3 && norm === normalize(pop)) return pop;
  }
  return null;
}

export function detectTyposquats(deps = []) {
  const seen = new Set();
  const findings = [];
  for (const dep of deps) {
    const key = `${dep.ecosystem}:${String(dep.name).toLowerCase()}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const popular = findImitated(dep.name, dep.ecosystem);
    if (!popular) continue;
    findings.push({
      type: 'typosquat',
      severity: 'high',
      title: `Possible typosquat: "${dep.name}" imitates "${popular}"`,
      description:
        `The package "${dep.name}" has a name nearly identical to the popular package "${popular}". ` +
        `Attackers publish look-alike names hoping developers mistype them; such packages often steal secrets on install.`,
      package: dep.name,
      version: dep.version || undefined,
      ecosystem: dep.ecosystem,
      file: dep.file,
      evidence: `${dep.name} ≈ ${popular}`,
      source: 'heuristic',
      references: [],
      fix: `Replace with ${popular}`,
      ruleId: 'typosquat',
    });
  }
  return findings;
}
