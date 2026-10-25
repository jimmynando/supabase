# Supabase local

Ambiente Supabase local do time, versionado neste repositório. O Supabase CLI é instalado como dependência do projeto (npm), com a versão fixada, para que todos usem exatamente a mesma, em qualquer sistema operacional.

## Sumário

1. [Visão geral](#1-visão-geral)
2. [Pré-requisitos](#2-pré-requisitos)
3. [Primeiros passos](#3-primeiros-passos)
4. [Estrutura do repositório](#4-estrutura-do-repositório)
5. [Scripts npm](#5-scripts-npm)
6. [Fluxo de trabalho](#6-fluxo-de-trabalho)
7. [Configuração](#7-configuração)
8. [Projeto remoto](#8-projeto-remoto)
9. [Convenções do repositório](#9-convenções-do-repositório)
10. [Solução de problemas](#10-solução-de-problemas)
11. [n8n (automações)](#11-n8n-automações)
12. [Referências](#12-referências)

## 1. Visão geral

Este repositório contém a configuração do stack Supabase que roda localmente via Docker: banco Postgres, Auth, API REST, Storage, Studio (interface web) e Inbucket (caixa de e-mails de teste), além das migrations e do seed.

Serviços **desabilitados** em `supabase/config.toml`:

| Serviço | Motivo |
| --- | --- |
| Realtime | O time não utiliza. |
| Edge Functions (`edge_runtime`) | O time não utiliza. |
| Analytics (Logflare/Vector) | É o serviço mais pesado do stack e, no Windows, exige expor o daemon do Docker via TCP. Sem ele, os logs não aparecem no Studio. |

Para reativá-los, veja [Configuração](#7-configuração).

## 2. Pré-requisitos

| Ferramenta | Versão | Observação |
| --- | --- | --- |
| Node.js | 22 ou superior (`.nvmrc`) | O `package.json` exige via `engines`. |
| npm | o que acompanha o Node | Gerenciador padrão do time. Não use pnpm/yarn aqui. |
| Docker | Engine ou Desktop recente | Precisa estar em execução. |
| Git | qualquer versão recente | |
| Docker Compose v2 | `docker compose version` deve funcionar | Necessário para o n8n. O Docker Desktop já inclui; em Linux instale o `docker-compose-plugin`. |
| Memória | 7 GB livres para o Docker (sugerido) | |

Não instale o Supabase CLI globalmente: ele vem com `npm install` e é executado pelos scripts npm.

### Windows

1. Instale o [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) com o backend **WSL2** habilitado.
2. Instale o [Node.js 22+](https://nodejs.org/) e o [Git para Windows](https://git-scm.com/download/win).
3. Os comandos funcionam em PowerShell, cmd ou Git Bash. Os scripts npm não usam recursos específicos de shell.
4. As quebras de linha do repositório são LF (ver `.gitattributes`). Se o seu Git estiver com `core.autocrlf=true`, o `.gitattributes` prevalece, mas confira com `git ls-files --eol`.
5. Não use `npm install --ignore-scripts`: o pacote `supabase` baixa o binário do CLI no `postinstall`.

### Fedora

```bash
sudo dnf install -y dnf-plugins-core
sudo dnf config-manager addrepo --from-repofile=https://download.docker.com/linux/fedora/docker-ce.repo
sudo dnf install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # faça logout/login depois
```

Instale o Node 22+ via [nvm](https://github.com/nvm-sh/nvm) (`nvm install` dentro do repositório lê o `.nvmrc`) ou pelo gerenciador de pacotes.

### Ubuntu / Debian

Siga o guia oficial: <https://docs.docker.com/engine/install/ubuntu/>. Depois:

```bash
sudo systemctl enable --now docker
sudo usermod -aG docker "$USER"   # faça logout/login depois
```

Instale o Node 22+ via [nvm](https://github.com/nvm-sh/nvm) ou NodeSource.

### macOS

Docker Desktop (ou OrbStack) e Node 22+ (nvm ou Homebrew).

> Podman não é oficialmente suportado pelo Supabase CLI sem ajustes adicionais. Use Docker.

## 3. Primeiros passos

```bash
git clone <url-do-repositorio>
cd supabase
nvm use            # opcional, se usar nvm (Linux/macOS)
npm install
npm run db:start
```

Na primeira execução o Docker baixa as imagens, o que pode demorar alguns minutos. Ao final o CLI imprime as URLs e chaves locais. Para vê-las de novo:

```bash
npm run db:status
```

Endereços padrão:

| Serviço | URL |
| --- | --- |
| API (REST/Auth/Storage) | <http://127.0.0.1:54321> |
| Banco (Postgres) | `postgresql://postgres:postgres@127.0.0.1:54322/postgres` |
| Studio | <http://127.0.0.1:54323> |
| Inbucket (e-mails de teste) | <http://127.0.0.1:54324> |

As chaves exibidas são **apenas locais** e iguais para todos; não são segredos de produção.

Para desligar o ambiente:

```bash
npm run db:stop
```

## 4. Estrutura do repositório

```text
.
├── supabase/
│   ├── config.toml        # configuração do stack local (serviços, portas, auth, etc.)
│   ├── migrations/        # migrations SQL, aplicadas em ordem cronológica
│   └── seed.sql           # dados iniciais, aplicados após as migrations no db:reset
├── n8n/
│   ├── docker-compose.yml # n8n em container, na rede do Supabase
│   ├── init.mjs           # cria o n8n/.env e confere Docker/rede (usado pelos scripts n8n:*)
│   └── .env.example       # modelo das variáveis do n8n (copie para n8n/.env)
├── package.json           # scripts npm e versão fixada do Supabase CLI
├── package-lock.json      # trava as dependências (versionar sempre)
├── .npmrc                 # save-exact e engine-strict
├── .nvmrc                 # versão do Node
├── .gitattributes         # força LF nos arquivos de texto
├── .editorconfig          # estilo básico de edição
└── .gitignore
```

## 5. Scripts npm

| Script | Comando | O que faz |
| --- | --- | --- |
| `npm run db:start` | `supabase start` | Sobe o stack local. |
| `npm run db:stop` | `supabase stop` | Para o stack (os dados são preservados em volumes Docker). |
| `npm run db:status` | `supabase status` | Mostra URLs e chaves locais. |
| `npm run db:reset` | `supabase db reset` | Recria o banco local aplicando migrations e seed. **Apaga os dados locais.** |
| `npm run migration:new -- <nome>` | `supabase migration new` | Cria um arquivo de migration vazio. |
| `npm run db:link` | `supabase link` | Vincula o repositório a um projeto remoto. |
| `npm run db:push` | `supabase db push` | Aplica as migrations no projeto remoto vinculado. |
| `npm run n8n:init` | `node n8n/init.mjs` | Cria o `n8n/.env` (se não existir) e confere os pré-requisitos. |
| `npm run n8n:start` | `docker compose up -d` | Roda o `n8n:init` e sobe o n8n (exige o Supabase em execução). |
| `npm run n8n:stop` | `docker compose down` | Para o n8n (os dados ficam no volume Docker). |
| `npm run n8n:logs` | `docker compose logs -f` | Acompanha os logs do n8n. |

Qualquer outro comando do CLI pode ser executado com `npx supabase <comando>`.

## 6. Fluxo de trabalho

O fluxo de trabalho do time (branches, revisão, deploy, convenções de nome) ainda não foi definido. Abaixo está apenas o mecanismo básico das ferramentas.

**Criar uma migration**

```bash
npm run migration:new -- nome_da_migration
```

O comando cria `supabase/migrations/<timestamp>_nome_da_migration.sql`. Escreva o SQL nesse arquivo.

**Validar localmente**

```bash
npm run db:reset
```

Recria o banco do zero aplicando todas as migrations em ordem e, em seguida, o `seed.sql`. Se terminar sem erro, as migrations são aplicáveis.

**Seed**

`supabase/seed.sql` contém dados iniciais para desenvolvimento local. Ele roda a cada `db:reset`, depois das migrations.

> As convenções do time serão documentadas nesta seção quando forem definidas.

## 7. Configuração

Toda a configuração do stack local está em `supabase/config.toml`, versionada e válida para todo o time.

Pontos principais:

- **`project_id`**: nomeia os containers e volumes Docker (`supabase_db_<project_id>`). Deve ser único por projeto na máquina.
- **`[db] major_version`**: precisa ser igual à versão major do Postgres do projeto remoto.
- **Portas**: API `54321`, banco `54322`, Studio `54323`, Inbucket `54324`. Se alguma estiver ocupada, altere em `config.toml`.
- **Reativar um serviço desligado**: troque `enabled = false` para `true` na seção correspondente (`[realtime]`, `[edge_runtime]`, `[analytics]`) e rode `npm run db:stop` e `npm run db:start`. Ao reativar Edge Functions, crie a pasta `supabase/functions/`.

Se precisar de segredos (por exemplo, chaves de OAuth), referencie variáveis de ambiente no `config.toml` com `env(NOME)` e guarde os valores em um arquivo `.env`, que é ignorado pelo Git.

## 8. Projeto remoto

Esta etapa é opcional para quem só desenvolve localmente.

```bash
npx supabase login                          # abre o navegador para gerar um token pessoal
npm run db:link -- --project-ref <ref>      # vincula ao projeto remoto
npm run db:push                             # aplica as migrations no remoto
```

- Cada pessoa usa o seu próprio token. **Nunca** versione tokens, senhas ou o `.env`.
- O `<ref>` do projeto aparece na URL do painel (`https://supabase.com/dashboard/project/<ref>`).
- Combinem no time quem pode executar `db:push`.
- O vínculo fica em `supabase/.temp/`, que é ignorado pelo Git.

## 9. Convenções do repositório

- **Quebras de linha LF** em todos os arquivos de texto (`.gitattributes`).
- **`.editorconfig`**: UTF-8, indentação de 2 espaços, newline no fim do arquivo. A maioria dos editores o respeita nativamente ou por plugin.
- **`.gitignore`**: `node_modules/`, `supabase/.temp/`, `supabase/.branches/` e `.env*` (exceto `.env.example`).
- **Versão do CLI fixada**: `.npmrc` usa `save-exact=true` e o `package-lock.json` é versionado. Para atualizar o CLI:

  ```bash
  npm install -D supabase@latest
  ```

  Depois rode `npm run db:stop`, `npm run db:start` e `npm run db:reset` para validar, revise as mudanças do `config.toml` (`npx supabase init --force` não deve ser usado, pois sobrescreve a configuração) e faça o commit do `package.json` e do `package-lock.json`.
- **`supabase/migrations/.gitkeep`** mantém a pasta no Git enquanto não houver migrations. O CLI imprime um aviso inofensivo sobre ele; pode ser removido depois da primeira migration.

## 10. Solução de problemas

**`Cannot connect to the Docker daemon`**
O Docker não está em execução. Inicie o Docker Desktop (Windows/macOS) ou `sudo systemctl start docker` (Linux).

**`permission denied` ao acessar o Docker (Linux)**
Seu usuário não está no grupo `docker`: `sudo usermod -aG docker "$USER"` e faça logout/login.

**Porta já em uso (`54321`–`54324`)**
Outro projeto Supabase ou serviço está usando a porta. Rode `npm run db:stop` no outro projeto ou altere as portas em `supabase/config.toml`.

**Containers antigos ou órfãos**
```bash
npx supabase stop --no-backup   # para e apaga os volumes locais
docker ps -a                    # confira o que sobrou
```

**Lentidão ou containers sendo mortos (falta de memória)**
Aumente a memória do Docker (Docker Desktop: Settings > Resources; WSL2: `memory=` em `%UserProfile%\.wslconfig`) e mantenha os serviços não usados desabilitados.

**Windows: erros com scripts ou arquivos `.sql`/`.toml` modificados sem motivo**
Provável conversão para CRLF. Rode `git ls-files --eol` para conferir e garanta que o editor está salvando com LF (`.editorconfig`).

**`supabase: command not found` ou binário do CLI ausente**
O `npm install` foi executado com `--ignore-scripts` ou falhou no `postinstall`. Apague `node_modules` e rode `npm install` novamente. Use sempre `npm run ...` ou `npx supabase ...`.

**`network supabase_network_supabase declared as external, but could not be found`**
O Supabase não está em execução (a rede só existe com ele no ar). Rode `npm run db:start` e depois `npm run n8n:start`. Confira o nome com `docker network ls`.

**`EBADENGINE` ao instalar**
A versão do Node é inferior à exigida. Use Node 22 ou superior (`nvm use`).

**Imagens Docker não baixam**
Verifique a conexão, proxies corporativos e se o login no registry do Docker não está bloqueando (`docker logout public.ecr.aws`).

## 11. n8n (automações)

O n8n roda em um container próprio (`n8n/docker-compose.yml`) e entra na rede Docker do Supabase (`supabase_network_<project_id>`). Por isso ele enxerga os containers do Supabase pelo nome, sem depender de `localhost`.

**Subir**

```bash
npm install
npm run db:start      # o Supabase precisa estar no ar antes
npm run n8n:start
```

Na primeira execução o `n8n:start` cria o `n8n/.env` sozinho, com uma `N8N_ENCRYPTION_KEY` nova, e confere se o `docker compose` existe e se a rede do Supabase está no ar. Se algo faltar, ele diz o que fazer.

O n8n abre em <http://localhost:5678>; na primeira vez ele pede a criação do usuário owner. Os dados (workflows, credenciais, owner) ficam no volume Docker `n8n_n8n_data`, em SQLite, na máquina de cada pessoa, e não em `n8n/`. Para zerar o n8n: `npm run n8n:stop` e depois `docker volume rm n8n_n8n_data` (apaga tudo).

**Endereços do Supabase vistos de dentro do n8n**

| O quê | Endereço |
| --- | --- |
| API (REST `/rest/v1`, Auth `/auth/v1`, Storage `/storage/v1`) | `http://supabase_kong_supabase:8000` |
| Postgres | host `supabase_db_supabase`, porta **5432** (interna, não a 54322), usuário/senha/banco `postgres` |
| App rodando no host (ex.: front em `:3000`) | `http://host.docker.internal:3000` |

Os nomes `supabase_*_supabase` usam o `project_id` do `config.toml`. **Não altere o `project_id`**, senão os nomes mudam e o `docker-compose.yml` do n8n deixa de achar a rede.

**Credenciais no n8n** (criadas à mão em cada máquina, dentro do n8n)

- **Postgres**: os dados da tabela acima.
- **Supabase API** (nó Supabase): Host `http://supabase_kong_supabase:8000` e Service Role Secret igual ao `service_role key` de `npm run db:status`.
- **HTTP Request** (sem nó dedicado): `GET http://supabase_kong_supabase:8000/rest/v1/<tabela>` com os headers `apikey: <chave>` e `Authorization: Bearer <chave>`.

A `N8N_ENCRYPTION_KEY` é de cada pessoa e não deve ser versionada nem trocada depois de criar credenciais (elas deixam de abrir). O `n8n/.env` é ignorado pelo Git, e o `n8n:start` nunca sobrescreve um `.env` existente. Se apagar o `.env` mas manter o volume, o n8n não sobe (chave diferente da gravada): restaure a chave antiga ou apague o volume.

## 12. Referências

- [Supabase CLI](https://supabase.com/docs/guides/local-development/cli/getting-started)
- [Referência de comandos do CLI](https://supabase.com/docs/reference/cli/introduction)
- [Desenvolvimento local](https://supabase.com/docs/guides/local-development)
- [Migrations de banco de dados](https://supabase.com/docs/guides/deployment/database-migrations)
- [Referência do `config.toml`](https://supabase.com/docs/guides/local-development/cli/config)
