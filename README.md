# CounterSign

**CounterSign** is an Atlassian Forge app for teams that publish product descriptions and marketing copy for **food supplements** in the EU. It checks Confluence pages and any pasted text, flags what is likely not allowed, suggests a compliant rewording for every issue, and creates a Jira ticket for the corrections.

Built for **Codegeist 2026**, category *Apps for Specialized Industries* (healthcare / food-supplement compliance).

> **Honest notes.** This app was **built with Claude Code** (Anthropic's AI coding agent) under the direction of a former community-pharmacy assistant with about 20 years of experience. **Rule review:** the rules are based on EU Regulation 1924/2006, Directive 2002/46/EC, Regulation 1169/2011 and the EU Register of health claims, and carry the label "Reviewed by a community pharmacy professional (20 years' experience) - not legal advice". CounterSign is a writing aid, **not legal advice**. All demo products and texts are **fictional**.

## What it checks

| Check | Examples |
|---|---|
| Health claims not allowed (Reg. 1924/2006) | "treats diabetes", "antiparasitic", "lowers blood sugar", "lose 5 kg", "recommended by doctors", "clinically proven" |
| Missing mandatory food-supplement statements | "food supplement", recommended daily dose, do not exceed the dose, not a substitute for a varied diet, keep out of reach of young children |
| Romanian texts | missing or wrong diacritics (Äƒ Ã¢ Ã® È™ È›, cedilla ÅŸ Å£), plus the same claim rules in Romanian |
| Your own rules (admin settings) | extra forbidden words, brand names |

Every issue shows the found text, the problem, the legal basis and a suggested compliant rewording. Rules are listed in [`RULES-REVIEW-RO.md`](RULES-REVIEW-RO.md) and implemented in [`src/engine/rules.js`](src/engine/rules.js).

## Features and Forge modules

| Feature | Module |
|---|---|
| Check the current page ("â€¢â€¢â€¢" > Apps > CounterSign), create Jira tickets | `confluence:contentAction` + Jira REST API |
| Space dashboard: scan a whole space, issues by type, fixed vs open, tickets per page | `confluence:spacePage` + Forge storage |
| Admin settings: language (auto / EN / RO), own forbidden words, brand list - no code changes | `confluence:globalSettings` |
| Page context from Teamwork Graph (people, linked pages), read only | `requestTeamworkGraph` (Preview API) |
| Reusable Rovo tools: `check-text`, `check-page`, `suggest-rewording`, `list-jira-projects`, `create-correction-ticket` | 5 Ã— `rovo:action` |
| Reusable Rovo skill | `rovo:skill` ([`skills/countersign-review/SKILL.md`](skills/countersign-review/SKILL.md), open source, can be added to third-party agents) |
| MCP server: the same 5 tools via the Atlassian MCP server | `rovo:mcp` |

**Rovo agent:** an agent (`rovo:agent`) is written and kept in [`docs/rovo-agent-module.yml`](docs/rovo-agent-module.yml), but it is **not in the deployed manifest**: Atlassian's deploy-time screening answered "Agent not allowed" for the agent prompt. The reusable actions and skill work without it.

**Teamwork Graph (read only, API in Preview):** when you check a page, CounterSign asks Teamwork Graph who created, owns and contributed to the page, and which other Confluence pages it links to. The result is shown as "Page context (Teamwork Graph)" in the window and is added to the Jira ticket, so the ticket can be routed to the right person. Only people's **names** are used (no e-mail addresses). CounterSign never writes to the graph. The call is wrapped so that a Teamwork Graph problem or an empty answer never breaks the check; the section is simply hidden. Code: [`src/lib/teamworkGraph.js`](src/lib/teamworkGraph.js). Scopes: `read:graph:page:confluence`, `read:graph:user:atlassian`.

## Demo video

[CounterSign - demo video (about 3 minutes)](https://youtu.be/DLjtfCYPfzQ)

## Try it (for judges)

1. Install with this link (also in the Devpost submission): [Install CounterSign](https://developer.atlassian.com/console/install/6b5dbc8a-30f9-4b0f-8f0f-eeb96b67016f?signature=AYABePPwCdUS85e7awqRqdrRV28AAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBu8LIB5ww2gYJMGhVs1vcqAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDOcxD3MHYFxA8HTU6AIBEIA73m1CX8klz%2BLrDldBCSMarZqCTXkAYiaxWeNOMijFh2u6C5CDOIJFkER3Y7vVm0X5DfumF7yzHc6APUMAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgFymBvMCse3sxW8jPHkrUWyAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM0YndhuUZiWTbmPMCAgEQgDv%2FdqN7S3MMdz3%2BOLX29sTwJRyLDNFf2KJmfcqsDS6oWJjbuSbVCg13m8XnVXKyA0IHLyRWwnUL%2Fdb7pgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAXwe03c%2Fr3Ugq9Xn5qYaCxYAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw2hyZm60ZoNTDwOMoCARCAO8zEDv%2Bl8EawzD%2Bc%2Ft8jDKB3tJOMVINn4qbPD22conNPCJGTHa9mc3%2BcPd41kgfEcNn2AQbqzzwYZJE2AgAAAAAMAAAQAAAAAAAAAAAAAAAAAPhL9HYPjIPBcNYQi9KBIxr%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADKNpKD7Xl9tWaQX%2BlV8EQKZ1BCyAedlZPYYG2CtV2aCO9LvuuAh7JimMSeAkWdl4tt5L8GCV6SQGC5aX0jRZvuFUio%3D&product=jira&product=confluence), on a site with **Confluence and Jira**. You must be a site admin. The first time you open the app, Confluence shows **"Access required" > Allow access** (normal Forge consent): click it.
2. You need a normal Jira project (for example *Project management*). **Jira Service Management projects refuse tickets created by apps**, so do not choose one.
3. In Confluence open any page, then "â€¢â€¢â€¢" > **Apps** > **CounterSign - check this page**. Press **Create fictional demo pages in this space** to get three demo pages, then open *demo 1* and check it.
4. Press **Create one Jira ticket for all open issues**.
5. In the space sidebar open **Space apps > CounterSign dashboard** and press **Scan the space**.
6. Settings: Confluence settings > Apps > **CounterSign settings**.
7. Page context: the window shows "Page context (Teamwork Graph)" when the graph knows people or linked pages for the page. A brand-new page may need a little time to appear in the graph.
8. MCP / Rovo: external MCP client access is off by default; a site admin enables it per installation. The MCP endpoint is `https://mcp.atlassian.com/forge/<appId>` (OAuth 2.1).

## Develop

```
npm install
npm test                      # 61 unit tests, no network needed
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
