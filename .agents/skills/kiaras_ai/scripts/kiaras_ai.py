import os
import sys
import json
import datetime
import subprocess

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

def run_kiaras_ai():
    load_env_file()
    print("=== KIARAS AI MARKETING ENGINE ===")
    
    # 1. Scrape PAGASA Weather for Bogo City
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_root = os.path.abspath(os.path.join(script_dir, "..", "..", ".."))
    weather_script = os.path.join(project_root, ".agents", "skills", "weather_scraper", "scripts", "scrape_weather.py")
    
    weather_data = {}
    if os.path.exists(weather_script):
        try:
            res = subprocess.run([sys.executable, weather_script], capture_output=True, text=True)
            weather_data = json.loads(res.stdout) if res.stdout else {}
        except Exception as e:
            print(f"Weather Scraper Notice: {e}")

    # 2. Default Customer Reviews & Testimonials
    reviews = [
        {"customer": "Maria S. from Bogo City", "rating": "5/5 Stars", "comment": "Best homemade ice cream in Bogo City! The mango flavor is 100% real and super creamy!"},
        {"customer": "Jun R.", "rating": "5/5 Stars", "comment": "Perfect treat on hot afternoons. Highly recommended for family events!"}
    ]

    # 3. Dynamic 7-Day Social Media Theme Calendar Rotation
    now = datetime.datetime.now()
    weekday_num = now.weekday()
    theme_info = get_daily_theme_content(weekday_num, weather_data)
    today_str = now.strftime("%A, %B %d, %Y")
    
    campaign = {
        "brand": "Kiara's Home Made Ice Cream",
        "date": today_str,
        "theme": theme_info["name"],
        "headline": theme_info["headline"],
        "body": theme_info["body"],
        "cta": "📞 Call/Text to Order: 09452134174\n📍 Bogo City, Cebu\n🛵 Fast Local Delivery Available!",
        "hashtags": theme_info["hashtags"]
    }

    page_id = os.environ.get("FB_PAGE_ID")
    access_token = os.environ.get("FB_PAGE_ACCESS_TOKEN")
    
    if page_id and access_token:
        full_post_message = f"{campaign['headline']}\n\n{campaign['body']}\n\n{campaign['cta']}\n\n{campaign['hashtags']}"
        publish_res = publish_to_facebook_page(page_id, access_token, full_post_message)
        campaign["fb_publish_result"] = publish_res

