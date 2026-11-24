# Devpost write-up (DRAFT - Ileana reviews every line before submitting)

**Project name:** CounterSign
**Category:** Apps for Specialized Industries
**Bonus prizes we apply to:**
- **Best apps with Teamwork Graph integration** - read-only integration (Preview API), working in production.
- **Best app with Atlassian MCP** - `rovo:mcp` module with the 5 tools. (Endpoint exists and answers with OAuth; external MCP client access is off by default and enabled by a site admin. We have not run an end-to-end session with an external MCP client; we say so.)
- **Best Agents** - only if the judges accept reusable `rovo:action` + `rovo:skill` without an agent module (see "Challenges"). We do not claim a working Rovo agent.
- Marketplace bonus: NOT applied for (nothing submitted).

## Built with Claude Code (said openly)
This app was **built with Claude Code**, Anthropic's AI coding agent. The idea, the domain knowledge (about 20 years in a community pharmacy), the review of the health-claim rules and rewordings, and every decision about scope belong to the human author. Claude Code wrote most of the code and the tests under that direction. **All rules are DRAFT** until a qualified regulatory person approves them. CounterSign is a writing aid, not legal advice. All products and texts in the demo are fictional.

## Inspiration
Supplement marketing copy is full of sentences that sound harmless but are not allowed in the EU: "lowers blood sugar", "antiparasitic action", "boosts immunity". Pharmacy and e-commerce teams write this copy in Confluence, and the compliance review happens late and by hand. CounterSign puts the check where the copy is written.

