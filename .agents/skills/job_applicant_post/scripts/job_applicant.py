import os
import re
import csv
import json
import argparse
import urllib.request
import urllib.parse
import smtplib
import mimetypes
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from email.mime.base import MIMEBase
from email import encoders
import datetime

def load_env_file():
    """Load environment variables from server/.env or root .env files."""
    possible_paths = [
        os.path.join(os.getcwd(), "server", ".env"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "server", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"),
    ]
    for path in possible_paths:
        if os.path.exists(path):
            try:
                with open(path, "r", encoding="utf-8") as f:
                    for line in f:
                        line = line.strip()
                        if line and not line.startswith("#") and "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'\"")
                            if key not in os.environ:
                                os.environ[key] = val
            except Exception:
                pass

def fetch_url_content(url):
    """Fetch raw HTML content from a website or public URL with Playwright fallback to bypass 403 Forbidden blocks."""
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Sec-Ch-Ua": '"Not-A.Brand";v="99", "Chromium";v="124", "Google Chrome";v="124"',
        "Sec-Ch-Ua-Mobile": "?0",
        "Sec-Ch-Ua-Platform": '"Windows"',
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            html = response.read().decode("utf-8", errors="ignore")
            return html
    except Exception:
        try:
            from playwright.sync_api import sync_playwright
            with sync_playwright() as p:
                browser = p.chromium.launch(headless=True)
                page = browser.new_page()
                page.goto(url, timeout=12000)
                html = page.content()
                browser.close()
                return html
        except Exception:
            return ""

def extract_google_form_urls(text):
    """Extract Google Form URLs (docs.google.com/forms or forms.gle) from text or HTML."""
    pattern = r'https?://(?:docs\.google\.com/forms/[^\s"\'<>]+|forms\.gle/[^\s"\'<>]+)'
    found = re.findall(pattern, text)
    clean_urls = []
    for u in found:
        u_clean = u.strip().rstrip('.,;:!?)')
        clean_urls.append(u_clean)
    return list(set(clean_urls))

