import os
import re
import csv
import json
import urllib.request
import urllib.parse
import argparse
import time
import socket

# Prevent socket reads/writes from hanging indefinitely
socket.setdefaulttimeout(15)

# Aggregator domains for standard mode
AGGREGATORS = [
    "facebook.com", "tripadvisor.com", "booking.com", "agoda.com", "expedia.com",
    "hotels.com", "trivago.com", "airbnb.com", "yelp.com", "instagram.com",
    "youtube.com", "pinterest.com", "twitter.com", "linkedin.com", "grab.com",
    "foodpanda.ph", "maps.google.com", "wikipedia.org", "yellow-pages.ph",
    "localdial.com", "cybo.com", "nicelocal.ph", "philippines-places.com",
    "google.com/maps", "trip.com"
]

# Baseline establishments to guarantee Bogo City and Northern Cebu coverage
BASELINE_ESTABLISHMENTS = [
    {"name": "Bogo Vista Tourist Inn", "type": "Hotel"},
    {"name": "Orchids Tourist Inn", "type": "Hotel"},
    {"name": "Naomi's Tourist Inn", "type": "Hotel"},
    {"name": "Prince Express Inn Bogo", "type": "Hotel"},
    {"name": "City of Bogo Science and Technology Inn", "type": "Hotel"},
    {"name": "Acapulco Resort Bogo", "type": "Resort"},
    {"name": "Verde Del Sol Resort", "type": "Resort"},
    {"name": "San Remigio Beach Club", "type": "Resort"},
    {"name": "Elegant Beach Resort", "type": "Resort"},
    {"name": "Casa del Mar Beach Resort", "type": "Resort"},
    {"name": "Medellin Dockside Resort", "type": "Resort"},
    {"name": "Blanco Beach Resort", "type": "Resort"},
    {"name": "Bogo Grill & Restaurant", "type": "Restaurant"},
    {"name": "Capitancillo Cafe & Restaurant", "type": "Restaurant"},
    {"name": "Kuchefnero Restaurant", "type": "Restaurant"},
    {"name": "Alberto's Pizza Bogo", "type": "Restaurant"},
    {"name": "Pizza Pedrico's Bogo", "type": "Restaurant"},
    {"name": "Bogo Vista Restaurant", "type": "Restaurant"}
]

def clean_yahoo_url(url):
    if not url:
        return ""
    try:
        if "/RU=" in url:
            ru_match = re.search(r'/RU=([^/]+)', url)
            if ru_match:
                url = urllib.parse.unquote(ru_match.group(1))
        elif "%3a%2f%2f" in url.lower() or "%3A%2F%2F" in url:
            url = urllib.parse.unquote(url)
    except Exception:
        pass
    # Clean trailing Yahoo parameters
    url = re.sub(r'/RK=.*', '', url)
    return url

