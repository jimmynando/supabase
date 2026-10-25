// Prepara o ambiente do n8n: cria n8n/.env (com uma N8N_ENCRYPTION_KEY nova) se ele
// não existir e confere os pré-requisitos do Docker. Só usa Node, para funcionar igual
// em Windows, macOS e Linux.
//
// Uso: node n8n/init.mjs [--env-only]   (--env-only pula as checagens do Docker)

import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = dirname(fileURLToPath(import.meta.url));
const envPath = join(dir, '.env');
const examplePath = join(dir, '.env.example');
const supabaseNetwork = 'supabase_network_supabase';

function fail(message) {
  console.error(`\n[n8n] ${message}\n`);
  process.exit(1);
}

function ensureEnvFile() {
  if (existsSync(envPath)) {
    return;
  }
  copyFileSync(examplePath, envPath);
  const key = randomBytes(32).toString('hex');
  const content = readFileSync(envPath, 'utf8').replace(/^N8N_ENCRYPTION_KEY=.*$/m, `N8N_ENCRYPTION_KEY=${key}`);
  writeFileSync(envPath, content);
  console.log('[n8n] n8n/.env criado com uma N8N_ENCRYPTION_KEY nova (não versionar, não trocar depois).');
}

function checkDocker() {
  const compose = spawnSync('docker', ['compose', 'version'], { encoding: 'utf8' });
  if (compose.error || compose.status !== 0) {
    fail('"docker compose" não encontrado. Instale o Docker (Docker Desktop já inclui) ou o plugin docker-compose-plugin.');
  }
  const network = spawnSync('docker', ['network', 'inspect', supabaseNetwork], { encoding: 'utf8' });
  if (network.status !== 0) {
    fail(`Rede "${supabaseNetwork}" não encontrada. Suba o Supabase antes: npm run db:start (e não altere o project_id do config.toml).`);
  }
}

ensureEnvFile();
if (!process.argv.includes('--env-only')) {
  checkDocker();
}