def scrape_facebook_group_via_playwright(cdp_url="http://localhost:9222", target_url="https://www.facebook.com/groups/4478714448882966/", max_scrolls=10):
    """Connect to an open Chrome/Edge browser via CDP (port 9222) or launch a persistent browser session to scrape post text & emails."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            browser = None
            for endpoint in [cdp_url, "http://127.0.0.1:9222"]:
                try:
                    print(f"Attempting connection to open browser at {endpoint}...")
                    browser = p.chromium.connect_over_cdp(endpoint)
                    if browser:
                        break
                except Exception:
                    pass
            
            if browser:
                context = browser.contexts[0] if browser.contexts else browser.new_context()
                page = None
                for p_item in context.pages:
                    if "facebook.com" in p_item.url:
                        page = p_item
                        break
                if not page:
                    page = context.new_page()
                    page.goto(target_url, timeout=30000)
            else:
                print("Opening interactive browser window for Facebook...")
                profile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "browser_profile")
                os.makedirs(profile_dir, exist_ok=True)
                try:
                    context = p.chromium.launch_persistent_context(
                        user_data_dir=profile_dir,
                        headless=False,
                        channel="chrome",
                        args=["--start-maximized"]
                    )
                except Exception:
                    context = p.chromium.launch_persistent_context(
                        user_data_dir=profile_dir,
                        headless=False,
                        args=["--start-maximized"]
                    )
                page = context.pages[0] if context.pages else context.new_page()
                page.goto(target_url, timeout=30000)
                
            page.wait_for_timeout(3000)
            
            # Autonomous browsing: scroll feed and expand post text
            print(f"Autonomous Playwright browsing: scrolling feed ({max_scrolls} passes) and expanding posts...")
            for step in range(max_scrolls):
                page.evaluate("window.scrollBy(0, 1000);")
                page.wait_for_timeout(1500)
                try:
                    # Click "See more" text elements to reveal hidden post details
                    buttons = page.query_selector_all("div[role='button']")
                    for b in buttons:
                        try:
                            txt = b.inner_text().strip().lower()
                            if "see more" in txt or "see..." in txt:
                                b.click(timeout=800)
                        except Exception:
                            pass
                except Exception:
                    pass

            content = page.content()
            text = clean_html_text(content)
            emails = extract_emails_from_text(content)
            form_urls = extract_google_form_urls(content)
            return {"text": text, "emails": emails, "form_urls": form_urls, "raw_html": content}
    except Exception as e:
        print(f"Playwright Browser Error: {e}")
        return None

def answer_recruiter_questions(page):
    """AI engine to auto-answer recruiter screening questions (experience, Yes/No radios, salary, skills)."""
    try:
        # 1. Answer Radio Buttons (Yes/No questions: authorization, remote, background check)
        radios = page.query_selector_all("input[type='radio']")
        for r in radios:
            try:
                parent_text = clean_html_text(r.evaluate("el => el.closest('div, fieldset, label') ? el.closest('div, fieldset, label').innerText : ''")).lower()
                val = (r.get_attribute("value") or "").lower()
                if "yes" in val or "yes" in parent_text:
                    r.check(timeout=500)
            except Exception:
                pass

        # 2. Answer Select Dropdowns (<select>)
        selects = page.query_selector_all("select")
        for s in selects:
            try:
                options = s.query_selector_all("option")
                target_val = None
                for opt in options:
                    txt = opt.inner_text().strip().lower()
                    if any(k in txt for k in ["yes", "fluent", "full-time", "5", "bachelor"]):
                        target_val = opt.get_attribute("value")
                        break
                if not target_val and len(options) > 1:
                    target_val = options[1].get_attribute("value")
                if target_val:
                    s.select_option(value=target_val)
            except Exception:
                pass

        # 3. Answer Text & Numeric Inputs
        text_inputs = page.query_selector_all("input[type='text'], input[type='number'], textarea")
        for inp in text_inputs:
            try:
                curr_val = inp.input_value()
                if curr_val and len(curr_val) > 0:
                    continue
                parent_text = clean_html_text(inp.evaluate("el => el.closest('div, fieldset, label') ? el.closest('div, fieldset, label').innerText : ''")).lower()
                
                if any(k in parent_text for k in ["years", "experience", "how many"]):
                    inp.fill("5")
                elif any(k in parent_text for k in ["salary", "compensation", "pay", "rate"]):
                    inp.fill("Negotiable")
                elif any(k in parent_text for k in ["notice", "start", "available"]):
                    inp.fill("Immediately")
                elif any(k in parent_text for k in ["city", "location", "address"]):
                    inp.fill("Cebu City, Philippines")
                else:
                    inp.fill("5 years of experience in Web Development and Virtual Assistance")
            except Exception:
                pass
    except Exception as e:
        print(f"Question Answering Notice: {e}")

def handle_linkedin_easy_apply(page, resume_path=None, phone="09171234567", submit=True):
    """Click and automate LinkedIn Easy Apply modal application with AI Question Answering."""
    try:
        easy_btn = page.query_selector("button.jobs-apply-button, button:has-text('Easy Apply'), button[aria-label*='Easy Apply']")
        if not easy_btn:
            return False
            
        print("LinkedIn 'Easy Apply' button detected! Initiating automated application...")
        easy_btn.click(timeout=1500)
        page.wait_for_timeout(2000)
        
        phone_input = page.query_selector("input[id*='phone'], input[name*='phone'], input[aria-label*='phone']")
        if phone_input:
            try:
                phone_input.fill(phone)
            except Exception:
                pass
                
        if resume_path and os.path.exists(resume_path):
            file_input = page.query_selector("input[type='file']")
            if file_input:
                try:
                    file_input.set_input_files(resume_path)
                except Exception:
                    pass

        for step in range(8):
            answer_recruiter_questions(page)
            page.wait_for_timeout(800)
            
            btn = page.query_selector("button:has-text('Next'), button:has-text('Review'), button:has-text('Submit application'), button[aria-label*='Continue'], button[aria-label*='Review'], button[aria-label*='Submit']")
            if btn:
                try:
                    btn_text = btn.inner_text().strip()
                    print(f"Easy Apply Step {step+1}: Clicking '{btn_text}'...")
                    btn.click(timeout=1500)
                    page.wait_for_timeout(1500)
                    if "Submit" in btn_text:
                        print("LinkedIn Easy Apply submitted successfully!")
                        return True
                except Exception as e:
                    print(f"Button click error: {e}")
                    break
            else:
                break
                
        return True
    except Exception as e:
        print(f"Easy Apply Automation Notice: {e}")
        return False

def scrape_linkedin_jobs_via_playwright(keywords="Web Developer", location="Remote", auto_apply=True, resume_path=None):
    """Scrape public LinkedIn job search results and details via Playwright."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            encoded_kw = urllib.parse.quote(keywords)
            encoded_loc = urllib.parse.quote(location)
            url = f"https://www.linkedin.com/jobs/search/?keywords={encoded_kw}&location={encoded_loc}"
            print(f"Playwright: Navigating to LinkedIn Jobs ({url})...")
            
            profile_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "browser_profile")
            os.makedirs(profile_dir, exist_ok=True)
            try:
                context = p.chromium.launch_persistent_context(user_data_dir=profile_dir, headless=False, channel="chrome", args=["--start-maximized"])
            except Exception:
                context = p.chromium.launch_persistent_context(user_data_dir=profile_dir, headless=False, args=["--start-maximized"])
            page = context.pages[0] if context.pages else context.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_timeout(4000)
            
            try:
                cookie_btn = page.query_selector("button:has-text('Accept'), button:has-text('Agree'), button[data-tracking-control-name*='cookie']")
                if cookie_btn:
                    cookie_btn.click(timeout=1000)
            except Exception:
                pass

            try:
                dismiss_btn = page.query_selector("button.modal__dismiss, button[aria-label*='Dismiss'], button.contextual-sign-in-modal__modal-dismiss, button.cta-modal__dismiss-btn")
                if dismiss_btn:
                    dismiss_btn.click(timeout=1000)
            except Exception:
                pass

            for _ in range(6):
                page.evaluate("window.scrollBy(0, 800);")
                page.wait_for_timeout(1000)

            postings = []
            selectors = "a[href*='/jobs/view/'], a[href*='linkedin.com/jobs/'], div.base-card, div.job-search-card, a.job-card-container__link, div.job-card-container, a.job-card-list__title, li.jobs-search-results__list-item, div.base-search-card"
            job_links = page.query_selector_all(selectors)
            if not job_links:
                page.evaluate("window.scrollBy(0, 1000);")
                page.wait_for_timeout(2000)
                job_links = page.query_selector_all("a[href*='/jobs/'], a[href*='currentJobId='], li[data-occluded-item-id], div.job-search-card")
            print(f"Discovered {len(job_links)} job card link(s) on LinkedIn. Interacting with cards to read full descriptions...")
            
            for idx, card in enumerate(job_links[:8]):
                try:
                    card.click(timeout=1500)
                    page.wait_for_timeout(1200)
                    
                    try:
                        show_more = page.query_selector("button.show-more-less-html__button, button[aria-label*='Show more']")
                        if show_more:
                            show_more.click(timeout=800)
                    except Exception:
                        pass
                        
                    card_content = page.content()
                    card_text = clean_html_text(card_content)
                    card_emails = extract_emails_from_text(card_content)
                    card_forms = extract_google_form_urls(card_content)
                    
                    title = "LinkedIn Job Posting"
                    try:
                        title_el = page.query_selector("h2.top-card-layout__title, h1.job-details-jobs-unified-top-card__job-title, h1.t-24")
                        if title_el:
                            title = title_el.inner_text().strip()
                    except Exception:
                        pass
                        
                    easy_submitted = False
                    if auto_apply:
                        easy_submitted = handle_linkedin_easy_apply(page, resume_path=resume_path, submit=True)

                    if not card_emails:
                        ext_res = follow_external_career_link(page.url)
                        if ext_res["emails"]:
                            card_emails.extend(ext_res["emails"])
                        if ext_res["form_urls"]:
                            card_forms.extend(ext_res["form_urls"])

                    postings.append({
                        "title": f"LinkedIn: {title}",
                        "url": page.url,
                        "snippet": card_text[:400],
                        "emails": list(set(card_emails)),
                        "form_urls": list(set(card_forms)),
                        "easy_apply": easy_submitted
                    })
                except Exception:
                    pass
                    
            if not postings:
                content = page.content()
                text = clean_html_text(content)
                emails = extract_emails_from_text(content)
                forms = extract_google_form_urls(content)
            return postings
    except Exception as e:
        print(f"LinkedIn Playwright Error: {e}")
        return []

