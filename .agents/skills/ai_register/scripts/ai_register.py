import os
import sys
import re
import csv
import time
import urllib.parse
import urllib.request
import argparse
import datetime
import imaplib
import email
from email.header import decode_header

def load_env_file():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    env_paths = [
        os.path.join(project_root, "server", ".env"),
        os.path.join(project_root, ".env"),
        os.path.join(os.getcwd(), "server", ".env"),
        os.path.join(os.getcwd(), ".env")
    ]
    for path in env_paths:
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
    headers = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    }
    req = urllib.request.Request(url, headers=headers)
    try:
        with urllib.request.urlopen(req, timeout=6) as response:
            return response.read().decode("utf-8", errors="ignore")
    except Exception:
        return ""

def fetch_urls_from_google_sheet(sheet_input):
    sheet_id = sheet_input
    if "spreadsheets/d/" in sheet_input:
        match = re.search(r'spreadsheets/d/([a-zA-Z0-9-_]+)', sheet_input)
        if match:
            sheet_id = match.group(1)
            
    csv_url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv" if not sheet_input.startswith("http") and not sheet_input.endswith("csv") else sheet_input
    if "export?format=csv" not in csv_url and "spreadsheets/d/" in csv_url:
        csv_url = re.sub(r'/edit.*$', '/export?format=csv', csv_url)

    print(f"Fetching registration URLs from Google Sheet: {csv_url}...")
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
    print(f"Discovered {len(urls)} target registration URL(s) in Google Sheet.")
    return urls

def fetch_confirmation_link_from_gmail(user_email, user_pass, target_domain, max_wait_sec=30):
    """Connect to Gmail via IMAP and search for confirmation/verification links or OTP codes."""
    print(f"Checking Gmail IMAP for confirmation email from '{target_domain}'...")
    start_time = time.time()
    while time.time() - start_time < max_wait_sec:
        try:
            mail = imaplib.IMAP4_SSL("imap.gmail.com")
            mail.login(user_email, user_pass)
            mail.select("inbox")
            
            status, messages = mail.search(None, "UNSEEN")
            if status == "OK" and messages[0]:
                email_ids = messages[0].split()
                for e_id in reversed(email_ids[-5:]):
                    res, msg_data = mail.fetch(e_id, "(RFC822)")
                    for response_part in msg_data:
                        if isinstance(response_part, tuple):
                            msg = email.message_from_bytes(response_part[1])
                            subject, encoding = decode_header(msg["Subject"])[0] if msg["Subject"] else ("No Subject", "utf-8")
                            if isinstance(subject, bytes):
                                subject = subject.decode(encoding or "utf-8", errors="ignore")
                            
                            body = ""
                            if msg.is_multipart():
                                for part in msg.walk():
                                    ctype = part.get_content_type()
                                    cdisp = str(part.get('Content-Disposition'))
                                    if ctype in ['text/plain', 'text/html'] and 'attachment' not in cdisp:
                                        body += part.get_payload(decode=True).decode(errors='ignore')
                            else:
                                body = msg.get_payload(decode=True).decode(errors='ignore')

                            if target_domain.lower() in body.lower() or any(k in body.lower() for k in ["confirm", "verify", "activate", "registration"]):
                                links = re.findall(r'https?://[^\s,"\'<>]+(?:confirm|verify|activate|token)[^\s,"\'<>]*', body, re.IGNORECASE)
                                if links:
                                    print(f"Extracted Confirmation Link: {links[0]}")
                                    mail.logout()
                                    return {"type": "link", "value": links[0]}
                                
                                otps = re.findall(r'\b\d{6}\b', body)
                                if otps:
                                    print(f"Extracted OTP Code: {otps[0]}")
                                    mail.logout()
                                    return {"type": "otp", "value": otps[0]}
            mail.logout()
        except Exception as e:
            print(f"IMAP Notice: {e}")
        time.sleep(4)
    return None

