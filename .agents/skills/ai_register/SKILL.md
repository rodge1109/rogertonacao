---
name: AI Register Skill
description: Automates user account registrations across websites listed in Google Sheets or target URLs using Playwright, auto-fills credentials, listens for Gmail IMAP confirmation emails, clicks verification links, and logs registered accounts.
---

# AI Register Skill

This skill allows the agent to automatically register user accounts on target websites or URLs listed in a Google Sheet, fill in user credentials, listen for incoming confirmation emails/OTPs via Gmail IMAP, click verification links, and complete account setup.

## Triggering Keywords
- "AI Register"
- "auto register accounts"
- "automate website signup"
- "register accounts from Google Sheet"
- "auto confirm registration email"

## Instructions for the Agent
1. Locate the script: `c:/website/website-landingpage-roger/.agents/skills/ai_register/scripts/ai_register.py`.
2. Parse target arguments:
   - `--sheets-url`: Google Sheet URL containing target signup pages.
   - `--url`: Specific registration page URL.
   - `--name`: Candidate Full Name (default: "Roger Tonacao").
   - `--email`: Candidate Email (default: "rodge.tonacao@gmail.com").
   - `--username`: Default Username (default: "rogertonacao").
   - `--password`: Default Password (default: "RodgeTonacao2026!").
   - `--phone`: Contact Phone Number.
3. Run the script using Python:
   ```bash
   python c:/website/website-landingpage-roger/.agents/skills/ai_register/scripts/ai_register.py --sheets-url "https://docs.google.com/spreadsheets/d/YOUR_SHEET_ID/edit"
   ```
4. Output results in a structured Markdown table summarizing registered URLs, user emails, confirmation status, and timestamps.
