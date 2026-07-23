import os
import csv
import json
import smtplib
import urllib.request
import urllib.parse
import argparse
import time
import re
from email.message import EmailMessage

def load_env_file():
    """Load environment variables from server/.env or root .env files."""
    env_paths = [
        os.path.join(os.getcwd(), "server", ".env"),
        os.path.join(os.getcwd(), ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", "server", ".env"),
        os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "..", ".env"),
    ]
    
    for path in env_paths:
        if os.path.exists(path):
            with open(path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith("#"):
                        if "=" in line:
                            key, val = line.split("=", 1)
                            key = key.strip()
                            val = val.strip().strip("'").strip('"')
                            if key not in os.environ:
                                os.environ[key] = val

def fetch_google_sheet_csv(url):
    """Convert Google Sheet URL to CSV export URL and download it."""
    # Convert standard viewing URL to export CSV URL
    if "/edit" in url:
        # Extract gid if present
        gid_match = re.search(r'gid=(\d+)', url)
        gid = gid_match.group(1) if gid_match else "0"
        
        # Replace /edit... with /export
        base_url = re.sub(r'/edit.*$', '', url)
        export_url = f"{base_url}/export?format=csv&gid={gid}"
    else:
        export_url = url
        
    print(f"Fetching data from: {export_url}")
    
    headers = {'User-Agent': 'Mozilla/5.0'}
    req = urllib.request.Request(export_url, headers=headers)
    
    try:
        with urllib.request.urlopen(req, timeout=15) as response:
            csv_data = response.read().decode('utf-8')
            return csv_data
    except Exception as e:
        print(f"Error fetching Google Sheet: {e}")
        return None

def send_email(smtp_user, smtp_pass, to_email, subject, body_text, resend_api_key=None, from_email=None):
    """Send an email using Resend API or fallback to Gmail SMTP."""
    
    if not from_email:
        from_email = smtp_user
        
    if resend_api_key:
        # Use Resend API
        url = "https://api.resend.com/emails"
        headers = {
            "Authorization": f"Bearer {resend_api_key}",
            "Content-Type": "application/json",
            "User-Agent": "Mozilla/5.0"
        }
        data = {
            "from": from_email,
            "to": [to_email],
            "subject": subject,
            "text": body_text
        }
        
        req = urllib.request.Request(url, data=json.dumps(data).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req, timeout=15) as response:
                response_body = response.read().decode('utf-8')
                return True, ""
        except Exception as e:
            err_msg = str(e)
            if hasattr(e, 'read'):
                err_msg += f" - {e.read().decode('utf-8')}"
            return False, err_msg

    # Fallback to standard SMTP
    msg = EmailMessage()
    msg['Subject'] = subject
    msg['From'] = from_email
    msg['To'] = to_email
    msg.set_content(body_text)

    try:
        server = smtplib.SMTP_SSL("smtp.gmail.com", 465, timeout=15)
        server.login(smtp_user, smtp_pass)
        server.send_message(msg)
        server.quit()
        return True, ""
    except Exception as e:
        # Fallback to TLS
        try:
            server = smtplib.SMTP("smtp.gmail.com", 587, timeout=15)
            server.starttls()
            server.login(smtp_user, smtp_pass)
            server.send_message(msg)
            server.quit()
            return True, ""
        except Exception as e2:
            return False, str(e2)

def main():
    parser = argparse.ArgumentParser(description="Hotel Sales AI - Pitch Sender")
    parser.add_argument("--sheet-url", help="Google Sheet URL to read targets from")
    parser.add_argument("--email", help="Direct email address to send to (for testing)")
    parser.add_argument("--company", default="Hotel Owner", help="Company name for direct email testing")
    parser.add_argument("--contact", default="", help="Contact person for direct email testing")
    parser.add_argument("--subject", default="Upgrading your hotel's online booking experience", help="Email subject line")
    
    args = parser.parse_args()
    
    if not args.sheet_url and not args.email:
        print("Error: You must provide either --sheet-url or --email")
        return

    # Load credentials
    load_env_file()
    smtp_user = os.environ.get("EMAIL_USER", "rodge.tonacao@gmail.com")
    smtp_pass = os.environ.get("EMAIL_PASS", "wzyl frvy suny rxcj")
    resend_api_key = os.environ.get("RESEND_API_KEY", "")
    
    # Let user override the sender email when using Resend
    from_email = "roger@rogertonacao.com" if resend_api_key else smtp_user
    
    if not resend_api_key and (not smtp_user or not smtp_pass):
        print("Error: No valid credentials found. Please set RESEND_API_KEY or EMAIL_USER/EMAIL_PASS in .env")
        return
        
    # Load Pitch Template
    script_dir = os.path.dirname(os.path.abspath(__file__))
    template_path = os.path.join(script_dir, "..", "resources", "pitch_template.txt")
    
    if not os.path.exists(template_path):
        print(f"Error: Template file not found at {template_path}")
        return
        
    with open(template_path, "r", encoding="utf-8") as f:
        template_content = f.read()
        
    targets = []
    
    if args.email:
        targets.append({
            "Email Address": args.email,
            "Company Name": args.company,
            "Contact Person": args.contact
        })
        
    if args.sheet_url:
        csv_data = fetch_google_sheet_csv(args.sheet_url)
        if csv_data:
            reader = csv.DictReader(csv_data.splitlines())
            for row in reader:
                # Support different casing of columns
                email_col = next((k for k in row.keys() if k and k.lower() in ['email address', 'email']), None)
                company_col = next((k for k in row.keys() if k and k.lower() in ['company name', 'name', 'company']), None)
                contact_col = next((k for k in row.keys() if k and k.lower() in ['contact person', 'contact']), None)
                
                if email_col and company_col:
                    email_val = row[email_col].strip()
                    if email_val and email_val.lower() != 'n/a' and '@' in email_val:
                        # Extract first email if multiple are comma-separated
                        first_email = email_val.split(',')[0].strip()
                        contact_val = row[contact_col].strip() if contact_col else ""
                        targets.append({
                            "Email Address": first_email,
                            "Company Name": row[company_col].strip(),
                            "Contact Person": contact_val
                        })
                        
    if not targets:
        print("No valid email targets found.")
        return
        
    print(f"Found {len(targets)} targets to email.")
    
    success_count = 0
    fail_count = 0
    
    for i, target in enumerate(targets):
        company = target["Company Name"]
        if not company or company.lower() == 'n/a':
            company = "Hotel Owner"
            
        contact = target.get("Contact Person", "")
        if not contact or contact.lower() == 'n/a':
            contact = company
            
        email_body = template_content.replace("{Company Name}", company).replace("{Contact Person}", contact)
        email_addr = target["Email Address"]
        
        print(f"[{i+1}/{len(targets)}] Sending to {company} ({email_addr})...")
        success, err = send_email(smtp_user, smtp_pass, email_addr, args.subject, email_body, resend_api_key, from_email)
        
        if success:
            print("  -> Success!")
            success_count += 1
        else:
            print(f"  -> Failed: {err}")
            fail_count += 1
            
        # Slight delay to prevent spam flagging
        if i < len(targets) - 1:
            time.sleep(3)
            
    print("\n--- Summary ---")
    print(f"Total Attempted: {len(targets)}")
    print(f"Successful: {success_count}")
    print(f"Failed: {fail_count}")

if __name__ == "__main__":
    main()