def register_account_via_playwright(url, full_name, email, username, password, phone, imap_user, imap_pass):
    """Automate account registration on a target URL using Playwright."""
    try:
        from playwright.sync_api import sync_playwright
        with sync_playwright() as p:
            print(f"Playwright: Navigating to registration page: {url}...")
            browser = p.chromium.launch(headless=False)
            context = browser.new_context()
            page = context.new_page()
            page.goto(url, timeout=30000)
            page.wait_for_timeout(3000)
            
            # Dismiss cookies/popups
            try:
                btn = page.query_selector("button:has-text('Accept'), button:has-text('Agree')")
                if btn:
                    btn.click(timeout=1000)
            except Exception:
                pass

            # Fill Form Inputs
            inputs = page.query_selector_all("input[type='text'], input[type='email'], input[type='password'], input[type='tel'], input:not([type])")
            for inp in inputs:
                try:
                    aria = (inp.get_attribute("aria-label") or "").lower()
                    placeholder = (inp.get_attribute("placeholder") or "").lower()
                    name_attr = (inp.get_attribute("name") or "").lower()
                    inp_type = (inp.get_attribute("type") or "").lower()
                    
                    combined = f"{aria} {placeholder} {name_attr}"
                    
                    if inp_type == "password" or "password" in combined or "pass" in combined:
                        inp.fill(password)
                    elif inp_type == "email" or "email" in combined or "mail" in combined:
                        inp.fill(email)
                    elif "username" in combined or "user" in combined or "handle" in combined:
                        inp.fill(username)
                    elif "first" in combined:
                        inp.fill(full_name.split()[0])
                    elif "last" in combined:
                        inp.fill(full_name.split()[-1] if len(full_name.split()) > 1 else full_name)
                    elif "name" in combined:
                        inp.fill(full_name)
                    elif any(k in combined for k in ["phone", "mobile", "contact", "tel"]):
                        inp.fill(phone)
                except Exception:
                    pass

            # Check Terms & Conditions checkboxes
            checkboxes = page.query_selector_all("input[type='checkbox']")
            for cb in checkboxes:
                try:
                    cb.check(timeout=500)
                except Exception:
                    pass

            # Click Submit / Register button
            submit_btn = page.query_selector("button[type='submit'], input[type='submit'], button:has-text('Register'), button:has-text('Sign Up'), button:has-text('Create Account')")
            if submit_btn:
                submit_btn.click(timeout=1500)
                page.wait_for_timeout(3000)

            domain = urllib.parse.urlparse(url).netloc
            confirm_res = fetch_confirmation_link_from_gmail(imap_user, imap_pass, domain, max_wait_sec=25)
            
            if confirm_res:
                if confirm_res["type"] == "link":
                    print(f"Opening Email Confirmation Link: {confirm_res['value']}")
                    page.goto(confirm_res["value"], timeout=30000)
                    page.wait_for_timeout(3000)
                elif confirm_res["type"] == "otp":
                    otp_input = page.query_selector("input[id*='otp'], input[name*='code'], input[aria-label*='code']")
                    if otp_input:
                        otp_input.fill(confirm_res["value"])
                        page.keyboard.press("Enter")
                        page.wait_for_timeout(2000)
                
                browser.close()
                return {"success": True, "message": "Registration & Email Confirmation Completed!"}

            browser.close()
            return {"success": True, "message": "Registration form submitted! (Awaiting confirmation link)"}
    except Exception as e:
        print(f"Registration Error on {url}: {e}")
        return {"success": False, "error": str(e)}

def main():
    parser = argparse.ArgumentParser(description="AI Register - Automated Account Signup & Email Confirmation Skill")
    parser.add_argument("--url", type=str, help="Target Registration URL")
    parser.add_argument("--sheets-url", type=str, help="Google Sheet URL containing target registration links")
    parser.add_argument("--name", type=str, default="Roger Tonacao", help="Full Name")
    parser.add_argument("--email", type=str, help="Registration Email")
    parser.add_argument("--username", type=str, default="rogertonacao", help="Default Username")
    parser.add_argument("--password", type=str, default="RodgeTonacao2026!", help="Default Password")
    parser.add_argument("--phone", type=str, default="09171234567", help="Contact Phone Number")
    args = parser.parse_args()

    load_env_file()
    imap_user = os.environ.get("EMAIL_USER", "rodge.tonacao@gmail.com")
    imap_pass = os.environ.get("EMAIL_PASS", "wzyl frvy suny rxcj")
    user_email = args.email or imap_user

    urls = []
    if args.sheets_url:
        urls = fetch_urls_from_google_sheet(args.sheets_url)
    elif args.url:
        urls = [args.url]
    else:
        print("Please provide a target registration URL using --url or --sheets-url.")
        sys.exit(1)

    results = []
    for u in urls:
        res = register_account_via_playwright(
            url=u,
            full_name=args.name,
            email=user_email,
            username=args.username,
            password=args.password,
            phone=args.phone,
            imap_user=imap_user,
            imap_pass=imap_pass
        )
        results.append({
            "url": u,
            "username": args.username,
            "email": user_email,
            "password": args.password,
            "status": "CONFIRMED" if res.get("success") else "FAILED",
            "message": res.get("message") or res.get("error"),
            "timestamp": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        })

    # Log to CSV
    downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    os.makedirs(downloads_dir, exist_ok=True)
    csv_path = os.path.join(downloads_dir, "ai_register_log.csv")
    headers = ["Registration URL", "Username", "Email", "Password", "Status", "Message", "Timestamp"]
    try:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            for r in results:
                w.writerow([r["url"], r["username"], r["email"], r["password"], r["status"], r.get("message"), r["timestamp"]])
    except PermissionError:
        csv_path = os.path.join(downloads_dir, f"ai_register_log_{int(time.time())}.csv")
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(headers)
            for r in results:
                w.writerow([r["url"], r["username"], r["email"], r["password"], r["status"], r.get("message"), r["timestamp"]])

    print(f"AI Register Completed! Log saved to: {csv_path}")

if __name__ == "__main__":
    main()
