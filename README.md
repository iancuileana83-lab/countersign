# CounterSign

**CounterSign** is an Atlassian Forge app for teams that publish product descriptions and marketing copy for **food supplements** in the EU. It checks Confluence pages and any pasted text, flags what is likely not allowed, suggests a compliant rewording for every issue, and creates a Jira ticket for the corrections.

Built for **Codegeist 2026**, category *Apps for Specialized Industries* (healthcare / food-supplement compliance).

> **Honest notes.** This app was **built with Claude Code** (Anthropic's AI coding agent) under the direction of a former community-pharmacy assistant with about 20 years of experience. **All rules are DRAFT**: they are based on EU Regulation 1924/2006, Directive 2002/46/EC, Regulation 1169/2011 and the EU Register of health claims, and must be reviewed by a qualified regulatory person before real use. CounterSign is a writing aid, **not legal advice**. All demo products and texts are **fictional**.

## What it checks

| Check | Examples |
|---|---|
| Health claims not allowed (Reg. 1924/2006) | "treats diabetes", "antiparasitic", "lowers blood sugar", "lose 5 kg", "recommended by doctors", "clinically proven" |
| Missing mandatory food-supplement statements | "food supplement", recommended daily dose, do not exceed the dose, not a substitute for a varied diet, keep out of reach of young children |
| Romanian texts | missing or wrong diacritics (ă â î ș ț, cedilla ş ţ), plus the same claim rules in Romanian |
| Your own rules (admin settings) | extra forbidden words, brand names |

Every issue shows the found text, the problem, the legal basis and a suggested compliant rewording. Rules are listed in [`RULES-REVIEW-RO.md`](RULES-REVIEW-RO.md) and implemented in [`src/engine/rules.js`](src/engine/rules.js).

## Features and Forge modules

| Feature | Module |
|---|---|
| Check the current page ("•••" > Apps > CounterSign), create Jira tickets | `confluence:contentAction` + Jira REST API |
| Space dashboard: scan a whole space, issues by type, fixed vs open, tickets per page | `confluence:spacePage` + Forge storage |
| Admin settings: language (auto / EN / RO), own forbidden words, brand list - no code changes | `confluence:globalSettings` |
| Page context from Teamwork Graph (people, linked pages), read only | `requestTeamworkGraph` (Preview API) |
| Reusable Rovo tools: `check-text`, `check-page`, `suggest-rewording`, `list-jira-projects`, `create-correction-ticket` | 5 × `rovo:action` |
| Reusable Rovo skill | `rovo:skill` ([`skills/countersign-review/SKILL.md`](skills/countersign-review/SKILL.md), open source, can be added to third-party agents) |
| MCP server: the same 5 tools via the Atlassian MCP server | `rovo:mcp` |

**Rovo agent:** an agent (`rovo:agent`) is written and kept in [`docs/rovo-agent-module.yml`](docs/rovo-agent-module.yml), but it is **not in the deployed manifest**: Atlassian's deploy-time screening answered "Agent not allowed" for the agent prompt. The reusable actions and skill work without it.

**Teamwork Graph (read only, API in Preview):** when you check a page, CounterSign asks Teamwork Graph who created, owns and contributed to the page, and which other Confluence pages it links to. The result is shown as "Page context (Teamwork Graph)" in the window and is added to the Jira ticket, so the ticket can be routed to the right person. Only people's **names** are used (no e-mail addresses). CounterSign never writes to the graph. The call is wrapped so that a Teamwork Graph problem or an empty answer never breaks the check; the section is simply hidden. Code: [`src/lib/teamworkGraph.js`](src/lib/teamworkGraph.js). Scopes: `read:graph:page:confluence`, `read:graph:user:atlassian`.

## Try it (for judges)

1. Install via the installation link from the Devpost submission, on a site with **Confluence and Jira**. You must be a site admin. The first time you open the app, Confluence shows **"Access required" > Allow access** (normal Forge consent): click it.
2. You need a normal Jira project (for example *Project management*). **Jira Service Management projects refuse tickets created by apps**, so do not choose one.
3. In Confluence open any page, then "•••" > **Apps** > **CounterSign - check this page**. Press **Create fictional demo pages in this space** to get three demo pages, then open *demo 1* and check it.
4. Press **Create one Jira ticket for all open issues**.
5. In the space sidebar open **Space apps > CounterSign dashboard** and press **Scan the space**.
6. Settings: Confluence settings > Apps > **CounterSign settings**.
7. Page context: the window shows "Page context (Teamwork Graph)" when the graph knows people or linked pages for the page. A brand-new page may need a little time to appear in the graph.
8. MCP / Rovo: external MCP client access is off by default; a site admin enables it per installation. The MCP endpoint is `https://mcp.atlassian.com/forge/<appId>` (OAuth 2.1).

## Develop

```
npm install
npm test                      # 39 unit tests, no network needed
forge login                   # or set FORGE_EMAIL and FORGE_API_TOKEN; never commit credentials
forge deploy -e development
forge install --upgrade -e development
```

Credentials are read from a local `.env` (ignored by Git). Do not commit it.

## Project layout

```
manifest.yml                  Forge modules and permissions
src/engine/                   rules + checker (pure JavaScript, unit-tested)
src/frontend/                 UI Kit: page window, dashboard, settings
src/resolvers, src/actions.js backend functions and Rovo actions
src/lib/                      Confluence, Jira, Teamwork Graph, scan history, settings
skills/countersign-review/    open-source SKILL.md
tests/                        node:test unit tests
docs/                         Rovo agent definition (not deployed), Devpost / video / Marketplace drafts
```

## License

MIT - see [LICENSE](LICENSE).