## What it does
- **Checks a Confluence page** (or pasted text, English or Romanian) against DRAFT rules based on EU Regulation 1924/2006: claims that are not allowed, missing mandatory food-supplement statements, Romanian diacritics.
- **For every issue:** the found text, why it is a problem, the legal basis and a compliant rewording.
- **Creates one Jira ticket** with every correction (the most severe 25 issues are listed, the rest is counted, to stay under Jira's description limit).
- **Space dashboard:** scans a whole space and shows issues by type and fixed versus open.
- **Admin settings, no code:** language (auto / English / Romanian), own forbidden words, brand names.
- **Teamwork Graph page context (read only):** who created, owns and contributed to the page, and which pages it links to. It appears in the window and in the Jira ticket so the correction goes to the right person.
- **Reusable Rovo tools** (5 actions and a skill) and the same 5 tools through the **Atlassian MCP server**.

## How it meets the main technology requirement
CounterSign is a Forge app with a manifest and several modules (`confluence:contentAction`, `confluence:spacePage`, `confluence:globalSettings`, `rovo:action`, `rovo:skill`, `rovo:mcp`). It integrates Confluence, Jira, Rovo and Teamwork Graph, and runs on Atlassian (Forge functions and Forge storage; no external servers, no egress).

## How we used Teamwork Graph
- **Read only.** CounterSign never writes to the graph.
- **Preview API:** it uses `requestTeamworkGraph` with curated queries (`confluencePageCreator`, `confluencePageOwners`, `confluencePageContributors`, `confluencePageLinkedConfluencePages`) and the scopes `read:graph:page:confluence` and `read:graph:user:atlassian`. The API is in Preview and may change.
- **Where it is used:** the "Page context (Teamwork Graph)" section of the window and the Jira ticket description.
- **Privacy:** only people's names are used, no e-mail addresses. Results follow the user's own permissions (`asUser`).
- **Safe by design:** if the graph is unavailable or has nothing for a page, the section is hidden and the check works as before.
- **Status to state truthfully (fill in after tonight's re-check):** people (owner) were returned in production for a test page. Linked pages: `[ ] returned` / `[ ] not returned yet on our free test site`.

## How we built it
A pure-JavaScript rule engine with 39 unit tests, UI Kit front ends, Forge storage for scan history and settings, Jira REST calls made as the user. The rules were drafted with Claude Code and are to be reviewed by a pharmacy professional.

## Challenges (honest)
- **Rovo agent blocked by Atlassian's screening.** The `rovo:agent` module with a prompt about supplement compliance was rejected at deploy time with "Agent not allowed". The agent is written (`docs/rovo-agent-module.yml`) but is **not in the submitted manifest**. A minimal generic prompt deploys, so the block is about the prompt content. We did not try to disguise the prompt to get past the check. We deliver the same capability as reusable `rovo:action` tools, a `rovo:skill` and an MCP server. We are asking Atlassian why the prompt is rejected.
- **Jira Service Management projects refuse ticket creation from Forge apps.** Use a normal Jira project (for example "Project management").
- **Teamwork Graph is a Preview API**: schema details (for example, node types are unions) had to be discovered by introspection, and new pages can take time to show up in the graph.
- **Domain risk:** health-claim rules must be right. Every rule is labelled DRAFT and shows its legal basis so a human can check it.

## Accomplishments
A working end-to-end flow on a real site: check, suggest, ticket, space dashboard, settings, and graph context, installed in production.

## What we learned
Forge's Rovo, MCP and Teamwork Graph pieces let a domain check live in several places (a page window, a dashboard, an agent, an MCP client) without rewriting it.

## What's next
Pharmacist-reviewed rule packs per country, more languages, an approval workflow, and a Marketplace listing.

## Testing instructions (for judges)
1. Install with this link: https://developer.atlassian.com/console/install/6b5dbc8a-30f9-4b0f-8f0f-eeb96b67016f?signature=AYABePPwCdUS85e7awqRqdrRV28AAAADAAdhd3Mta21zAEthcm46YXdzOmttczp1cy13ZXN0LTI6NzA5NTg3ODM1MjQzOmtleS83MDVlZDY3MC1mNTdjLTQxYjUtOWY5Yi1lM2YyZGNjMTQ2ZTcAuAECAQB4CxqLTo9l4lqXuFjNim1xJM%2Bp%2F3TVP9xHS2BrU5DRRucBu8LIB5ww2gYJMGhVs1vcqAAAAH4wfAYJKoZIhvcNAQcGoG8wbQIBADBoBgkqhkiG9w0BBwEwHgYJYIZIAWUDBAEuMBEEDOcxD3MHYFxA8HTU6AIBEIA73m1CX8klz%2BLrDldBCSMarZqCTXkAYiaxWeNOMijFh2u6C5CDOIJFkER3Y7vVm0X5DfumF7yzHc6APUMAB2F3cy1rbXMAS2Fybjphd3M6a21zOmV1LXdlc3QtMTo3MDk1ODc4MzUyNDM6a2V5LzQ2MzBjZTZiLTAwYzMtNGRlMi04NzdiLTYyN2UyMDYwZTVjYwC4AQICAHi9bVMAkme4qVQX1fQHo6ePw3H40A7cGfz7yrmSfBWMXgFymBvMCse3sxW8jPHkrUWyAAAAfjB8BgkqhkiG9w0BBwagbzBtAgEAMGgGCSqGSIb3DQEHATAeBglghkgBZQMEAS4wEQQM0YndhuUZiWTbmPMCAgEQgDv%2FdqN7S3MMdz3%2BOLX29sTwJRyLDNFf2KJmfcqsDS6oWJjbuSbVCg13m8XnVXKyA0IHLyRWwnUL%2Fdb7pgAHYXdzLWttcwBLYXJuOmF3czprbXM6dXMtZWFzdC0xOjcwOTU4NzgzNTI0MzprZXkvNmMxMjBiYTAtNGNkNS00OTg1LWI4MmUtNDBhMDQ5NTJjYzU3ALgBAgIAeDYASx0XCjkny4iLV6vz%2BKtEGSGT6kdt0QRpkn6D%2FlVEAXwe03c%2Fr3Ugq9Xn5qYaCxYAAAB%2BMHwGCSqGSIb3DQEHBqBvMG0CAQAwaAYJKoZIhvcNAQcBMB4GCWCGSAFlAwQBLjARBAw2hyZm60ZoNTDwOMoCARCAO8zEDv%2Bl8EawzD%2Bc%2Ft8jDKB3tJOMVINn4qbPD22conNPCJGTHa9mc3%2BcPd41kgfEcNn2AQbqzzwYZJE2AgAAAAAMAAAQAAAAAAAAAAAAAAAAAPhL9HYPjIPBcNYQi9KBIxr%2F%2F%2F%2F%2FAAAAAQAAAAAAAAAAAAAAAQAAADKNpKD7Xl9tWaQX%2BlV8EQKZ1BCyAedlZPYYG2CtV2aCO9LvuuAh7JimMSeAkWdl4tt5L8GCV6SQGC5aX0jRZvuFUio%3D&product=jira&product=confluence - on a site that has Confluence and Jira. Click **Allow access** when Confluence asks.
2. You need a normal Jira project (not Jira Service Management).
3. Open any Confluence page > "•••" > Apps > **CounterSign - check this page**. Press **Create fictional demo pages in this space**, then check **demo 1**.
4. Press **Create one Jira ticket for all open issues** and choose your Jira project.
5. Space sidebar > Space apps > **CounterSign dashboard** > **Scan the space**.
6. Confluence settings > Apps > **CounterSign settings**.

## Privacy policy
https://iancuileana83-lab.github.io/countersign-privacy/

## Disclaimer
Fictional products only. DRAFT rules. Not legal advice. Built with Claude Code.
