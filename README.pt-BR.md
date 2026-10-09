# AidBlink — ajuda emergencial em um único link

> 🌐 **English:** [README.md](./README.md)

O AidBlink transforma um Solana Blink (um link de transação compartilhável) em
um pipeline de ajuda transparente: apoiadores contribuem com SOL, uma
organização direciona o caixa para necessidades reais, e a pessoa em situação de
vulnerabilidade recebe um **voucher de benefício de uso único** para alimentação
ou transporte — sem carteira, sem conhecimento de cripto do lado de quem recebe.

> **Protótipo de hackathon.** As contribuições são transações reais na Devnet da
> Solana, registradas on-chain pelo programa Anchor do AidBlink. Valores de
> benefício, parceiros e resgate são simulados. Os vouchers não têm valor
> monetário.

---

## O problema

Pessoas em situação de vulnerabilidade muitas vezes precisam de algo pequeno e
imediato: uma refeição, uma passagem de ônibus até a clínica. As doações se
perdem na distância entre quem doa e quem é ajudado, e as pessoas que mais
precisam raramente conseguem lidar com carteiras ou taxas on-chain.

## Nossa abordagem

Manter a cripto exatamente onde ela agrega valor — **financiamento,
transparência e auditabilidade** — e manter o fluxo humano simples:

| Etapa | Quem | O que acontece |
| --- | --- | --- |
| 1. Contribuir | Apoiador | Abre um Blink e envia SOL. Transferência real na Devnet. |
| 2. Administrar | Organização | Vê o caixa, registra pedidos pseudônimos, aprova um benefício. |
| 3. Entregar | Pessoa em necessidade | Recebe um voucher de uso único com QR code. Um parceiro resgata uma vez. |

O lado de quem recebe nunca toca em uma carteira. Dados pessoais nunca vão para
a chain — os beneficiários são referências pseudônimas como `BEN-4821`.

## O que é real vs. simulado

| Camada | Real (Devnet) | Simulado |
| --- | --- | --- |
| Contribuir (Blink) | instrução `donate` registra um PDA `Donation` e move o SOL | Valor em USD a uma taxa fixa de demonstração |
| Administrar | Contribuições on-chain + saldo do tesouro lido da chain | Pedidos, códigos de beneficiário, aprovação |
| Entregar (voucher) | Regra de uso único; ancoragem on-chain opcional | Parceiro, resgate, valor em USD do benefício |

A regra de uso único **não** é propriedade do QR code. Ela é garantida por uma
transição de estado atômica no servidor (`UPDATE ... WHERE status = 'issued'`).
Um segundo resgate é rejeitado e registrado — esse é o coração da demonstração.

## Stack técnica

- **Next.js 16** (App Router, Turbopack) + **React 19** + **TypeScript**
- **Tailwind CSS v4**
- **Solana**: um **programa Anchor** (`programs/aidblink`) que registra as
  contribuições, além de `@solana/web3.js`, wallet-adapter (Phantom) e Solana
  Actions/Blinks
- `qrcode` para os QR codes dos vouchers; um armazenamento JSON em arquivo
  (sem banco de dados)

## Estrutura do projeto

```
src/
  app/
    page.tsx                     Página inicial / problema
    contribute/                  Blink + fluxo de contribuição no app
    admin/                       Painel da organização
    voucher/[id]/                Voucher do beneficiário com QR code
    redeem/                      Simulador de resgate do parceiro
    api/
      actions/donate/            Solana Action (Blink) GET + POST
      donations/                 Listar / verificar / registrar contribuições
      balance/                   Resumo do caixa do tesouro
      requests/                  Listar / criar pedidos de ajuda
      requests/[id]/approve/     Aprovar ou rejeitar -> emite voucher
      vouchers/                  Listar vouchers
      vouchers/[id]/             Detalhe do voucher + token assinado + QR
      redeem/                    Resgatar um voucher exatamente uma vez
      redemptions/               Histórico de resgates + tentativas rejeitadas
  lib/
    env.ts        Configuração de runtime
    solana.ts     Conexão, saldo do tesouro, ancoragem por memo
    program.ts    Cliente do programa AidBlink (codifica ix, decodifica contas)
    voucher.ts    Tokens de voucher assinados com HMAC
    store.ts      Armazenamento JSON em arquivo (substituível)
    aid.ts        Regras de negócio (aprovar, resgatar, sumarizar)
    actions.ts    Helpers de metadados do Blink
programs/
  aidblink/       Programa Anchor: livro-razão on-chain de contribuições
public/
  actions.json    Roteamento das ações do Blinks
docs/
  ARCHITECTURE.md, PITCH.md, DEMO_SCRIPT.md, SUBMISSION.md
  (*.pt-BR.md em português)
Dockerfile, docker-compose.yml, .dockerignore
LICENSE
```