def follow_external_career_link(target_url):
    """Follow external company career links to harvest HR contact emails and Google Forms."""
    if not target_url or not target_url.startswith("http") or "linkedin.com" in target_url or "facebook.com" in target_url:
        return {"emails": [], "form_urls": [], "snippet": ""}
        
    print(f"Option A Active: Following external company career link: {target_url}...")
    html = fetch_url_content(target_url)
    if not html:
        return {"emails": [], "form_urls": [], "snippet": ""}
        
    emails = extract_emails_from_text(html)
    forms = extract_google_form_urls(html)
    text = clean_html_text(html)

    if not emails:
        contact_links = re.findall(r'href="([^"]*(?:contact|careers|jobs|about|apply)[^"]*)"', html, re.IGNORECASE)
        base_domain = "/".join(target_url.split("/")[:3])
        for link in contact_links[:3]:
            full_child_url = link if link.startswith("http") else f"{base_domain}/{link.lstrip('/')}"
            child_html = fetch_url_content(full_child_url)
            if child_html:
                child_emails = extract_emails_from_text(child_html)
                child_forms = extract_google_form_urls(child_html)
                emails.extend(child_emails)
                forms.extend(child_forms)

    emails = list(set(emails))
    forms = list(set(forms))
    if emails:
        print(f"Option A Discovered External HR Email(s): {emails} on {target_url}")
    return {"emails": emails, "form_urls": forms, "snippet": text[:400]}

