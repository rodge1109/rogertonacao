---
name: Cebu Weather Scraper Skill
description: Scrapes PAGASA weather forecast and generates a CSV and PDF weather report for Cebu and Bogo City in the Downloads folder, summarizing and translating it to Cebuano.
---

# Cebu Weather Scraper Skill

This skill allows the agent to scrape PAGASA regional weather forecasts specifically for Cebu/Bogo City, generate CSV and PDF files in the user's Downloads directory, and present a translated Bisaya summary.

## Triggering Keywords
- "weather forecast for Bogo City"
- "weather scraper Cebu"
- "pagasa weather report Cebu"
- "scrape weather"

## Instructions for the Agent
1. When triggered, locate the helper script: `c:/website/website-landingpage-roger/.agents/skills/weather_scraper/scripts/scrape_weather.py`.
2. Run this script using `python` under the appropriate command execution tool:
   ```bash
   python c:/website/website-landingpage-roger/.agents/skills/weather_scraper/scripts/scrape_weather.py
   ```
3. Parse the stdout JSON returned by the script. It contains:
   * `csv_path`: Where the CSV file was saved.
   * `csv_saved`: Boolean indicating success.
   * `pdf_path`: Where the PDF report was saved.
   * `pdf_saved`: Boolean indicating success.
   * `forecasts`: The raw Cebu 6-day outlook.
   * `advisories`: Any active thunderstorm advisories referencing Cebu/Bogo City.
   * `special_alerts`: Special warnings (like Northern Cebu Earthquake updates).
4. Present a summary of the active warnings and the 6-day outlook (including wind speed, direction, and coastal conditions if data is available).
5. Provide clickable links to the generated CSV file, PDF report, and standalone PNG map.