## Começando

### Um comando (recomendado)

O `scripts/run.sh` faz tudo: cria o `.env` se faltar, instala dependências
apenas quando necessário, escolhe uma porta livre e inicia a app.

```bash
./scripts/run.sh                # servidor de dev (instala se precisar)
./scripts/run.sh --prod         # build de produção e serve
./scripts/run.sh --smoke        # build + teste de fumaça ponta a ponta, e para
./scripts/run.sh --port 3100    # força uma porta (padrão 3000, escolhe outra se ocupada)
./scripts/stop.sh               # para o(s) servidor(es) web do AidBlink
./scripts/stop.sh --validator   # para também o solana-test-validator local
```

Atalhos npm equivalentes:

```bash
npm run demo          # ./scripts/run.sh
npm run demo:prod     # ./scripts/run.sh --prod
npm run verify        # ./scripts/run.sh --smoke
npm run demo:stop     # ./scripts/stop.sh
```

O script imprime a URL para abrir. Se a porta 3000 já estiver ocupada por outro
processo, ele move automaticamente para a próxima porta livre (ex.: 3001), então
a app sempre sobe. O `scripts/stop.sh` age apenas sobre processos cujo diretório
de trabalho é este repositório, então outros projetos Node continuam rodando.

### Passos manuais

```bash
# 1. Instalar
npm install

# 2. Configurar (os padrões funcionam para uma demo local)
cp .env.example .env
# Defina AIDBLINK_TREASURY_ADDRESS / NEXT_PUBLIC_TREASURY_ADDRESS para sua carteira.

# 3. Rodar
npm run dev        # http://localhost:3000
```

Abra:

- `/` — problema e visão geral
- `/contribute` — contribuir com SOL (real) ou registrar uma contribuição simulada
- `/admin` — painel da organização
- `/redeem` — simulador do parceiro

### Variáveis de ambiente

| Variável | Finalidade |
| --- | --- |
| `NEXT_PUBLIC_APP_URL` | URL base pública, usada para montar links e QR codes |
| `NEXT_PUBLIC_SOLANA_NETWORK` / `NEXT_PUBLIC_SOLANA_RPC_URL` | Cluster + endpoint RPC |
| `AIDBLINK_TREASURY_ADDRESS` / `NEXT_PUBLIC_TREASURY_ADDRESS` | Endereço público que recebe as contribuições |
| `AIDBLINK_PROGRAM_ID` | Id do programa AidBlink implantado (padrão: o programa devnet deste repositório) |
| `AIDBLINK_VOUCHER_SECRET` | Segredo HMAC dos tokens de voucher (apenas no servidor) |
| `NEXT_PUBLIC_SOL_USD_RATE` | Taxa SOL/USD ilustrativa para orçamento |
| `AIDBLINK_ANCHOR_SECRET_KEY` | Keypair opcional do servidor para ancorar resgates on-chain |
| `AIDBLINK_VOUCHER_TTL_DAYS` | Validade do voucher (padrão 30) |

### Scripts

```bash
npm run dev         # servidor de desenvolvimento
npm run build       # build de produção
npm run start       # serve o build de produção
npm run typecheck   # tsc --noEmit
npm run demo        # setup + servidor de dev em um comando (scripts/run.sh)
npm run demo:prod   # build + serve de produção em um comando
npm run verify      # build + teste de fumaça ponta a ponta
npm run program:deploy   # build + deploy do programa on-chain + init do pool
node scripts/gen-keys.mjs   # gera um keypair de tesouro + âncora
node scripts/init-pool.mjs  # cria a conta on-chain do pool após o deploy
node scripts/smoke.mjs      # teste de fumaça ponta a ponta da API (servidor precisa estar rodando)
```

## Rodando com Docker

A app vem com um `Dockerfile` multi-stage (saída `standalone` do Next.js) e um
`docker-compose.yml` para uma demo em um comando.

```bash
# 1. Forneça a configuração de runtime (endereço do tesouro + segredo do voucher).
cp .env.example .env

# 2. Construa e suba.
docker compose up --build

# 3. Abra http://localhost:3000
```

Notas:

- **Valores `NEXT_PUBLIC_*` são embutidos no build.** Alterar a URL da app, a
  rede ou o endereço de exibição do tesouro exige um rebuild:
  `docker compose build --no-cache`.
- Segredos apenas do servidor (`AIDBLINK_VOUCHER_SECRET`,
  `AIDBLINK_ANCHOR_SECRET_KEY`) são injetados em **runtime**, nunca embutidos na
  imagem.
