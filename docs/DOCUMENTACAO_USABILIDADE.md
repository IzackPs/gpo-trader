# Guia de Usabilidade — GPO Trader

Documento para utilizadores finais: o que é a plataforma, como entrar, criar ofertas, trocar com segurança e usar todas as funcionalidades.

---

## 1. O que é o GPO Trader?

O **GPO Trader** é um mercado seguro para trocas de itens do jogo **Grand Piece Online (GPO)**. Em vez de confiar em estranhos em servidores de Discord ou em chats do jogo, aqui:

- **Reputação é real:** Cada troca confirmada soma pontos. Contas antigas e histórico limpo têm mais peso.
- **Confirmação dupla:** Comprador e vendedor confirmam a troca no site depois de fazerem o negócio no jogo. Só então o negócio “fecha” e a reputação sobe.
- **Preços de referência:** A plataforma mostra preços médios da última semana (Bolsa / Economia) para te orientares.
- **Proteção contra golpes:** Se algo correr mal, podes abrir uma disputa e enviar provas (screenshots, etc.).

Não és obrigado a fazer trocas para usar o site: podes só consultar o mercado e a “bolsa” de preços.

---

## 2. Entrar na plataforma

### 2.1 Login com Discord

1. Abre o site e clica em **“Entrar com Discord”** (ou acede diretamente à página de login).
2. Serás redirecionado para o Discord para autorizar o GPO Trader.
3. Após autorizar, voltas ao site já autenticado. Na primeira vez, o teu perfil (nome, avatar) é criado automaticamente.

**Requisitos:** Precisas de uma conta Discord. A plataforma usa a idade da tua conta Discord (anti-abuso): para **criar ofertas** é preciso ter conta com pelo menos **30 dias**.

### 2.2 Se não conseguires entrar

- Verifica se autorizaste a aplicação no Discord.
- Se aparecer uma página de “erro de código”, tenta fechar o browser e entrar de novo com “Entrar com Discord”.
- Em produção, confirma que o teu administrador configurou o redirect correto (URL do site + `/auth/callback`) no Discord e no Supabase.

---

## 3. Navegação principal

- **Início:** Página de apresentação e atalhos para Mercado e Criar oferta.
- **Mercado:** Lista de ofertas abertas (o que outros têm / o que procuram).
- **Bolsa / Economia:** Preços médios dos itens na última semana (para consulta, sem precisar de estar logado para ver).
- **Criar oferta:** Só disponível para utilizadores logados e que cumpram os requisitos (idade da conta, strikes).
- **Dashboard:** O teu perfil, reputação, tier e histórico (após login).
- **Navbar:** No topo: links e menu com o teu avatar (Dashboard, Criar oferta, Termos, Sair).

Algumas páginas (Dashboard, Criar oferta, Sala de troca, Admin) são **protegidas**: se não estiveres logado, és redirecionado para a página de login.

---

## 4. Reputação e Tiers

- **Reputação (XP):** Sobe quando uma troca é **confirmada por ambos** (comprador e vendedor). Cada confirmação dá pontos.
- **Tiers:** O teu nível (Drifter, Civilian, Merchant, Broker, Yonko) depende da reputação e da idade da conta. Tiers mais altos podem ter mais ofertas ativas e mais peso nos preços de referência.
- **Strikes:** Se não cumprires uma troca (ex.: não confirmares no prazo), podes receber strikes. Muitos strikes podem bloquear a criação de novas ofertas.

Resumo rápido de limites de ofertas (podem variar consoante a configuração):

- **Drifter:** 1 oferta ativa.
- **Civilian:** até 3 ofertas ativas.
- **Merchant / Broker / Yonko:** muitas ofertas (ex.: 999).

---

## 5. Ver o mercado

- Em **Mercado** vês as ofertas recentes: quem **tem** (HAVE) e quem **quer** (WANT) itens.
- Cada card mostra: utilizador, avatar, tier, se está online, itens da oferta e botão para ver detalhes ou aceitar.
- A listagem é igual para todos (pública); atualiza-se automaticamente com cache de alguns segundos para ser rápida.

---

## 6. Criar uma oferta

1. Clica em **“Criar oferta”** (no Mercado ou no menu).
2. Escolhe o lado:
   - **Tenho (HAVE):** o que estás a oferecer.
   - **Quero (WANT):** o que procuras.
3. Adiciona itens: pesquisa por nome e/ou categoria (Fruta, Arma, Scroll, Acessório) e escolhe quantidades. Só aparecem itens **ativos** no catálogo (itens desativados pelo admin não são listados).
4. Confirma e publica.

Se aparecer erro:

- **“Conta com menos de 30 dias”:** A plataforma usa a idade da tua conta Discord; não é possível contornar.
- **“Máximo de ofertas atingido”:** Cancela uma oferta antiga ou sobe de tier.
- **“Strikes”:** Contacta um administrador se achas que foi engano; após muitos strikes a criação pode ficar bloqueada.
- **“Um ou mais itens não existem ou estão desativados”:** O item foi removido do catálogo ou desativado; escolhe outro.