def get_daily_theme_content(weekday_num, weather_data=None):
    """Return dynamic weekly social media themes (Motivation, Trivia, Weather, Craftsmanship, Reviews, Family Weekend, Sunday Funday)."""
    themes = {
        0: { # Monday - Motivation & Inspiration
            "name": "Motivation Monday",
            "headline": "✨ START YOUR WEEK SWEET WITH KIARA’S HOME MADE ICE CREAM! 🍦",
            "body": (
                "New week, new goals! 🚀 Remember to take a break and reward your hard work with a delicious scoop of 100% homemade happiness.\n\n"
                "💡 INSPIRATION OF THE DAY:\n"
                "\"You can't buy happiness, but you can buy homemade ice cream—and that's pretty much the same thing!\"\n\n"
                "✨ Treat Yourself Today:\n"
                "• 🥭 Fresh Mango & Rich Ube Halaya\n"
                "• 🍦 100% Real Cream & Zero Preservatives\n"
                "• ❄️ Freshly Crafted Daily in Bogo City"
            ),
            "hashtags": "#MotivationMonday #KiarasHomeMadeIceCream #StartYourWeekRight #BogoCity #CebuEats"
        },
        1: { # Tuesday - Ice Cream Trivia & Did-You-Knows
            "name": "Trivia Tuesday",
            "headline": "💡 TRIVIA TUESDAY: DID YOU KNOW ICE CREAM BOOSTS YOUR HAPPINESS? 🧠🍨",
            "body": (
                "\"Did you know? Scientists have found that eating ice cream actually stimulates the brain's pleasure center and releases serotonin—the 'happy hormone'!\"\n\n"
                "Boost your serotonin in Bogo City today with Kiara's 100% Homemade Ice Cream! ❤️"
            ),
            "hashtags": "#TriviaTuesday #FunFacts #KiarasHomeMadeIceCream #DidYouKnow #BogoCity"
        },
        2: { # Wednesday - Midweek Pick-Me-Up
            "name": "Midweek Pick-Me-Up Wednesday",
            "headline": "🚀 MIDWEEK PICK-ME-UP: REFUEL YOUR WEDNESDAY WITH KIARA’S HOMEMADE ICE CREAM! 🍦",
            "body": (
                "\"Halfway to the weekend! You've worked hard—treat yourself to a scoop of pure happiness today.\"\n\n"
                "Boost your Wednesday energy in Bogo City today with 100% Homemade Ice Cream! ❤️"
            ),
            "hashtags": "#MidweekPickMeUp #WednesdayVibes #KiarasHomeMadeIceCream #BogoCity #CebuEats"
        },
        3: { # Thursday - Review Thursday
            "name": "Review Thursday",
            "headline": "⭐ REVIEW THURSDAY: SEE WHY BOGO CITY LOVES KIARA’S HOMEMADE ICE CREAM! 🍨",
            "body": (
                "\"Best homemade ice cream in Bogo City! The mango flavor is 100% real, super creamy, and our family's favorite!\" - Maria S., Bogo City\n\n"
                "Thank you for making Kiara's your #1 favorite homemade ice cream in Bogo City! ❤️"
            ),
            "hashtags": "#ReviewThursday #CustomerLove #KiarasHomeMadeIceCream #BogoCity #CebuEats"
        },
        4: { # Friday - Customer Spotlight & Reviews
            "name": "Feature Friday (Social Proof & Reviews)",
            "headline": "⭐ FEATURE FRIDAY: SEE WHY BOGO CITY LOVES KIARA’S! 🍨",
            "body": (
                "Happy Friday, Bogo City! 🎉 Thank you for making Kiara's Home Made Ice Cream your #1 favorite weekend treat!\n\n"
                "💬 WHAT OUR CUSTOMERS SAY:\n"
                "⭐ \"Best homemade ice cream in Bogo City! The mango flavor is 100% real and super creamy!\" - Maria S.\n"
                "⭐ \"Perfect treat for family gatherings. Authentic taste!\" - Jun R.\n\n"
                "Kick off your weekend with a scoop of happiness! 🎉"
            ),
            "hashtags": "#FeatureFriday #CustomerLove #KiarasHomeMadeIceCream #BogoCityLocals #WeekendVibes"
        },
        5: { # Saturday - Family & Party Pack Special
            "name": "Super Saturday Family Feast",
            "headline": "🎉 SATURDAY FAMILY FEAST: SHARE THE JOY OF HOMEMADE ICE CREAM! 🍨",
            "body": (
                "Saturdays are made for family! 👨‍👩‍👧‍👦 Make your weekend gatherings extra special with Kiara's Home Made Ice Cream tubs and waffle cones!\n\n"
                "🍨 PERFECT FOR:\n"
                "• Family Desserts & Sunday Lunches\n"
                "• Birthday Parties & Celebrations\n"
                "• Afternoon Snacks with Friends\n\n"
                "Fast local delivery available anywhere in Bogo City! 🛵"
            ),
            "hashtags": "#SuperSaturday #FamilyTime #KiarasHomeMadeIceCream #WeekendSpecial #BogoCity"
        },
        6: { # Sunday - Sunday Funday & Engagement
            "name": "Sunday Funday Sweet Rewards",
            "headline": "🍨 SUNDAY FUNDAY: WHAT'S YOUR FAVORITE KIARA’S FLAVOR? 🥭💜",
            "body": (
                "Happy Sunday! ☀️ Time to relax, unwind, and enjoy sweet moments with loved ones.\n\n"
                "❓ QUICK SUNDAY QUESTION:\n"
                "Are you Team Mango 🥭 or Team Ube 💜?\n"
                "Comment your favorite flavor below!\n\n"
                "Treat your family to a scoop of 100% homemade ice cream today! ❤️"
            ),
            "hashtags": "#SundayFunday #KiarasHomeMadeIceCream #TeamMango #TeamUbe #BogoCity"
        }
    }
    return themes.get(weekday_num, themes[2])

