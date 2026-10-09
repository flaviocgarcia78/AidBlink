# AidBlink — Guia de submissão

> 🌐 **English:** [SUBMISSION.md](./SUBMISSION.md)

Tudo o que é necessário para publicar o projeto e gravar os dois vídeos da
Colosseum.

## Checklist do repositório

- [ ] Código enviado para um repositório público no GitHub.
- [ ] `README.md` explica o problema, o fluxo, como rodar e a fronteira
      real-vs-simulado.
- [ ] `.env` **não** é versionado (o `.gitignore` o exclui); o `.env.example`
      documenta todas as variáveis.
- [ ] O programa Anchor (`programs/aidblink`) está incluído e implanta no id de
      Devnet documentado (`npm run program:deploy`).
- [ ] `npm install && npm run build` passa a partir de um clone limpo.
- [ ] `node scripts/smoke.mjs` passa contra um servidor em execução.
- [x] Arquivo `LICENSE` MIT incluído.
- [x] `Dockerfile` + `docker-compose.yml` para execução em um comando.

## Vídeos (dois arquivos separados)

| Vídeo | Duração | Roteiro |
| --- | --- | --- |
| Pitch / apresentação | 2–3 min | `docs/PITCH.pt-BR.md` |
| Demo do produto | ≤ 3 min | `docs/DEMO_SCRIPT.pt-BR.md` |

Dicas de gravação:

- Grave em 1440×900 ou maior, navegador a 100% de zoom.
- Narre o insight do **voucher de uso único** — é o diferencial.
- Sempre diga quais partes são simuladas. Não afirme uma parceria real com ONG
  ou um benefício resgatável.

## Rodar o projeto (para a banca)

```bash
npm install
cp .env.example .env          # defina AIDBLINK_TREASURY_ADDRESS
npm run dev                   # http://localhost:3000
```

A lista de contribuições é lida do programa AidBlink já implantado na Devnet
(`AIDBLINK_PROGRAM_ID` no `.env.example`), então a banca pode contribuir sem
nenhuma configuração extra. Para reimplantar o programa você mesmo:

```bash
npm run program:deploy        # anchor build + deploy (devnet) + init do pool
```

Ou, sem Node local, use Docker:

```bash
cp .env.example .env
docker compose up --build     # http://localhost:3000
```

Opcional, para comprovar atividade on-chain ao vivo:

```bash
# Abasteça uma conta âncora para ancorar resgates on-chain
solana airdrop 1 <ANCHOR_PUBLIC> --url devnet
# Ou use https://faucet.solana.com
```

Depois teste o fluxo: `/contribute` → `/admin` → `/voucher/[id]` → `/redeem`
(resgate duas vezes para ver a rejeição anti-reuso).

## O que é real vs. simulado (diga isso na submissão)

- **Real:** contribuições na Devnet da Solana registradas pelo programa Anchor do
  AidBlink (um PDA `Donation` por contribuição), IDL on-chain publicada, leitura
  do saldo do tesouro, ancoragem por memo opcional, uso único garantido no
  resgate.
- **Simulado:** valores de benefício em USD, parceiros, resgate em um comércio
  real e os próprios vouchers (sem valor monetário).

## Mapeamento para os critérios típicos de avaliação

| Critério | Onde aparece |
| --- | --- |
| Problema e impacto | `README.pt-BR.md`, `docs/PITCH.pt-BR.md` (a lacuna doação→ajuda) |
| Produto e execução | Fluxo completo e funcional: contribuir → administrar → entregar → resgatar |
| Uso de Solana / Blinks | Programa Anchor próprio, endpoint Action padrão, transações reais, âncora opcional |
| Originalidade | Mecanismo de voucher de uso único + fronteira real/simulado explícita |
| Profundidade técnica | `docs/ARCHITECTURE.pt-BR.md` (programa on-chain, assinatura de token, uso único atômico, modelo de ameaças) |
| Viabilidade | Base de código pequena e extensível; roadmap de produção claro |
| Apresentação | Dois vídeos focados com roteiros |

## Planos B para o dia da demo

- **Airdrop seco / sem SOL de Devnet:** use *Registrar contribuição simulada* e
  diga isso; o resto do fluxo não é afetado.
- **Problemas com a extensão de carteira:** recarregue ou pule a etapa da
  carteira e use o simulador na etapa 1.
- **Latência da RPC:** o saldo do tesouro pode aparecer como `unavailable` por
  um instante; clique em **Refresh** no painel.

## Apenas afirmações honestas

Afirmações seguras:

- "As contribuições são transações reais na Devnet da Solana."
- "Os vouchers são de uso único e o segundo resgate é rejeitado pelo servidor."
- "Nenhum dado pessoal é escrito on-chain."

Evite:

- "Fazemos parceria com [empresa real]."
- "O voucher pode ser gasto na [loja real]."
- "Isto está pronto para produção."
