---
name: Website Hotel Scraper Skill
description: Scrapes Yahoo Search and target business websites/Facebook pages to find hotels, resorts, and restaurants in Cebu/Bogo City, determining if they have websites and compiling their contact info (Company Name, Contact Person, Email Address, Website, Phone, Address) into a CSV file.
---

# Website Hotel Scraper Skill

This skill allows the agent to search for hotels, resorts, and restaurants in a specific location (defaulting to Bogo City, Cebu), determine whether they have websites or public Facebook pages, and compile their contact details into a CSV report saved in the user's Downloads directory.

## Triggering Keywords
- "find hotels resorts restaurants"
- "website hotel scraper"
- "scrape hotels"
- "hotel scraper"
- "scrape facebook hotels"
- "facebook hotel scraper"
- "find hotels on facebook"

## Instructions for the Agent
1. Locate the helper script: `c:/website/website-landingpage-roger/.agents/skills/website_hotel_scraper/scripts/scrape_hotels.py`.
2. Determine the mode to run:
   * **Standard Mode (Websites & Directories):** Run when the user asks for websites and general search.
     ```bash
     python c:/website/website-landingpage-roger/.agents/skills/website_hotel_scraper/scripts/scrape_hotels.py --location "Bogo City, Cebu"
     ```
   * **Social Media Mode (Facebook Pages & Snippets):** Run when the user mentions Facebook, social media, or wants to maximize phone/mobile number extraction rates.
     ```bash
     python c:/website/website-landingpage-roger/.agents/skills/website_hotel_scraper/scripts/scrape_hotels.py --location "Bogo City, Cebu" --facebook
     ```
3. You can enable writing directly to Google Sheets by appending one of these flags:
   * **Google Apps Script Web App (Recommended - no auth required):**
     ```bash
     python c:/website/website-landingpage-roger/.agents/skills/website_hotel_scraper/scripts/scrape_hotels.py --location "Bogo City, Cebu" --sheets-url "YOUR_APPS_SCRIPT_WEB_APP_URL"
     ```
   * **Direct API Service Account (Requires service_account.json):**
     ```bash
     python c:/website/website-landingpage-roger/.agents/skills/website_hotel_scraper/scripts/scrape_hotels.py --location "Bogo City, Cebu" --sheets-id "1iwb_aDX8yp6oQ-DCZ-UaQwNHw_hxMjmfsn0x5126yls" --sheets-name "HOTEL AND RESORTS DATA"
     ```
4. You can override the location by passing the `--location` argument (e.g. `--location "Cebu City"`).
5. Parse the stdout JSON returned by the script. It contains:
   * `csv_path`: Where the CSV file was saved.
   * `total_found`: Total number of businesses scanned.
   * `with_website`: Number of businesses with active websites.
   * `no_website`: Number of businesses without active websites.
   * `businesses`: List of businesses found with their scraped contact details.
6. Present a clean markdown table summarizing the businesses found, highlighting the columns: Company Name, Website, Facebook Page, Email, Phone, and Address.
7. Provide a clickable link to the generated CSV file.
