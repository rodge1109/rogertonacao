---
name: Hotel Sales AI Skill
description: Sends customized warm-up and pitch emails to hotels and resorts provided directly or via a Google Sheet, offering website and reservation system development services.
---

# Hotel Sales AI Skill

This skill automates sending customized outreach and pitch emails to prospective hotel clients. It uses a predefined template, reads hotel contact data, replaces placeholders with the specific hotel's details, and dispatches the emails securely using Gmail SMTP.

## Usage

```bash
# To send emails based on a Google Sheet URL:
python c:/website/website-landingpage-roger/.agents/skills/hotel_sales_ai/scripts/hotel_sales.py --sheet-url "YOUR_GOOGLE_SHEET_URL"

# To specify a custom subject (Default is: "Upgrading your hotel's online booking experience"):
python c:/website/website-landingpage-roger/.agents/skills/hotel_sales_ai/scripts/hotel_sales.py --sheet-url "YOUR_GOOGLE_SHEET_URL" --subject "Hello from Roger"

# To test with a single direct email address (useful for debugging):
python c:/website/website-landingpage-roger/.agents/skills/hotel_sales_ai/scripts/hotel_sales.py --email "test@example.com" --company "Grand Hotel"
```

## Features

- **Google Sheets Integration:** Can download a public Google Sheet as a CSV and parse `Email Address` and `Company Name` columns.
- **Template Replacements:** Dynamically replaces `{Company Name}` in `resources/pitch_template.txt`.
- **Throttling:** Implements a short delay between emails to avoid triggering spam filters.
- **Smart Filtering:** Automatically skips entries that don't have a valid email address (e.g., "N/A").

## Dependencies

- Uses python's built-in `smtplib`, `csv`, `urllib`, `argparse`, and `email.message`.
- Requires SMTP credentials to be set in the `.env` file (or falls back to default developer credentials).