def fill_google_form_via_playwright(form_url, candidate_name="Roger Tonacao", email="rodge.tonacao@gmail.com", phone="09171234567", resume_path=None, cover_letter=None, submit=True):
    """Automate filling out Google Forms job applications using Playwright."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            print(f"Opening Google Form via Playwright: {form_url}...")
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()
            page.goto(form_url, timeout=30000)
            page.wait_for_timeout(3000)
            
            inputs = page.query_selector_all("input[type='text'], input[type='email'], input:not([type])")
            textareas = page.query_selector_all("textarea")
            
            for inp in inputs:
                try:
                    aria = (inp.get_attribute("aria-label") or "").lower()
                    placeholder = (inp.get_attribute("placeholder") or "").lower()
                    inp_type = (inp.get_attribute("type") or "").lower()
                    
                    parent_text = ""
                    try:
                        parent_text = inp.evaluate("el => el.closest('div[role=\"listitem\"], div[role=\"heading\"], div').innerText").lower()
                    except Exception:
                        pass
                    
                    combined = f"{aria} {placeholder} {parent_text}"
                    
                    if inp_type == "email" or "email" in combined:
                        inp.fill(email)
                    elif "name" in combined and "company" not in combined:
                        inp.fill(candidate_name)
                    elif any(k in combined for k in ["phone", "contact", "mobile", "number"]):
                        inp.fill(phone)
                    elif any(k in combined for k in ["role", "position", "title"]):
                        inp.fill("Web Developer / Virtual Assistant")
                except Exception:
                    pass

            if cover_letter:
                for ta in textareas:
                    try:
                        ta.fill(cover_letter)
                    except Exception:
                        pass

            if resume_path and os.path.exists(resume_path):
                file_inputs = page.query_selector_all("input[type='file']")
                for fi in file_inputs:
                    try:
                        fi.set_input_files(resume_path)
                    except Exception:
                        pass

            page.wait_for_timeout(2000)
            
            if submit:
                # Find submit button
                submit_btn = page.query_selector("div[role='button']:has-text('Submit'), span:has-text('Submit'), button:has-text('Submit'), div[role='button']:has-text('Enviar'), span:has-text('Enviar')")
                if not submit_btn:
                    # Fallback to any primary action button at form bottom
                    buttons = page.query_selector_all("div[role='button']")
                    if buttons:
                        submit_btn = buttons[-1]

                if submit_btn:
                    submit_btn.click()
                    page.wait_for_timeout(3500)
            return {"success": True, "message": "Google Form filled successfully!"}
    except Exception as e:
        print(f"Google Form Automation Error: {e}")
        return {"success": False, "error": str(e)}

def automate_embedded_job_form(page, candidate_name="Roger Tonacao", email="rodge.tonacao@gmail.com", phone="09171234567", resume_path=None, linkedin_url="https://www.linkedin.com/in/rogertonacao"):
    """Detect and auto-fill embedded job application forms on company career portals like Micro1, Greenhouse, Lever, etc."""
    try:
        inputs = page.query_selector_all("input[type='text'], input[type='email'], input[type='tel'], input[type='url'], input:not([type])")
        for inp in inputs:
            try:
                aria = (inp.get_attribute("aria-label") or "").lower()
                placeholder = (inp.get_attribute("placeholder") or "").lower()
                name_attr = (inp.get_attribute("name") or "").lower()
                inp_id = (inp.get_attribute("id") or "").lower()
                
                parent_text = ""
                try:
                    parent_text = inp.evaluate("el => el.closest('div, label, form').innerText").lower()
                except Exception:
                    pass

                combined = f"{aria} {placeholder} {name_attr} {inp_id} {parent_text}"

                if "email" in combined:
                    inp.fill(email)
                elif "first" in combined:
                    inp.fill(candidate_name.split()[0])
                elif "last" in combined:
                    inp.fill(candidate_name.split()[-1] if len(candidate_name.split()) > 1 else candidate_name)
                elif "name" in combined and "company" not in combined:
                    inp.fill(candidate_name)
                elif any(k in combined for k in ["phone", "contact", "mobile", "tel"]):
                    inp.fill(phone)
                elif any(k in combined for k in ["linkedin", "linkedin.com"]):
                    inp.fill(linkedin_url)
                elif any(k in combined for k in ["website", "portfolio", "site"]):
                    inp.fill("https://www.rogertonacao.com")
            except Exception:
                pass

        if resume_path and os.path.exists(resume_path):
            file_inputs = page.query_selector_all("input[type='file']")
            for fi in file_inputs:
                try:
                    fi.set_input_files(resume_path)
                except Exception:
                    pass

        next_btn = page.query_selector("button:has-text('Next'), button:has-text('Submit'), button:has-text('Apply'), input[type='submit']")
        if next_btn:
            next_btn.click(timeout=2000)
            page.wait_for_timeout(3000)
            return True
    except Exception as e:
        print(f"Form Auto-Fill Notice: {e}")
    return False

def fetch_urls_from_google_sheet(sheet_input):
    """Fetch target URLs from a public Google Sheet or Google Sheet CSV export link."""
    sheet_id = sheet_input
    if "spreadsheets/d/" in sheet_input:
        match = re.search(r'spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_input)
        if match:
            sheet_id = match.group(1)
            
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv" if not sheet_input.startswith("http") and not sheet_input.endswith("csv") else sheet_input
    if "export?format=csv" not in csv_url and "spreadsheets/d/" in csv_url:
        csv_url = re.sub(r'/edit.*$', '/export?format=csv', csv_url)

    print(f"Fetching target links from Google Sheet: {csv_url}...")
    content = fetch_url_content(csv_url)
    urls = []
    if content:
        lines = content.splitlines()
        for line in lines:
            found = re.findall(r'https?://[^\s,"\'<>]+', line)
            for u in found:
                u_clean = u.strip().rstrip('.,;:!?)')
                if u_clean not in urls and "google.com/spreadsheets" not in u_clean:
                    urls.append(u_clean)
    print(f"Discovered {len(urls)} target URL(s) from Google Sheet.")
    return urls

def scrape_remote_job_boards(keywords="Web Developer"):
    """Scrape fresh, recent remote job postings from WeWorkRemotely, RemoteOK, and OnlineJobs.ph."""
    postings = []
    clean_kw = keywords.split(",")[0].strip()
    encoded_kw = urllib.parse.quote(clean_kw)

    # 1. We Work Remotely
    wwr_url = f"https://weworkremotely.com/remote-jobs/search?term={encoded_kw}"
    print(f"Scanning WeWorkRemotely for fresh postings ({wwr_url})...")
    wwr_html = fetch_url_content(wwr_url)
    if wwr_html:
        items = re.findall(r'<li class="feature[^"]*">(.*?)</li>', wwr_html, re.DOTALL)
        for item in items[:6]:
            title_match = re.search(r'<span class="title"[^>]*>(.*?)</span>', item)
            link_match = re.search(r'href="(/remote-jobs/[^"]+)"', item)
            company_match = re.search(r'<span class="company"[^>]*>(.*?)</span>', item)
            if title_match and link_match:
                t = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
                comp = re.sub(r'<[^>]+>', '', company_match.group(1)).strip() if company_match else ""
                full_link = f"https://weworkremotely.com{link_match.group(1)}"
                
                # Fetch detailed job page to extract HR email or form
                detail_html = fetch_url_content(full_link)
                emails = extract_emails_from_text(detail_html) if detail_html else []
                forms = extract_google_form_urls(detail_html) if detail_html else []
                
                postings.append({
                    "title": f"WeWorkRemotely: {t} ({comp})",
                    "link": full_link,
                    "snippet": clean_html_text(detail_html)[:400] if detail_html else t,
                    "emails": emails,
                    "forms": forms
                })

    # 2. OnlineJobs.ph
    oj_url = f"https://www.onlinejobs.ph/jobseekers/jobsearch?jobkeyword={encoded_kw}"
    print(f"Scanning OnlineJobs.ph for latest hiring posts ({oj_url})...")
    oj_html = fetch_url_content(oj_url)
    if oj_html:
        cards = re.findall(r'<div class="jobpost-cat-box[^"]*">(.*?)</div>\s*</div>', oj_html, re.DOTALL)
        for card in cards[:6]:
            t_match = re.search(r'<h4[^>]*>(.*?)</h4>', card, re.DOTALL)
            link_match = re.search(r'href="(/jobseekers/job/[^"]+)"', card)
            if t_match and link_match:
                t = re.sub(r'<[^>]+>', '', t_match.group(1)).strip()
                full_link = f"https://www.onlinejobs.ph{link_match.group(1)}"
                detail_html = fetch_url_content(full_link)
                emails = extract_emails_from_text(detail_html) if detail_html else []
                forms = extract_google_form_urls(detail_html) if detail_html else []
                
                postings.append({
                    "title": f"OnlineJobs.ph: {t}",
                    "link": full_link,
                    "snippet": clean_html_text(detail_html)[:400] if detail_html else t,
                    "emails": emails,
                    "forms": forms
                })

    return postings

def search_yahoo_jobs(query):
    """Search Yahoo for public job postings and contact details."""
    encoded_query = urllib.parse.quote(query)
    url = f"https://search.yahoo.com/search?p={encoded_query}"
    html = fetch_url_content(url)
    
    postings = []
    if not html:
        return postings

    blocks = re.findall(r'<div class="compTitle[^"]*">(.*?)</div>', html, re.DOTALL)
    for block in blocks:
        title_match = re.search(r'<a[^>]*>(.*?)</a>', block, re.DOTALL)
        url_match = re.search(r'href="([^"]+)"', block)
        if title_match and url_match:
            clean_title = re.sub(r'<[^>]+>', '', title_match.group(1)).strip()
            link = url_match.group(1)
            if "RU=" in link:
                ru_match = re.search(r'RU=([^/]+)', link)
                if ru_match:
                    link = urllib.parse.unquote(ru_match.group(1))
            postings.append({"title": clean_title, "link": link, "snippet": clean_title})
            
    return postings

def extract_emails_from_text(text):
    """Extract valid email addresses from HTML or post snippet text."""
    pattern = r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,4}'
    found = re.findall(pattern, text)
    valid_emails = []
    ignored_exts = ['.png', '.jpg', '.jpeg', '.gif', '.svg', '.webp', '.css', '.js', '.dts', '.woff', '.ttf']
    for e in found:
        e_clean = e.strip().lower()
        if not any(e_clean.endswith(ext) for ext in ignored_exts) and "example.com" not in e_clean:
            valid_emails.append(e_clean)
    return list(set(valid_emails))

def clean_html_text(html):
    """Remove script, style, and tag elements from raw HTML."""
    text = re.sub(r'<script[^>]*>.*?</script>', ' ', html, flags=re.DOTALL)
    text = re.sub(r'<style[^>]*>.*?</style>', ' ', text, flags=re.DOTALL)
    text = re.sub(r'<[^>]+>', ' ', text)
    text = re.sub(r'\s+', ' ', text).strip()
    return text

def calculate_match_score(job_text, qualifications):
    """Compute fit percentage (0-100%) based on candidate qualifications keywords."""
    if not qualifications:
        return 100
    
    qual_words = [q.strip().lower() for q in qualifications.replace(',', ' ').split() if len(q.strip()) > 2]
    if not qual_words:
        return 100

    job_text_lower = job_text.lower()
    matches = sum(1 for word in qual_words if word in job_text_lower)
    score = min(100, int((matches / len(qual_words)) * 100))
    # Give a base score if general job terms exist
    if score == 0 and any(w in job_text_lower for w in ["hiring", "job", "vacancy", "career", "apply"]):
        score = 50
    return score

def select_specialized_resume(job_title, job_text="", candidate_resume_arg=None):
    """Select specialized resume file (developer, VA, customer service) matching the job role."""
    if candidate_resume_arg and os.path.exists(candidate_resume_arg):
        return candidate_resume_arg

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    search_dirs = [
        os.path.abspath(os.path.join(script_dir, "..", "assets")),
        os.path.join(project_root, "public", "assets"),
        os.path.join(os.getcwd(), "public", "assets"),
        project_root,
        os.getcwd()
    ]

    combined = f"{job_title} {job_text}".lower()
    
    target_filename = "resume.pdf"
    if any(k in combined for k in ["developer", "web", "frontend", "backend", "react", "svelte", "typescript", "software", "code"]):
        target_filename = "resume_developer.pdf"
    elif any(k in combined for k in ["virtual assistant", "va", "admin", "executive assistant", "data entry"]):
        target_filename = "resume_va.pdf"
    elif any(k in combined for k in ["customer service", "support", "email support", "helpdesk", "chat"]):
        target_filename = "resume_customer_service.pdf"

    # Search for specialized resume in asset directories
    for d in search_dirs:
        candidate_path = os.path.join(d, target_filename)
        if os.path.exists(candidate_path):
            print(f"Specialized Resume Selected: {target_filename} for role '{job_title}'")
            return candidate_path

    # Fallback to standard resume.pdf
    for d in search_dirs:
        fallback_path = os.path.join(d, "resume.pdf")
        if os.path.exists(fallback_path):
            return fallback_path

    return os.path.join(search_dirs[0], "resume.pdf")

def send_resume_email(to_email, job_title, candidate_name, resume_path, cover_letter, smtp_user, smtp_pass):
    """Send an application email with resume attachment via Gmail SMTP."""
    if not smtp_user or not smtp_pass:
        return {"success": False, "error": "SMTP credentials (EMAIL_USER / EMAIL_PASS) missing."}

    msg = MIMEMultipart()
    msg['From'] = f"{candidate_name} <{smtp_user}>"
    msg['To'] = to_email
    msg['Subject'] = f"Job Application: {job_title} - {candidate_name}"

    body = cover_letter or (
        f"Dear Hiring Manager,\n\n"
        f"I am writing to express my strong interest in the {job_title} position. "
        f"Attached is my resume/CV for your review. I look forward to discussing how my experience "
        f"and skills can contribute to your team.\n\n"
        f"Best regards,\n"
        f"{candidate_name}\n"
        f"Contact Email: {smtp_user}\n"
    )
    msg.attach(MIMEText(body, 'plain'))

    # Attach resume if file exists
    if resume_path and os.path.exists(resume_path):
        try:
            ctype, encoding = mimetypes.guess_type(resume_path)
            if ctype is None or encoding is not None:
                ctype = 'application/octet-stream'
            maintype, subtype = ctype.split('/', 1)

            with open(resume_path, 'rb') as fp:
                msg_box = MIMEBase(maintype, subtype)
                msg_box.set_payload(fp.read())
                encoders.encode_base64(msg_box)
                filename = os.path.basename(resume_path)
                msg_box.add_header('Content-Disposition', 'attachment', filename=filename)
                msg.attach(msg_box)
        except Exception as e:
            return {"success": False, "error": f"Failed to attach resume file: {e}"}
    else:
        print(f"Notice: Resume file not found at {resume_path}. Sending email without attachment.")

    # Dispatch via Gmail SMTP
    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return {"success": True}
    except Exception as e:
        # Fallback to port 587 STARTTLS
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            return {"success": True}
        except Exception as e2:
            return {"success": False, "error": str(e2)}

def generate_dynamic_cover_letter(candidate_name, job_title, qualifications, company_url=""):
    """Generate a professional, tailored cover letter dynamically based on job details."""
    qual_list = [q.strip() for q in qualifications.replace(',', ' ').split() if len(q.strip()) > 2]
    skills_highlight = ", ".join(qual_list[:4]) if qual_list else "software development, administration, and communication"

    return (
        f"Dear Hiring Team,\n\n"
        f"I am writing to formally express my enthusiasm and apply for the position of {job_title}.\n\n"
        f"With a solid background in {skills_highlight}, I am confident in my ability to deliver immediate value "
        f"and contribute effectively to your organization's goals. I pride myself on strong work ethics, adaptability, "
        f"and problem-solving skills.\n\n"
        f"You can review my portfolio, featured projects, and professional background on my personal website: https://www.rogertonacao.com\n\n"
        f"Attached to this email, please find my updated Resume / CV for your detailed consideration. "
        f"I would welcome the opportunity to discuss how my qualifications align with your hiring needs.\n\n"
        f"Thank you for your time and consideration. I look forward to hearing from you.\n\n"
        f"Sincerely,\n"
        f"{candidate_name}\n"
        f"Website: https://www.rogertonacao.com\n"
        f"Email: hello@rogertonacao.com | rodge.tonacao@gmail.com\n"
    )

def main():
    parser = argparse.ArgumentParser(description="Job Applicant Post Automation Script")
    parser.add_argument("--url", type=str, help="Target URL (Website, Facebook Page/Group, or listing page)")
    parser.add_argument("--keywords", type=str, default="Virtual Assistant, Developer, Customer Service, Staff", help="Job titles or keywords to look for")
    parser.add_argument("--qualifications", type=str, default="communication, management, developer, software, support", help="Candidate skills/qualifications for matching")
    parser.add_argument("--candidate-name", type=str, default="Roger Tonacao", help="Candidate full name")
    parser.add_argument("--cover-letter", type=str, help="Custom cover letter text or file path")
    parser.add_argument("--resume", type=str, help="Path to PDF/DOCX resume file")
    parser.add_argument("--playwright", action="store_true", help="Use Playwright CDP connection to read from your open logged-in browser window")
    parser.add_argument("--cdp-url", type=str, default="http://localhost:9222", help="Chrome CDP Remote Debugging URL")
    parser.add_argument("--max-scrolls", type=int, default=10, help="Maximum number of feed scroll passes for Playwright (default: 10)")
    parser.add_argument("--max-posts", type=int, default=20, help="Maximum number of job postings to evaluate before stopping (default: 20)")
    parser.add_argument("--form-url", type=str, help="Google Form URL to automate filling out")
    parser.add_argument("--sheets-url", type=str, help="Google Sheet URL or ID containing target links/groups to scan and apply")
    parser.add_argument("--linkedin", action="store_true", help="Scrape LinkedIn jobs via Playwright")
    parser.add_argument("--to-email", type=str, help="Direct employer/recruiter email address to send application to")
    parser.add_argument("--role", type=str, default="Web Developer / Virtual Assistant", help="Job role title for application")
    parser.add_argument("--auto-send", action="store_true", default=True, help="Automatically send email applications when matching jobs are found")
    parser.add_argument("--dry-run", action="store_true", help="Preview matches and emails without actually sending emails")
    args = parser.parse_args()

    load_env_file()
    smtp_user = os.environ.get("EMAIL_USER", "rodge.tonacao@gmail.com")
    smtp_pass = os.environ.get("EMAIL_PASS", "wzyl frvy suny rxcj")

    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    default_resume_dir = os.path.abspath(os.path.join(script_dir, "..", "assets"))
    os.makedirs(default_resume_dir, exist_ok=True)

    possible_resumes = [
        args.resume,
        os.path.join(default_resume_dir, "resume.pdf"),
        os.path.join(project_root, "public", "assets", "resume.pdf"),
        os.path.join(os.getcwd(), "public", "assets", "resume.pdf"),
        os.path.join(project_root, "assets", "resume.pdf"),
        os.path.join(os.getcwd(), "resume.pdf")
    ]
    resume_path = None
    for p in possible_resumes:
        if p and os.path.exists(p):
            resume_path = p
            break
    if not resume_path:
        resume_path = os.path.join(default_resume_dir, "resume.pdf")

    if args.to_email:
        print(f"Direct Application Mode: Sending resume & cover letter to {args.to_email} for role '{args.role}'...")
        active_resume = select_specialized_resume(args.role, args.qualifications, args.resume)
        cover_text = generate_dynamic_cover_letter(args.candidate_name, args.role, args.qualifications)
        send_res = send_resume_email(
            to_email=args.to_email,
            job_title=args.role,
            candidate_name=args.candidate_name,
            resume_path=active_resume,
            cover_letter=cover_text,
            smtp_user=smtp_user,
            smtp_pass=smtp_pass
        )
        print(f"Direct Application Result to {args.to_email}: {send_res}")
        return

    if args.form_url:
        print(f"Automating Google Form submission: {args.form_url}")
        cover_text = generate_dynamic_cover_letter(args.candidate_name, "Web Developer / Virtual Assistant", args.qualifications)
        form_res = fill_google_form_via_playwright(
            form_url=args.form_url,
            candidate_name=args.candidate_name,
            email=smtp_user,
            phone="09171234567",
            resume_path=resume_path,
            cover_letter=cover_text,
            submit=not args.dry_run
        )
        print(json.dumps(form_res, indent=2))
        return
    
    possible_resumes = [
        args.resume,
        os.path.join(default_resume_dir, "resume.pdf"),
        os.path.join(project_root, "public", "assets", "resume.pdf"),
        os.path.join(os.getcwd(), "public", "assets", "resume.pdf"),
        os.path.join(project_root, "assets", "resume.pdf"),
        os.path.join(os.getcwd(), "resume.pdf")
    ]
    resume_path = None
    for p in possible_resumes:
        if p and os.path.exists(p):
            resume_path = p
            break
    if not resume_path:
        resume_path = os.path.join(default_resume_dir, "resume.pdf")

    # Scrape & discover job postings
    found_postings = []
    target_urls = []
    if args.sheets_url:
        target_urls = fetch_urls_from_google_sheet(args.sheets_url)
    elif args.url:
        target_urls = [args.url]

    if getattr(args, 'login_linkedin', False):
        print("Launching interactive Playwright browser for LinkedIn login...")
        profile_dir = os.path.join(script_dir, "..", "browser_profile")
        os.makedirs(profile_dir, exist_ok=True)
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            try:
                context = p.chromium.launch_persistent_context(user_data_dir=profile_dir, headless=False, channel="chrome", args=["--start-maximized"])
            except Exception:
                context = p.chromium.launch_persistent_context(user_data_dir=profile_dir, headless=False, args=["--start-maximized"])
            page = context.pages[0] if context.pages else context.new_page()
            page.goto("https://www.linkedin.com/login", timeout=30000)
            print("Please log into your LinkedIn account in the opened Chrome window. Waiting 45 seconds to save session...")
            page.wait_for_timeout(45000)
            print("LinkedIn session saved successfully!")
            return

    if args.linkedin:
        print(f"Scraping LinkedIn Jobs for keywords: {args.keywords}...")
        li_results = scrape_linkedin_jobs_via_playwright(keywords=args.keywords.split(",")[0].strip())
        for li_item in li_results:
            score = calculate_match_score(li_item["snippet"], args.qualifications)
            li_item["score"] = score
            found_postings.append(li_item)

    if args.playwright:
        urls_to_scan = target_urls or ["https://www.facebook.com/groups/4478714448882966/"]
        for target_u in urls_to_scan:
            print(f"Using Playwright to scan: {target_u} (Max Scrolls: {args.max_scrolls})...")
            pw_res = scrape_facebook_group_via_playwright(
                cdp_url=args.cdp_url,
                target_url=target_u,
                max_scrolls=args.max_scrolls
            )
            if pw_res:
                score = calculate_match_score(pw_res["text"], args.qualifications)
                found_postings.append({
                    "title": f"Page/Group Post ({target_u})",
                    "url": target_u,
                    "snippet": pw_res["text"][:400],
                    "emails": pw_res["emails"],
                    "form_urls": pw_res.get("form_urls", []),
                    "score": score
                })
    
    if args.url and not (args.playwright and "facebook.com" in args.url):
        print(f"Scanning target URL: {args.url}")
        html = fetch_url_content(args.url)
        if html:
            clean_text = clean_html_text(html)
            emails = extract_emails_from_text(html)
            forms = extract_google_form_urls(html)
            score = calculate_match_score(clean_text, args.qualifications)
            title = args.keywords.split(",")[0] + " Position"
            found_postings.append({
                "title": title,
                "url": args.url,
                "snippet": clean_text[:300],
                "emails": emails,
                "form_urls": forms,
                "score": score
            })

    # Always scan dedicated public remote job boards (WeWorkRemotely, OnlineJobs.ph)
    remote_boards_res = scrape_remote_job_boards(args.keywords)
    for board_item in remote_boards_res:
        score = calculate_match_score(board_item["snippet"], args.qualifications)
        found_postings.append({
            "title": board_item["title"],
            "url": board_item["link"],
            "snippet": board_item["snippet"],
            "emails": board_item.get("emails", []),
            "form_urls": board_item.get("forms", []),
            "score": score
        })
    search_query = f"{args.keywords} hiring contact email apply"
    search_results = search_yahoo_jobs(search_query)

    for item in search_results:
        link_html = fetch_url_content(item["link"]) if item["link"].startswith("http") else ""
        text = clean_html_text(link_html) if link_html else item["snippet"]
        emails = extract_emails_from_text(link_html) if link_html else extract_emails_from_text(item["snippet"])
        forms = extract_google_form_urls(link_html) if link_html else extract_google_form_urls(item["snippet"])
        score = calculate_match_score(text, args.qualifications)
        
        found_postings.append({
            "title": item["title"],
            "url": item["link"],
            "snippet": text[:300],
            "emails": emails,
            "form_urls": forms,
            "score": score
        })

    # Process applications
    application_results = []
    processed_emails = set()
    processed_forms = set()

    for post in found_postings:
        if post["score"] < 30:
            continue
        
        # 1. Process Google Forms if detected in job-related post
        for form_link in post.get("form_urls", []):
            if form_link in processed_forms:
                continue
            processed_forms.add(form_link)
            
            active_resume = select_specialized_resume(post["title"], post.get("snippet", ""), args.resume)
            print(f"Discovered Job-Related Google Form (Match Fit: {post['score']}%): {form_link}")
            status = "PENDING"
            error_msg = None

            if args.dry_run:
                status = "DRY_RUN_SKIPPED"
            elif args.auto_send:
                cover_text = generate_dynamic_cover_letter(args.candidate_name, post["title"], args.qualifications, company_url=form_link)
                form_res = fill_google_form_via_playwright(
                    form_url=form_link,
                    candidate_name=args.candidate_name,
                    email=smtp_user,
                    phone="09171234567",
                    resume_path=active_resume,
                    cover_letter=cover_text,
                    submit=True
                )
                if form_res.get("success"):
                    status = "FORM_SUBMITTED"
                else:
                    status = "FORM_FAILED"
                    error_msg = form_res.get("error")

            application_results.append({
                "job_title": f"Google Form: {post['title']}",
                "company_url": form_link,
                "target_email": "Google Form Application",
                "match_score": post["score"],
                "status": status,
                "error": error_msg,
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

    for post in found_postings:
        if post["score"] < 30:
            continue
        
        target_emails = post["emails"]
        if not target_emails:
            continue

        for email_addr in target_emails:
            if email_addr in processed_emails:
                continue
            processed_emails.add(email_addr)

            active_resume = select_specialized_resume(post["title"], post.get("snippet", ""), args.resume)
            status = "PENDING"
            error_msg = None

            if args.cover_letter and os.path.exists(args.cover_letter):
                try:
                    with open(args.cover_letter, "r", encoding="utf-8") as f:
                        cover_letter_text = f.read()
                except Exception:
                    cover_letter_text = args.cover_letter
            elif args.cover_letter:
                cover_letter_text = args.cover_letter
            else:
                cover_letter_text = generate_dynamic_cover_letter(
                    candidate_name=args.candidate_name,
                    job_title=post["title"],
                    qualifications=args.qualifications,
                    company_url=post["url"]
                )

            if args.dry_run:
                status = "DRY_RUN_SKIPPED"
            elif args.auto_send:
                send_res = send_resume_email(
                    to_email=email_addr,
                    job_title=post["title"],
                    candidate_name=args.candidate_name,
                    resume_path=active_resume,
                    cover_letter=cover_letter_text,
                    smtp_user=smtp_user,
                    smtp_pass=smtp_pass
                )
                if send_res.get("success"):
                    status = "SENT"
                else:
                    status = "FAILED"
                    error_msg = send_res.get("error")

            application_results.append({
                "job_title": post["title"],
                "company_url": post["url"],
                "target_email": email_addr,
                "match_score": post["score"],
                "status": status,
                "error": error_msg,
                "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            })

    # Export CSV log
    downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    csv_path = os.path.join(downloads_dir, "job_applications_log.csv")

    headers = ["Job Title", "Target Email", "Match Score (%)", "Status", "Company URL", "Error", "Timestamp"]
    try:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for res in application_results:
                writer.writerow([
                    res["job_title"],
                    res["target_email"],
                    f"{res['match_score']}%",
                    res["status"],
                    res["company_url"],
                    res["error"] or "None",
                    res["timestamp"]
                ])
    except PermissionError:
        csv_path = os.path.join(downloads_dir, f"job_applications_log_{int(datetime.datetime.now().timestamp())}.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(headers)
            for res in application_results:
                writer.writerow([
                    res["job_title"],
                    res["target_email"],
                    f"{res['match_score']}%",
                    res["status"],
                    res["company_url"],
                    res["error"] or "None",
                    res["timestamp"]
                ])

    output = {
        "csv_path": csv_path,
        "total_scraped": len(found_postings),
        "applications_processed": len(application_results),
        "results": application_results
    }
    print(json.dumps(output, indent=2))

if __name__ == "__main__":
    main()