def clean_facebook_title(title):
    """
    Cleans page names from Yahoo Search Facebook results to get the company name.
    """
    # Remove breadcrumb prefix like "Facebook https://www.facebook.com › name"
    title = re.sub(r'^Facebook\s+https://www\.facebook\.com\s+[\u203a›]\s+\S+', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*(?:Home|Posts|About|Photos|Videos|Reviews|Menu|Prices|Services|Community|Groups)\b.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*\|\s*Facebook\b.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Facebook\b.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Bogo City\b.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Cebu\b.*', '', title, flags=re.IGNORECASE)
    title = re.sub(r'\s*-\s*Philippines\b.*', '', title, flags=re.IGNORECASE)
    return title.strip()

def get_domain(url):
    try:
        parsed = urllib.parse.urlparse(url)
        return parsed.netloc.lower()
    except Exception:
        return ""

def is_aggregator(url):
    domain = get_domain(url)
    if not domain:
        return True
    return any(agg in domain for agg in AGGREGATORS)

def search_yahoo(query):
    # Clean query from quotes to prevent Yahoo 500 INKApi Error
    query = query.replace('"', '').replace("'", "")
    encoded_query = urllib.parse.quote_plus(query)
    url = f"https://search.yahoo.com/search?q={encoded_query}"
    
    user_agents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:109.0) Gecko/20100101 Firefox/121.0',
        'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/119.0.0.0 Safari/537.36'
    ]
    
    html = ""
    for attempt in range(3):
        headers = {
            'User-Agent': user_agents[attempt % len(user_agents)],
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5'
        }
        req = urllib.request.Request(url, headers=headers)
        try:
            with urllib.request.urlopen(req, timeout=12) as response:
                html = response.read().decode('utf-8', errors='ignore')
                if "INKApi Error" not in html and response.getcode() == 200:
                    break
                else:
                    time.sleep(8)
        except Exception:
            time.sleep(8)
        
    if not html:
        return [], ""
        
    # Split search results by li tags
    blocks = re.split(r'<li[^>]*>', html)
    # Filter out blocks that don't contain a yahoo search result link
    blocks = [b for b in blocks if 'href="https://r.search.yahoo.com/' in b or 'href=\x22https://r.search.yahoo.com/' in b]
        
    results = []
    for b in blocks:
        # Try to find Yahoo redirect URL in this block
        url_match = re.search(r'href=\x22https://r\.search\.yahoo\.com/[^\x22]*RU=([^\x22]+)\x22|href="https://r\.search\.yahoo\.com/[^"]*RU=([^"]+)"', b)
        if not url_match:
            url_match = re.search(r'href=\x22(https://r\.search\.yahoo\.com/[^\x22]+)\x22|href="(https://r\.search\.yahoo\.com/[^"]+)"', b)
        if not url_match:
            continue
            
        raw_url = next((g for g in url_match.groups() if g), "")
        clean_target = clean_yahoo_url(raw_url)
        if not clean_target or "yahoo.com" in clean_target or "yimg.com" in clean_target or "bing.com" in clean_target:
            continue
            
        # Find the title (usually the first anchor text inside h3)
        title_match = re.search(r'<h3[^>]*>.*?<a[^>]*>(.*?)</a>', b, re.DOTALL)
        if not title_match:
            title_match = re.search(r'<a[^>]*>(.*?)</a>', b, re.DOTALL)
        title = title_match.group(1) if title_match else "No Title"
        title = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', title)).strip()
        title = urllib.parse.unquote(title).replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'").replace('&ndash;', '-')
        
        # Find snippet in this block
        snippet_match = re.search(r'<p class="[^"]*fc-28[^"]*">(.*?)</p>|<div class="compText[^"]*">(.*?)</div>|<span class="[^"]*fc-28[^"]*">(.*?)</span>|<p class=\x22[^\x22]*fc-28[^\x22]*\x22>(.*?)</p>|<div class=\x22compText[^\x22]*\x22>(.*?)</div>', b, re.DOTALL)
        snippet = ""
        if snippet_match:
            snippet = next((g for g in snippet_match.groups() if g), "")
            snippet = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', snippet)).strip()
            
        results.append({
            "name": title,
            "url": clean_target,
            "snippet": snippet
        })
        
    return results, html

def discover_businesses(html):
    text_blocks = re.findall(r'<a[^>]*>(.*?)</a>|<p[^>]*>(.*?)</p>|<span[^>]*>(.*?)</span>', html, re.DOTALL)
    combined_text = ' '.join([' '.join(t) for t in text_blocks])
    combined_text = re.sub(r'\s+', ' ', re.sub(r'<[^>]+>', ' ', combined_text))
    combined_text = urllib.parse.unquote(combined_text).replace('&amp;', '&').replace('&quot;', '"').replace('&#39;', "'").replace('&ndash;', '-')
    
    pattern = re.compile(r'\b([A-Z][a-zA-Z0-9\s\-\’\']{2,40}?(?:Hotel|Resort|Inn|Suites|Restaurant|Cafe|Grill|Kitchen|Bakehouse|Pizzeria|Lodge|Pension|Spa|Beach Club))\b')
    raw_matches = pattern.findall(combined_text)
    
    discovered = []
    for m in raw_matches:
        name = m.strip()
        name_lower = name.lower()
        
        if any(w in name_lower for w in ["booking.com", "tripadvisor", "agoda", "expedia", "yahoo", "google", "wikipedia", "how to", "official", "last updated", "list of"]):
            continue
        if len(name) < 5 or len(name) > 45:
            continue
            
        b_type = "Hotel"
        if "resort" in name_lower or "beach club" in name_lower:
            b_type = "Resort"
        elif any(r in name_lower for r in ["restaurant", "cafe", "grill", "kitchen", "bakehouse", "pizzeria"]):
            b_type = "Restaurant"
            
        discovered.append({"name": name, "type": b_type})
        
    return discovered