- O armazenamento de demonstração em arquivo fica no volume nomeado
  `aidblink-data` (`/app/.data`), então o estado sobrevive a reinícios do
  container. Resete com `docker compose down -v`.
- Rode a imagem construída diretamente com `docker run --rm -p 3000:3000
  --env-file .env aidblink:latest`.

## O programa on-chain

As contribuições são registradas pelo programa Anchor em `programs/aidblink`
(id devnet `BsNDtwVsmxpMSnnoUiiadhjnRvxJ8huuZWZ5vcrFCrrg`). Uma instrução
`donate` cria um PDA `Donation` **e** move o SOL para o tesouro na mesma
instrução. `GET /api/donations` relê esses PDAs com `getProgramAccounts`, então
a lista "Contribuições recentes" é a própria chain.

| Item | Valor |
| --- | --- |
| Instruções | `initialize_pool(treasury)`, `donate(lamports, memo, nonce)` |
| PDA do Pool | `[b"pool"]` — autoridade, tesouro, totais |
| PDA de Doação | `[b"donation", donor, nonce]` — doador, lamports, índice, timestamp, memo |

Build e deploy (requer a [Solana CLI](https://solana.com/docs/intro/installation)
e a [Anchor CLI](https://github.com/coral-xyz/anchor/releases)):

```bash
anchor build                  # -> target/deploy/aidblink.so
anchor keys sync              # apenas se você regerar o keypair do programa
anchor deploy                 # implanta no cluster do Anchor.toml (devnet)
node scripts/init-pool.mjs    # cria a conta [b"pool"]
```

A carteira de deploy é `~/.config/solana/id.json` e precisa ter SOL de Devnet
(cerca de 1–2 SOL para a conta do programa). Abasteça em
https://faucet.solana.com, ou use `solana airdrop 2`.

> **Keypair de deploy.** O `scripts/deploy-program.sh` restaura o keypair do
> programa a partir de `keys/aidblink-keypair.json` se `target/deploy/` não
> existir, para que um clone novo implante no mesmo id. Esse keypair é a
> **autoridade de upgrade** do programa — é apenas de Devnet e deve ser rotacionado
> para produção.

## O Blink (Solana Action)

`public/actions.json` mapeia `/contribute` para `/api/actions/donate`. O endpoint
implementa a especificação de Actions:

- `GET /api/actions/donate` → metadados da ação (título, ícone, valores predefinidos)
- `POST /api/actions/donate?amount=0.1` com `{ "account": "<pubkey>" }` → transação
  não assinada em base64 para assinar e enviar

Os cabeçalhos CORS e `X-Action-Version` / `X-Blockchain-Ids` são definidos, então
qualquer cliente compatível com Blink pode usar o link (teste em
https://dial.to).

## Tokens de voucher

Um voucher é um registro off-chain mais um token compacto assinado:

```
base64url(payloadJson) + "." + base64url(HMAC_SHA256(payload, secret))
```

O payload contém o id do voucher, categoria, valor, referência pseudônima,
emissor e validade. O parceiro pode provar autenticidade sem consultar o banco
de dados, enquanto o uso único é garantido no servidor. Veja
`docs/ARCHITECTURE.pt-BR.md` para o modelo de segurança.

## Ancoragem on-chain opcional

Se `AIDBLINK_ANCHOR_SECRET_KEY` estiver definida **e com fundos**, cada resgate
escreve uma transação curta do programa SPL Memo, ancorando o evento para
auditabilidade. Quando a chave está ausente ou sem fundos, a ancoragem é
silenciosamente ignorada e o resgate ainda funciona. Abasteça a conta âncora
com SOL de Devnet (ex.: `solana airdrop 1 <ANCHOR_PUBLIC>` ou
https://faucet.solana.com).

## Privacidade

- Nenhuma informação pessoalmente identificável on-chain ou nos tokens de voucher.
- Beneficiários são referenciados apenas por códigos pseudônimos.
- O segredo do voucher fica no servidor.

## Roadmap

- Integrações reais com parceiros (terminal do comerciante, liquidação de reembolso)
- Vouchers como PDAs com uso único garantido on-chain
- Múltiplas organizações com tesouros com escopo
- Feed de preço SOL/USD ao vivo
- Banco de dados institucional (Postgres) atrás da mesma interface de store

## Aviso legal

O AidBlink é um protótipo de hackathon. Não é um produto financeiro, não é
afiliado a nenhuma organização de ajuda real, e seus vouchers não podem ser
trocados por bens ou serviços.

## Licença

Distribuído sob a [Licença MIT](./LICENSE). © 2026 contribuidores do AidBlink.
