# Marketplace preparation (Phase 7) - NOTHING IS SUBMITTED. Ask Ileana before any submission.

Devpost bonus "Best Marketplace published app" only needs a listing OR a submitted review ticket.

## Known facts (from Atlassian docs and community threads, to verify)
- Forge apps on Marketplace can only be **Free** or **Paid via Atlassian**.
- A free app must be useful "as is".
- An app that is submitted for Marketplace listing, or has a `licensing` entry in the manifest, **cannot be shared by installation link**. Keep TWO versions: (1) the unlicensed one for the Devpost installation link, (2) a copy for Marketplace.
- Distribution must be **Sharing** (not "Sharing within organization") before submission.
- All cloud apps must meet the Marketplace security requirements (also free apps).
- **Open question:** whether an individual (no company) can complete partner verification. Sources disagree. Ask Marketplace support before spending time.

## Checklist (to do with Ileana)
- [ ] Decide: pursue the Marketplace bonus? (Ileana)
- [ ] Ask Marketplace support about individual vendors (Ileana or support ticket)
- [ ] Marketplace partner / vendor account (Ileana, personal data and terms)
- [ ] Privacy policy + support contact + terms (draft needed)
- [ ] Privacy and Security tab answers (app stores only settings and scan history in Forge storage; no data leaves Atlassian; Runs on Atlassian)
- [ ] Listing text, logo 144x144, banner, screenshots (from the demo site, fictional data only)
- [ ] Security bug bounty program requirements (check current rules)
- [ ] Create production environment: `forge deploy -e production`, set distribution to Sharing
- [ ] Submit listing for review, copy the review ticket link into Devpost

## Draft listing text
**Name:** CounterSign - Supplement Claim Check
**Tagline:** Check food-supplement copy for EU claim problems before you publish it.
**Summary:** CounterSign reads Confluence pages and finds health claims that are not allowed under EU Regulation 1924/2006, missing mandatory supplement statements and Romanian diacritics problems. It suggests compliant rewordings, creates Jira correction tickets, scans whole spaces and exposes its tools to Rovo and MCP. Rules are DRAFT and not legal advice.
**Categories:** Compliance, Content, Productivity.