def extract_phones(text):
    # Remove HTML tags just in case
    text = re.sub(r'<[^>]+>', ' ', text)
    
    # List of regexes for different formats
    patterns = [
        # Mobile with parenthesized prefix or +639 or 09 or 9 (e.g. (0917) 123 4567, +63 917 123 4567, 0917-123-4567, 9171234567)
        r'\b(?:\(\s*0?9\d{2}\s*\)|(?:\+?63|0)?\s*9\d{2})[-\s]*\d{3}[-\s]*\d{4}\b',
        r'\b(?:\(\s*0?9\d{2}\s*\)|(?:\+?63|0)?\s*9\d{2})[-\s]*\d{4}[-\s]*\d{3}\b',
        # Landline with area code (e.g. (032) 434 8534, 032-434-8534, +63 32 434 8534)
        r'\b(?:\(\s*0\d{2,3}\s*\)|0\d{2,3}|\+?63\s*\d{2,3})[-\s]*\d{3}[-\s]*\d{4}\b',
        # Local landline (7 digits, e.g. 434 8534, 326-3658)
        r'\b\d{3}[-\s]*\d{4}\b'
    ]
    
    found = []
    for pattern in patterns:
        matches = re.findall(pattern, text)
        for m in matches:
            cleaned = re.sub(r'\s+', ' ', m).strip()
            # Filter out simple years or zip codes (like 2024, 2025, 2026, 6000, 6014)
            if cleaned.isdigit() and len(cleaned) <= 4:
                continue
                
            # Filter out obvious template/dummy numbers (like 888-8888, 000-0000, 123-4567)
            digits_only = re.sub(r'\D', '', cleaned)
            if len(set(digits_only)) <= 2 and len(digits_only) >= 5:
                continue
            if digits_only in ["1234567", "1234568", "1234569"]:
                continue
                
            digits_m = re.sub(r'\D', '', cleaned)
            is_subset = False
            for existing in list(found):
                digits_ex = re.sub(r'\D', '', existing)
                if digits_m in digits_ex or digits_ex in digits_m:
                    is_subset = True
                    # Keep the longer one (with prefix/area code)
                    if len(digits_ex) < len(digits_m):
                        found.remove(existing)
                        found.append(cleaned)
                    break
            
            if not is_subset and cleaned not in found:
                found.append(cleaned)
    return found

