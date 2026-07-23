---
name: Job Applicant Post Skill
description: Scrapes job vacancies from specified websites, Facebook pages, or public listings, evaluates qualification fit, extracts employer contact emails, and automatically dispatches job application emails with an attached resume/CV.
---

# Job Applicant Post Skill

This skill allows the agent to search for job vacancies based on user-provided target URLs or search keywords, extract employer contact emails, filter listings against candidate qualifications, and automatically send application emails attached with the candidate's resume/CV.

## Triggering Keywords
- "Job Applicant Post"
- "find job vacancies"
- "scrape job postings"
- "apply for jobs automatically"
- "search jobs and send resume"
- "job vacancy scraper"

## Instructions for the Agent
1. When triggered by the user, locate the script: `c:/website/website-landingpage-roger/.agents/skills/job_applicant_post/scripts/job_applicant.py`.
2. Parse the target parameters from the user's prompt:
   - `--url`: (Optional) Specific website, Facebook page, or job board URL provided by the user.
   - `--keywords`: Target job titles or search terms (e.g. "Virtual Assistant", "React Developer", "Customer Support").
   - `--qualifications`: Skills/qualifications to match against job descriptions.
   - `--resume`: (Optional) Custom path to candidate's PDF or DOCX resume. Default is `c:/website/website-landingpage-roger/.agents/skills/job_applicant_post/assets/resume.pdf`.
   - `--playwright`: Pass when connecting to an open Chrome/Edge browser tab (using `--cdp-url http://localhost:9222`).
   - `--form-url`: Google Form URL to automatically fill out and submit (e.g. `https://docs.google.com/forms/d/e/.../viewform`).
   - `--sheets-url`: Google Sheet URL or ID containing a list of target Facebook groups, pages, or job boards to scan and apply sequentially.
   - `--linkedin`: Enables LinkedIn Jobs Playwright scraping for keywords.
   - `--auto-send`: Send emails automatically (default mode). Pass `--dry-run` if the user explicitly requests to preview matches before sending.
3. Run the script using Python:
   ```bash
   python c:/website/website-landingpage-roger/.agents/skills/job_applicant_post/scripts/job_applicant.py --keywords "Virtual Assistant" --auto-send
   ```
4. Parse the returned stdout JSON:
   - `total_scraped`: Total number of job postings scanned.
   - `applications_processed`: Total number of emails attempted/sent.
   - `csv_path`: File path to `Downloads/job_applications_log.csv`.
   - `results`: Details of applied jobs, employer email addresses, match score %, and delivery status.
5. Present a structured Markdown table summarizing the job applications sent (Job Title, Employer Email, Match Score %, Status).
6. Provide a clickable link to the generated CSV report file.