def publish_to_facebook_page(page_id, access_token, message, image_path=None):
    """Publish photo post directly to Facebook Page using FB Graph API."""
    import urllib.request
    import urllib.parse
    import uuid

    if not page_id or not access_token:
        print("Notice: FB_PAGE_ID and FB_PAGE_ACCESS_TOKEN not set in server/.env.")
        return {"success": False, "message": "FB API credentials missing in server/.env"}

    # Find brand ad image if not explicitly provided
    if not image_path or not os.path.exists(image_path):
        artifacts_dir = r"C:\Users\ADMIN\.gemini\antigravity\brain\a2f78447-6afd-453a-b3a9-444bb1e93aa1"
        if os.path.exists(artifacts_dir):
            files = [os.path.join(artifacts_dir, f) for f in os.listdir(artifacts_dir) if f.startswith("kiaras_brand_ad") and f.endswith(".png")]
            if files:
                image_path = sorted(files)[-1]

    if image_path and os.path.exists(image_path):
        print(f"Publishing PHOTO Post via Facebook Graph API ({image_path})...")
        url = f"https://graph.facebook.com/v19.0/{page_id}/photos"
        boundary = uuid.uuid4().hex
        
        body = []
        body.append(f"--{boundary}".encode("utf-8"))
        body.append(f'Content-Disposition: form-data; name="caption"'.encode("utf-8"))
        body.append(b"")
        body.append(message.encode("utf-8"))

        body.append(f"--{boundary}".encode("utf-8"))
        body.append(f'Content-Disposition: form-data; name="access_token"'.encode("utf-8"))
        body.append(b"")
        body.append(access_token.encode("utf-8"))

        body.append(f"--{boundary}".encode("utf-8"))
        body.append(f'Content-Disposition: form-data; name="source"; filename="{os.path.basename(image_path)}"'.encode("utf-8"))
        body.append(f'Content-Type: image/png'.encode("utf-8"))
        body.append(b"")
        with open(image_path, "rb") as f:
            body.append(f.read())

        body.append(f"--{boundary}--".encode("utf-8"))
        body.append(b"")

        payload = b"\r\n".join(body)
        headers = {
            "Content-Type": f"multipart/form-data; boundary={boundary}",
            "Content-Length": str(len(payload))
        }

        req = urllib.request.Request(url, data=payload, headers=headers, method="POST")
        try:
            with urllib.request.urlopen(req) as resp:
                res_json = json.loads(resp.read().decode("utf-8"))
                print(f"Facebook Graph API Photo Publish Success! Photo ID: {res_json.get('id')} / Post ID: {res_json.get('post_id')}")
                return {"success": True, "photo_id": res_json.get("id"), "post_id": res_json.get("post_id")}
        except Exception as e:
            print(f"FB Graph API Photo Upload Notice: {e}")

    print(f"Publishing FEED Post via Facebook Graph API to Page ID '{page_id}'...")
    url = f"https://graph.facebook.com/v19.0/{page_id}/feed"
    data = {"message": message, "access_token": access_token}
    encoded_data = urllib.parse.urlencode(data).encode("utf-8")
    req = urllib.request.Request(url, data=encoded_data, method="POST")
    try:
        with urllib.request.urlopen(req) as resp:
            res_json = json.loads(resp.read().decode("utf-8"))
            print(f"Facebook Graph API Feed Publish Success: Post ID {res_json.get('id')}")
            return {"success": True, "post_id": res_json.get("id")}
    except Exception as e:
        print(f"FB Graph API Notice: {e}")
        return {"success": False, "error": str(e)}

if __name__ == "__main__":
    run_kiaras_ai()