def scrape_website(url):
    contact_info = {"email": "N/A", "phone": "N/A", "address": "N/A", "contact_person": "N/A"}
    headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=8) as response:
            html = response.read().decode('utf-8', errors='ignore')
    except Exception:
        return contact_info
        
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}', html)
    valid_emails = [e for e in emails if not any(e.lower().endswith(ext) for ext in ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js'])]
    if valid_emails:
        contact_info["email"] = ", ".join(list(set(valid_emails))[:2])
        
    phones = extract_phones(html)
    if phones:
        contact_info["phone"] = ", ".join(phones[:2])
        
    address_match = re.search(r'(?:Address|Location|Address:)\s*:\s*([^<\n\r]+)', html, re.IGNORECASE)
    if address_match:
        contact_info["address"] = re.sub(r'<[^>]+>', '', address_match.group(1)).strip()
    else:
        lines = html.split('\n')
        for line in lines:
            line_clean = re.sub(r'<[^>]+>', '', line).strip()
            if 10 < len(line_clean) < 120 and any(k in line_clean.lower() for k in ["cebu", "bogo", "barangay", "brgy"]):
                contact_info["address"] = line_clean
                break
                
    contact_person_match = re.search(r'(?:Contact Person|Manager|Owner|Proprietor|Representative)\s*:\s*([^<\n\r]+)', html, re.IGNORECASE)
    if contact_person_match:
        contact_info["contact_person"] = re.sub(r'<[^>]+>', '', contact_person_match.group(1)).strip()
        
    return contact_info

def extract_from_snippet(snippet):
    info = {"email": "", "phone": "", "address": ""}
    
    emails = re.findall(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}', snippet)
    if emails:
        info["email"] = ", ".join(list(set(emails))[:2])
        
    phones = extract_phones(snippet)
    if phones:
        info["phone"] = ", ".join(phones[:2])
        
    if any(k in snippet.lower() for k in ["bogo", "cebu", "street", "st.", "road", "rd.", "brgy", "barangay", "poblacion"]):
        clauses = re.split(r'[,.;]\s*', snippet)
        for c in clauses:
            if any(k in c.lower() for k in ["bogo", "cebu", "street", "road", "brgy", "poblacion"]):
                info["address"] = c.strip()
                break
                
    return info

def upload_to_google_sheet_via_api(url, data):
    print("Uploading results to Google Sheet Web App...")
    import urllib.request
    import json
    
    headers = {'Content-Type': 'application/json'}
    payload = json.dumps(data).encode('utf-8')
    req = urllib.request.Request(url, data=payload, headers=headers, method='POST')
    try:
        with urllib.request.urlopen(req, timeout=30) as response:
            res_body = response.read().decode('utf-8')
            res_data = json.loads(res_body)
            if res_data.get("success"):
                print("SUCCESS: Google Sheet updated successfully!")
                return True
            else:
                print(f"FAILED to update Google Sheet: {res_data.get('error')}")
                return False
    except Exception as e:
        print(f"Error uploading to Google Sheet: {e}")
        return False

def upload_to_google_sheet_direct(spreadsheet_id, sheet_name, data, credentials_path):
    print("Uploading results to Google Sheet directly using Service Account...")
    try:
        from google.oauth2 import service_account
        from googleapiclient.discovery import build
        
        SCOPES = ['https://www.googleapis.com/auth/spreadsheets']
        creds = service_account.Credentials.from_service_account_file(credentials_path, scopes=SCOPES)
        service = build('sheets', 'v4', credentials=creds)
        
        sheet_metadata = service.spreadsheets().get(spreadsheetId=spreadsheet_id).execute()
        sheets = sheet_metadata.get('sheets', '')
        sheet_names = [s.get("properties", {}).get("title", "") for s in sheets]
        
        if sheet_name not in sheet_names:
            body = {
                'requests': [{
                    'addSheet': {
                        'properties': {
                            'title': sheet_name
                        }
                    }
                }]
            }
            service.spreadsheets().batchUpdate(spreadsheetId=spreadsheet_id, body=body).execute()
            
            # Write headers
            headers = ["Company Name", "Contact Person", "Email Address", "Website", "Facebook", "Phone", "Address", "Type"]
            service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=f"'{sheet_name}'!A1",
                valueInputOption="RAW",
                body={'values': [headers]}
            ).execute()
            
        rows = []
        for row in data:
            rows.append([
                row.get("Company Name", "N/A"),
                row.get("Contact Person", "N/A"),
                row.get("Email Address", "N/A"),
                row.get("Website", "N/A"),
                row.get("Facebook", "N/A"),
                row.get("Phone", "N/A"),
                row.get("Address", "N/A"),
                row.get("Type", "N/A")
            ])
            
        if rows:
            service.spreadsheets().values().append(
                spreadsheetId=spreadsheet_id,
                range=f"'{sheet_name}'!A2",
                valueInputOption="RAW",
                body={'values': rows}
            ).execute()
            
        print("SUCCESS: Google Sheet updated successfully!")
        return True
    except Exception as e:
        print(f"Error uploading directly to Google Sheet: {e}")
        return False

def main():
    parser = argparse.ArgumentParser(description="Yahoo/Facebook-based Hotel/Resort/Restaurant Scraper.")
    parser.add_argument("--location", default="Bogo City, Cebu", help="Location to search.")
    parser.add_argument("--output", default="", help="CSV Output Path.")
    parser.add_argument("--limit", type=int, default=10, help="Limit search items.")
    parser.add_argument("--facebook", action="store_true", help="Enable Facebook site-filtering search mode.")
    parser.add_argument("--sheets-url", default="", help="Google Apps Script Web App URL to append data to Google Sheet.")
    parser.add_argument("--sheets-id", default="", help="Google Spreadsheet ID to append data directly.")
    parser.add_argument("--sheets-name", default="HOTEL AND RESORTS DATA", help="Target sheet/tab name inside the Google Spreadsheet.")
    parser.add_argument("--credentials", default="service_account.json", help="Path to Google Service Account JSON credentials file.")
    args = parser.parse_args()
    
    location = args.location
    limit = args.limit
    
    if not args.output:
        downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
        output_csv = os.path.join(downloads_dir, "hotels_resorts_restaurants.csv")
    else:
        output_csv = args.output
        
    final_businesses = []
    
    if args.facebook:
        print(f"Starting Facebook-focused search for businesses in {location}...")
        categories = ["hotel", "resort", "restaurant"]
        for cat in categories:
            query = f'site:facebook.com "{location}" {cat}'
            results, _ = search_yahoo(query)
            
            for item in results[:limit]:
                raw_name = item["name"]
                url = item["url"]
                snippet = item["snippet"]
                
                company_name = clean_facebook_title(raw_name)
                
                biz_data = {
                    "Company Name": company_name,
                    "Contact Person": "N/A",
                    "Email Address": "N/A",
                    "Website": "None",
                    "Facebook": url,
                    "Phone": "N/A",
                    "Address": location,
                    "Type": cat.capitalize()
                }
                
                # Extract contacts from snippet
                snippet_info = extract_from_snippet(snippet)
                if snippet_info["email"]:
                    biz_data["Email Address"] = snippet_info["email"]
                if snippet_info["phone"]:
                    biz_data["Phone"] = snippet_info["phone"]
                if snippet_info["address"]:
                    biz_data["Address"] = snippet_info["address"]
                    
                # Try to find official website in Facebook mode
                time.sleep(3.5)
                web_query = f"{company_name} {location} official website"
                web_results, _ = search_yahoo(web_query)
                if web_results:
                    for w_res in web_results[:3]:
                        w_url = w_res["url"]
                        if not is_aggregator(w_url) and "facebook.com" not in w_url:
                            biz_data["Website"] = w_url
                            break
                            
                # If phone is missing, try a targeted search for the phone number
                if biz_data["Phone"] == "N/A":
                    time.sleep(3.5)
                    phone_query = f"{company_name} {location} phone number mobile contact tel cell"
                    sec_results, _ = search_yahoo(phone_query)
                    if sec_results:
                        for s_res in sec_results[:3]:
                            sec_info = extract_from_snippet(s_res["snippet"])
                            if sec_info["phone"]:
                                biz_data["Phone"] = sec_info["phone"]
                                break
                                
                # If email is missing, try a targeted search for the email
                if biz_data["Email Address"] == "N/A":
                    time.sleep(3.5)
                    email_query = f"{company_name} {location} email contact address"
                    sec_results, _ = search_yahoo(email_query)
                    if sec_results:
                        for s_res in sec_results[:3]:
                            sec_info = extract_from_snippet(s_res["snippet"])
                            if sec_info["email"]:
                                biz_data["Email Address"] = sec_info["email"]
                                break
                                
                final_businesses.append(biz_data)
                time.sleep(3.5)
    else:
        # Standard Mode (Websites & Directories)
        print(f"Starting general web search for businesses in {location}...")
        discovered_list = []
        categories = ["hotels", "resorts", "restaurants"]
        for cat in categories:
            query = f"{cat} in {location}"
            results, html = search_yahoo(query)
            cat_discovered = discover_businesses(html)
            discovered_list.extend(cat_discovered)
            time.sleep(3.5)
            
        all_targets = []
        seen_names = set()
        for b in BASELINE_ESTABLISHMENTS:
            name_key = b["name"].lower()
            if name_key not in seen_names:
                all_targets.append(b)
                seen_names.add(name_key)
        for b in discovered_list:
            name_key = b["name"].lower()
            if name_key not in seen_names:
                all_targets.append(b)
                seen_names.add(name_key)
                
        print(f"Found {len(all_targets)} establishments to scan. Starting details collection...")
        
        for idx, target in enumerate(all_targets[:limit * 3]):
            name = target["name"]
            b_type = target["type"]
            
            biz_data = {
                "Company Name": name,
                "Contact Person": "N/A",
                "Email Address": "N/A",
                "Website": "None",
                "Facebook": "None",
                "Phone": "N/A",
                "Address": location,
                "Type": b_type
            }
            
            query_details = f'"{name}" {location} contact'
            details_results, _ = search_yahoo(query_details)
            
            if details_results:
                # Loop through top 5 search results to extract Website and Facebook links
                for res in details_results[:5]:
                    cand_url = res["url"]
                    cand_snippet = res["snippet"]
                    
                    snippet_details = extract_from_snippet(cand_snippet)
                    if snippet_details["email"] and biz_data["Email Address"] == "N/A":
                        biz_data["Email Address"] = snippet_details["email"]
                    if snippet_details["phone"] and biz_data["Phone"] == "N/A":
                        biz_data["Phone"] = snippet_details["phone"]
                    if snippet_details["address"] and biz_data["Address"] == location:
                        biz_data["Address"] = snippet_details["address"]
                        
                    if "facebook.com" in cand_url:
                        if biz_data["Facebook"] == "None":
                            biz_data["Facebook"] = cand_url
                    elif not is_aggregator(cand_url):
                        if biz_data["Website"] == "None":
                            biz_data["Website"] = cand_url
                            web_details = scrape_website(cand_url)
                            if web_details["email"] != "N/A" and biz_data["Email Address"] == "N/A":
                                biz_data["Email Address"] = web_details["email"]
                            if web_details["phone"] != "N/A" and biz_data["Phone"] == "N/A":
                                biz_data["Phone"] = web_details["phone"]
                            if web_details["address"] != "N/A" and biz_data["Address"] == location:
                                biz_data["Address"] = web_details["address"]
                            if web_details["contact_person"] != "N/A" and biz_data["Contact Person"] == "N/A":
                                biz_data["Contact Person"] = web_details["contact_person"]
                            
                # If phone is still missing, try a targeted search for the phone number
                if biz_data["Phone"] == "N/A":
                    time.sleep(3.5)
                    phone_query = f"{name} {location} phone number mobile contact tel cell"
                    sec_results, _ = search_yahoo(phone_query)
                    if sec_results:
                        for s_res in sec_results[:3]:
                            sec_info = extract_from_snippet(s_res["snippet"])
                            if sec_info["phone"]:
                                biz_data["Phone"] = sec_info["phone"]
                                break
                                
                # If email is still missing, try a targeted search for the email
                if biz_data["Email Address"] == "N/A":
                    time.sleep(3.5)
                    email_query = f"{name} {location} email contact address"
                    sec_results, _ = search_yahoo(email_query)
                    if sec_results:
                        for s_res in sec_results[:3]:
                            sec_info = extract_from_snippet(s_res["snippet"])
                            if sec_info["email"]:
                                biz_data["Email Address"] = sec_info["email"]
                                break
                            
            final_businesses.append(biz_data)
            time.sleep(3.5)
            
    # Save results to CSV
    existing_entries = []
    file_exists = os.path.exists(output_csv)
    if file_exists:
        try:
            with open(output_csv, "r", newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                if reader.fieldnames:
                    for row in reader:
                        if "Facebook" not in row:
                            if "Website" in row and "facebook.com" in row["Website"]:
                                row["Facebook"] = row["Website"]
                                row["Website"] = "None"
                            else:
                                row["Facebook"] = "None"
                        existing_entries.append(row)
        except Exception:
            pass
            
    existing_names = {row["Company Name"].lower() for row in existing_entries if "Company Name" in row}
    entries_to_write = list(existing_entries)
    
    added_count = 0
    for biz in final_businesses:
        if biz["Company Name"].lower() not in existing_names:
            entries_to_write.append(biz)
            added_count += 1
            
    csv_headers = ["Company Name", "Contact Person", "Email Address", "Website", "Facebook", "Phone", "Address", "Type"]
    csv_saved = False
    try:
        downloads_dir = os.path.dirname(output_csv)
        if downloads_dir:
            os.makedirs(downloads_dir, exist_ok=True)
            
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=csv_headers)
            writer.writeheader()
            writer.writerows(entries_to_write)
        csv_saved = True
    except PermissionError as pe:
        print(f"Error saving CSV: {pe}. Please make sure the CSV file is closed in Excel or VS Code before running.")
    except Exception as e:
        print(f"Error saving CSV: {e}")
        
    with_website_count = sum(1 for b in final_businesses if b["Website"] != "None")
    no_website_count = len(final_businesses) - with_website_count
    
    # Save results to Google Sheets if requested
    if args.sheets_url:
        upload_to_google_sheet_via_api(args.sheets_url, final_businesses)
    elif args.sheets_id:
        creds_path = args.credentials
        if not os.path.exists(creds_path):
            script_dir = os.path.dirname(os.path.abspath(__file__))
            creds_path = os.path.join(script_dir, args.credentials)
            
        if os.path.exists(creds_path):
            upload_to_google_sheet_direct(args.sheets_id, args.sheets_name, final_businesses, creds_path)
        else:
            print(f"FAILED: Google credentials file '{args.credentials}' not found. Cannot write directly to Google Sheets.")

    output_result = {
        "csv_path": output_csv,
        "csv_saved": csv_saved,
        "total_found": len(final_businesses),
        "added_new": added_count,
        "with_website": with_website_count,
        "no_website": no_website_count,
        "businesses": final_businesses
    }
    
    print(json.dumps(output_result, indent=2))

if __name__ == "__main__":
    main()
