# Demo video script - CounterSign (target 4:15, hard limit 5:00, English, public on YouTube)

Rules from the contest: no third-party trademarks, no copyrighted music, show only the fictional demo pages. Use your own voice or captions. Speak slowly; one idea per sentence.

## Before you record (30 minutes, do it twice end to end)
1. Use the **production** app, not "(Development)". In the "Apps" submenu pick the entry **without** "(Development)". The order of the two entries changes, so read the label every time.
2. Jira project: use **CounterSign Fixes (CF)**. It is a normal project; Service Management projects refuse app tickets.
3. Delete or ignore old tickets so the board looks clean. Do not delete anything you need.
4. Hide your e-mail address: zoom the browser so the top-right avatar menu is not open; do not open the account menu.
5. Close other tabs, silence notifications, 100% browser zoom, window about 1280 px wide.
6. Open these tabs in order and leave them ready: (a) demo 1, (b) demo 2 (Romanian), (c) demo 4, (d) Jira board CF, (e) Confluence settings, (f) GitHub or the README, only if the repo is public by then (otherwise skip).
7. First time on a page after a reload, the first click on "•••" is sometimes ignored. Click once more.
8. **Rehearse the "fixed" step** (scene 6). It is the one flow not yet checked in the real UI. If it does not work, cut that sentence.

## Scenes and exact steps

| Time | On screen (exact clicks) | Say |
|---|---|---|
| 0:00-0:20 | Title card: "CounterSign - check the claim before you publish it". | "Supplement marketing copy is full of claims that are not allowed in the EU. I worked twenty years in a community pharmacy, and I built CounterSign with Claude Code to catch them where the copy is written: in Confluence." |
| 0:20-1:05 | Tab (a) **demo 1**. Click "•••" (top right) > **Apps** > **CounterSign - check this page**. Wait for the window. Point at the counters (11 high, 9 medium) and the yellow **DRAFT rules** box. Scroll slowly past 2-3 issues: "lowers blood sugar", "antiparasitic", the rewording and the legal basis. | "This is a fictional product page. CounterSign finds eleven high and nine medium issues. For each one it shows the found text, why it is a problem, the legal basis and a compliant rewording. Every rule is a draft until a regulatory person approves it." |
| 1:05-1:25 | Keep scrolling to the **Missing mandatory statement** cards ("Do not exceed the recommended daily dose."). | "It also notices what is missing: the mandatory statements for a food supplement." |
| 1:25-2:00 | Scroll to the top. In the project dropdown choose **CounterSign Fixes (CF)**. Click **Create one Jira ticket for all open issues**. Wait for the green message with the ticket key. Switch to tab (d), open the new ticket, scroll the description. | "One click creates a Jira ticket with every issue and its suggested wording. The ticket lists the most severe twenty-five and says how many more there are." |
| 2:00-2:25 | Tab (b) **demo 2** (Romanian). "•••" > Apps > CounterSign. Show a diacritics card (for example "sanatate" instead of "sănătate"). | "It also checks Romanian: the same claim rules, plus missing diacritics." |
| 2:25-3:05 | Left sidebar > **Space apps** > **CounterSign dashboard**. Click **Scan the space**. Show: open issues, high and medium counts, issues by type. | "The dashboard scans the whole space and shows issues by type." |
| 3:05-3:15 | *(Only if rehearsed OK)* Edit one demo page to remove a claim, publish, click **Scan the space again**; point at **Fixed issues**. | "After someone fixes a page, a new scan counts the issue as fixed." |
| 3:15-3:45 | Tab (c) **demo 4**. "•••" > Apps > CounterSign. Point at **Page context (Teamwork Graph)**: "People: ... (owner)". If the linked pages list is there, point at it too. | "This is the Teamwork Graph part. It is read only, and it is a Preview API. CounterSign asks the graph who owns and contributed to the page, and which pages it links to, and puts that in the window and in the ticket, so the correction goes to the right person. If the graph has nothing, the section is simply hidden." |
| 3:45-3:58 | Tab (e): gear icon > search "CounterSign" in the settings box > **Apps** > **CounterSign settings**. Show language, forbidden words, brand names. | "Admins add their own forbidden words and brand names, no code." |
| 3:58-4:30 | Show `manifest.yml` in an editor (module names visible: `rovo:action`, `rovo:skill`, `rovo:mcp`). | "The same checks are five reusable Rovo actions and a skill, and they are exposed through the Atlassian MCP server. I also wrote a Rovo agent, but Atlassian's screening rejected its prompt at deploy time, so it is not in the submission. I am saying that openly rather than hiding it." |
| 4:30-4:45 | Closing card: name, "Built with Claude Code", "All rules are DRAFT - not legal advice - fictional products only". | "CounterSign. Check the claim before you publish it." |

Total about 4:45. If you run over 4:50, cut scene 3:05-3:15 and shorten the Romanian scene.

## After recording
- Upload to YouTube as **Public**. Title: "CounterSign - Codegeist 2026". Put the repo link and "Built with Claude Code" in the description.
- Watch it once with sound off: every important screen must be readable without audio.
- Check no e-mail address, token or personal data is visible at any frame.