---

## 7. Aceitar uma oferta e fazer a troca

1. No **Mercado**, abre o detalhe da oferta que te interessa.
2. Clica em **“Aceitar oferta”**. A oferta fica **bloqueada** para outros e é criada uma **transação** entre ti (comprador) e o autor da oferta (vendedor).
3. Entras na **Sala de troca** (`/trades/[id]`). Aqui:
   - Podes usar o **chat** para combinar como fazer a troca no jogo (servidor, local, ordem dos itens).
   - Quando a troca física no GPO estiver feita, **ambos** devem marcar que confirmam (checkboxes/botões de confirmação).
4. Quando **comprador e vendedor** confirmarem:
   - A transação passa a **CONFIRMED**.
   - A reputação de ambos sobe.
   - A oferta associada fica COMPLETED.

Se um de vocês não confirmar em tempo útil (ex.: 24 horas), a transação pode ser automaticamente cancelada e quem não confirmou pode receber um strike; a oferta volta a ficar disponível.

---

## 8. Se algo correr mal (disputa)

Se a troca não se realizou ou foste enganado:

1. Na **Sala de troca**, usa a opção do tipo **“Não realizou / Golpe”** (ou equivalente) para **abrir uma disputa**.
2. Serás levado à página de **disputa**, onde podes escrever o motivo e **enviar evidências** (screenshots, PDFs) para o bucket de disputas.
3. A transação fica em estado **DISPUTED**. O chat da troca pode ficar bloqueado para novas mensagens.
4. Um administrador pode analisar o caso e resolver (notas internas, resolução manual). O sistema regista quem abriu a disputa e as provas enviadas.

---

## 9. Bolsa / Economia (preços da semana)

- Em **Mercado**, o botão **“Bolsa / Economia”** leva-te à página de **analytics**.
- Aí vês uma tabela com:
  - **Item** e **Categoria**
  - **Preço médio (WAP)** na última semana
  - **Volume** e **Número de trocas** (baseado em transações confirmadas)
- Serve para te orientares nos preços mesmo quando não queres criar ofertas. A página é pública e cacheada por cerca de 1 minuto.

---

## 10. Dashboard (teu perfil)

No **Dashboard** (após login) vês:

- **Avatar e nome** (Discord)
- **Tier** atual e descrição do tier
- **Reputação (XP)** e quanto falta para o próximo tier
- **Ofertas ativas** (listagem das tuas ofertas abertas)
- **Histórico** de eventos de reputação e/ou trocas

Use esta página para acompanhares a tua progressão e abrires as tuas ofertas para editar ou cancelar (consoante o que a interface permitir).

---

## 11. Admin (apenas administradores)

Se fores **administrador** (o teu perfil tem `is_admin` ativo):

- Tens acesso a **Admin – Preços dos itens** (ex.: `/admin/items`).
- Aí podes:
  - **Editar o preço** (em Legendary Chests) e a **volatilidade** de cada item do catálogo.
  - **Ativar ou desativar** cada item (soft delete). Itens desativados deixam de aparecer ao criar ofertas e nas listagens públicas; não se apaga o item da base de dados (preserva histórico de ofertas e transações).

Não há botão “apagar” item: apenas “Ativo” Sim/Não. Isto evita quebra de integridade nas ofertas e transações antigas que referenciam esse item.

---

## 12. Termos e regras de uso

- A página **Termos** (ex.: `/terms`) contém os termos de uso e regras da plataforma. Consulta-a para saber as políticas de conduta, responsabilidade e uso do serviço.

---

## 13. Resumo rápido (fluxos principais)

| Ação | Onde | Notas |
|------|------|--------|
| Entrar | Login com Discord | Conta Discord com 30+ dias para criar ofertas |
| Ver ofertas | Mercado | Público; listagem cacheada |
| Ver preços da semana | Bolsa / Economia | Público; WAP por item |
| Criar oferta | Criar oferta | Protegido; limites por tier e strikes |
| Aceitar oferta | Detalhe da oferta | Cria transação e sala de troca |
| Confirmar troca | Sala de troca | Ambos devem confirmar; depois sobe reputação |
| Abrir disputa | Sala de troca → Disputa | Upload de evidências; estado DISPUTED |
| Ver perfil e reputação | Dashboard | Protegido |
| Editar preços / ativar ou desativar itens | Admin – Itens | Apenas admins |
| Listar e resolver disputas (status, notas) | Admin – Disputas | Apenas admins (mediador) |

---

*Este guia acompanha a Documentação Técnica (`docs/DOCUMENTACAO_TECNICA.md`). Para dúvidas sobre configuração, deploy ou implementação, use a documentação técnica.*
