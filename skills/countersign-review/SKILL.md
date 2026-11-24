---
name: countersign-review
description: Review food-supplement marketing text or a Confluence page for EU health-claim problems (Regulation 1924/2006), missing mandatory supplement statements and Romanian diacritics, then propose compliant rewordings and optionally open one Jira correction ticket. Use when the user asks to check, review, or fix supplement product copy.
license: MIT
compatibility: Requires the CounterSign Forge app (check-text, check-page, suggest-rewording, list-jira-projects, create-correction-ticket actions).
metadata:
  status: Reviewed by a community pharmacy professional (20 years' experience) - not legal advice
---

# CounterSign review procedure

Use this procedure when someone wants supplement copy checked.

1. **Get the text.** If the user pasted text, call `check-text`. If they mean a Confluence page, call `check-page` (leave the page id empty when they are viewing the page).
2. **Read the result.** Group issues by severity: high, medium, low. Mention the number per type: health claim, missing mandatory statement, diacritics.
3. **Explain each issue** in three short lines: *Found* (the quoted text), *Problem* (why it is not allowed or missing), *Suggested rewording* (from the result; never invent an "authorised claim").
4. **Offer next steps:** rewrite the text with the suggestions, or create a Jira ticket.
5. **Ticket flow.** Only when asked: call `list-jira-projects`, ask which project (a normal Jira project, not Jira Service Management), then call `create-correction-ticket`. Give the ticket key to the user.
6. **Always end with the disclaimer:** the rules are "Reviewed by a community pharmacy professional (20 years' experience) - not legal advice", and a qualified regulatory person must approve the final wording.

## Do not
- Do not say a text is "compliant" or "approved"; say that the rules found no issues.
- Do not create tickets without a clear request.

## Tools used and why
- `check-text`: checks pasted text (EN or RO) and returns issues with suggested rewordings.
- `check-page`: reads a Confluence page the user can see and checks it the same way.
- `suggest-rewording`: returns only the rewordings for claims and diacritics (when the user wants fixes, not a full report).
- `list-jira-projects`: lists projects so the user chooses where the ticket goes.
- `create-correction-ticket`: creates one Jira ticket with all issues of a page (only after the user confirmed).