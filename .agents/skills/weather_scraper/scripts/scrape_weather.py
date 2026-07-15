import os
import re
import csv
import json
import urllib.request
import datetime
import math
from fpdf import FPDF
from PIL import Image, ImageDraw, ImageFont

NORTHERN_CEBU_KEYWORDS = [
    "bogo", "northern cebu", "medellin", "daanbantayan", "san remigio", 
    "bantayan", "madridejos", "santa fe", "tuburan", "tabuelan", 
    "sogod", "borbon", "tabogon", "san francisco", "poro", "tudela", 
    "pilar", "camotes", "catmon", "carmen", "asturias", "danao"
]

BOGO_FOCUS_MUNICIPALITIES = {
    'City of Bogo', 'Medellin', 'San Remigio', 'Tabogon', 'Borbon', 'Tabuelan'
}

def translate_to_bisaya(text):
    if not text:
        return ""
    mapping = {
        r"partly cloudy skies to at times cloudy with rainshowers or thunderstorms?": "Medyo madag-umon ngadto sa panalagsang madag-umon nga may pat-ak-pat-ak nga ulan ug kilat-kilat",
        r"cloudy skies with rainshowers and thunderstorms?": "Madag-umon nga kalangitan nga adunay ulan ug kilat-kilat",
        r"clear skies": "Tin-aw nga kalangitan",
        r"partly cloudy to cloudy skies": "Medyo madag-umon ngadto sa madag-umon nga kalangitan",
        r"isolated rainshowers or thunderstorms?": "panalagsang pat-ak-pat-ak nga ulan ug kilat-kilat",
        r"light to moderate": "hinay ngadto sa kasarangan",
        r"moderate to strong": "kasarangan ngadto sa kusog",
        r"slight to moderate": "hinay ngadto sa kasarangan",
        r"moderate to rough": "kasarangan ngadto sa mabalod",
        r"southwest to south": "Habagat ngadto sa Habagatan",
        r"southwest": "Habagat",
        r"south": "Habagatan",
    }
    translated = text
    for eng, bis in mapping.items():
        translated = re.sub(eng, bis, translated, flags=re.IGNORECASE)
    return translated

def filter_and_localize_advisory(text):
    blocks = re.findall(r'(#\w+\([^)]+\))', text)
    kept_blocks = []
    
    for block in blocks:
        is_cebu = "cebu" in block.lower()
        contains_northern = any(kw in block.lower() for kw in NORTHERN_CEBU_KEYWORDS)
        if is_cebu and contains_northern:
            kept_blocks.append(block)
            
    if not kept_blocks:
        return text
        
    modified_text = text
    for block in blocks:
        if block not in kept_blocks:
            modified_text = modified_text.replace(block, "")
            
    modified_text = re.sub(r',\s*,', ',', modified_text)
    modified_text = re.sub(r'over\s*,\s*', 'over ', modified_text)
    modified_text = re.sub(r'over\s+and\s+', 'over ', modified_text)
    modified_text = re.sub(r',\s+within', ' within', modified_text)
    modified_text = re.sub(r'\s+', ' ', modified_text).strip()
    
    sentences = re.split(r'(?<=[.!?])\s+', modified_text)
    filtered_sentences = []
    for sentence in sentences:
        if "experienced in" in sentence.lower() and not any(kw in sentence.lower() for kw in NORTHERN_CEBU_KEYWORDS):
            continue
        filtered_sentences.append(sentence)
        
    return " ".join(filtered_sentences)

def translate_warning_to_bisaya(text):
    if not text:
        return ""
    mapping = {
        r"Thunderstorm Advisory No\.\s*(\d+)": r"Pahimangno sa Kilat ug Ulan (Thunderstorm Advisory) Blg. \1",
        r"Issued at": "Gipagawas sa",
        r"Moderate to Heavy rainshowers": "Kasarangan ngadto sa kusog nga pat-ak-pat-ak nga ulan",
        r"with lightning and strong winds": "inubanan sa kilat ug kusog nga hangin",
        r"are expected over": "gilauman sa",
        r"within the next (\d+) minutes to an hour": r"sulod sa mosunod nga \1 ka minuto ngadto sa usa ka oras",
        r"within the next (\d+) hours?": r"sulod sa mosunod nga \1 ka oras",
        r"The above conditions are being experienced in": "Ang mga nahisgutang kahimtang kasamtangang nasinati sa",
        r"which may persist within (\d+) to (\d+) hours?": r"nga posibleng magpadayon sulod sa \1 ngadto sa \2 ka oras",
        r"and may affect nearby areas": "ug posibleng moapektar sa kasikbit nga mga dapit",
        r"All are advised to take precautionary measures": "Gitambagan ang tanan sa paghimo og mga precautionary measures (pag-amping)",
        r"against the impacts associated with these hazards": "batok sa mga epekto niining mga peligro",
        r"which include flash floods and landslides": "lakip na ang kalit nga pagbaha (flash floods) ug pagdahili sa yuta (landslides)",
        r"Keep monitoring for updates": "Padayon sa pag-monitor alang sa dugang mga updates",
    }
    translated = text
    for eng, bis in mapping.items():
        translated = re.sub(eng, bis, translated, flags=re.IGNORECASE)
    return translated

def format_bisaya_date(dt):
    days = {
        "Monday": "Lunes", "Tuesday": "Martes", "Wednesday": "Miyerkules",
        "Thursday": "Huwebes", "Friday": "Biyernes", "Saturday": "Sabado", "Sunday": "Domingo"
    }
    months = {
        "January": "Enero", "February": "Pebrero", "March": "Marso", "April": "Abril",
        "May": "Mayo", "June": "Hunyo", "July": "Hulyo", "August": "Agosto",
        "September": "Setyembre", "October": "Oktubre", "November": "Nobyembre", "December": "Disyembre"
    }
    day_name = days.get(dt.strftime("%A"), dt.strftime("%A"))
    month_name = months.get(dt.strftime("%B"), dt.strftime("%B"))
    return f"{day_name}, {month_name} {dt.day}, {dt.year}"

def normalize_name(name):
    name_clean = re.sub(r'[^a-zA-Z]', '', name).lower()
    mapping = {
        "alcantara": "Alcantara", "alcoy": "Alcoy", "alegria": "Alegria", "aloguinsan": "Aloguinsan",
        "argao": "Argao", "asturias": "Asturias", "badian": "Badian", "balamban": "Balamban",
        "bantayan": "Bantayan", "barili": "Barili", "boljoon": "Boljoon", "borbon": "Borbon",
        "carmen": "Carmen", "catmon": "Catmon", "cityofbogo": "City of Bogo", "bogo": "City of Bogo",
        "cityofcarcar": "City of Carcar", "carcar": "City of Carcar", "cityofnaga": "City of Naga",
        "naga": "City of Naga", "cityoftalisay": "City of Talisay", "talisay": "City of Talisay",
        "cityoftoledo": "City of Toledo", "toledo": "City of Toledo", "compostela": "Compostela",
        "consolacion": "Consolacion", "cordova": "Cordova", "daanbantayan": "Daanbantayan",
        "dalaguete": "Dalaguete", "danaocity": "Danao City", "danao": "Danao City",
        "dumanjug": "Dumanjug", "ginatilan": "Ginatilan", "liloan": "Liloan", "madridejos": "Madridejos",
        "malabuyoc": "Malabuyoc", "medellin": "Medellin", "minglanilla": "Minglanilla",
        "moalboal": "Moalboal", "oslob": "Oslob", "pilar": "Pilar", "pinamungajan": "Pinamungajan",
        "poro": "Poro", "ronda": "Ronda", "samboan": "Samboan", "sanfernando": "San Fernando",
        "sanfrancisco": "San Francisco", "sanremigio": "San Remigio", "santafe": "Santa Fe",
        "santander": "Santander", "sibonga": "Sibonga", "sogod": "Sogod", "tabogon": "Tabogon",
        "tabuelan": "Tabuelan", "tuburan": "Tuburan", "tudela": "Tudela"
    }
    return mapping.get(name_clean, name)

def parse_warned_municipalities(advisory_text):
    affecting = []
    expecting = []
    
    cleaned = re.sub(r'\s+', ' ', advisory_text)
    parts = re.split(r'Expecting', cleaned, flags=re.IGNORECASE)
    
    if len(parts) >= 1:
        blocks = re.findall(r'#Cebu\(([^)]+)\)', parts[0], re.IGNORECASE)
        for b in blocks:
            muns = re.split(r',|and', b)
            for m in muns:
                m_clean = m.strip()
                if m_clean:
                    affecting.append(normalize_name(m_clean))
                    
    if len(parts) >= 2:
        blocks = re.findall(r'#Cebu\(([^)]+)\)', parts[1], re.IGNORECASE)
        for b in blocks:
            muns = re.split(r',|and', b)
            for m in muns:
                m_clean = m.strip()
                if m_clean:
                    expecting.append(normalize_name(m_clean))
                    
    return affecting, expecting

def draw_vector_icon(draw, cx, cy, desc):
    desc = desc.lower()
    
    # 1. Clear / Sunny
    if "clear" in desc or "sunny" in desc:
        draw.ellipse([cx - 20, cy - 20, cx + 20, cy + 20], fill=(255, 215, 0), outline=(255, 165, 0), width=2)
        for angle in range(0, 360, 45):
            rad = math.radians(angle)
            x1 = cx + 25 * math.cos(rad)
            y1 = cy + 25 * math.sin(rad)
            x2 = cx + 35 * math.cos(rad)
            y2 = cy + 35 * math.sin(rad)
            draw.line([x1, y1, x2, y2], fill=(255, 165, 0), width=3)
            
    # 2. Thunderstorm / Rain / Shower / Lightning
    elif any(kw in desc for kw in ["thunderstorm", "rain", "shower", "lightning"]):
        # Gray cloud background
        draw.ellipse([cx - 25, cy - 15, cx - 5, cy + 15], fill=(90, 100, 110))
        draw.ellipse([cx - 10, cy - 25, cx + 15, cy + 15], fill=(90, 100, 110))
        draw.ellipse([cx + 5, cy - 15, cx + 25, cy + 15], fill=(90, 100, 110))
        draw.rectangle([cx - 15, cy, cx + 15, cy + 15], fill=(90, 100, 110))
        
        # Blue rain lines
        draw.line([cx - 15, cy + 20, cx - 20, cy + 30], fill=(50, 150, 255), width=2)
        draw.line([cx - 5, cy + 20, cx - 10, cy + 30], fill=(50, 150, 255), width=2)
        draw.line([cx + 5, cy + 20, cx, cy + 30], fill=(50, 150, 255), width=2)
        draw.line([cx + 15, cy + 20, cx + 10, cy + 30], fill=(50, 150, 255), width=2)
        
        # Yellow lightning bolt
        if "thunderstorm" in desc or "lightning" in desc:
            points = [
                (cx + 2, cy + 5),
                (cx - 10, cy + 22),
                (cx - 2, cy + 22),
                (cx - 8, cy + 35),
                (cx + 8, cy + 18),
                (cx, cy + 18)
            ]
            draw.polygon(points, fill=(255, 230, 0), outline=(200, 150, 0))
            
    # 3. Partly Cloudy / Cloudy (Default)
    else:
        # Draw small sun behind
        draw.ellipse([cx + 2, cy - 25, cx + 26, cy - 1], fill=(255, 215, 0))
        # Draw white cloud in front
        draw.ellipse([cx - 25, cy - 10, cx - 5, cy + 20], fill=(240, 245, 250))
        draw.ellipse([cx - 10, cy - 20, cx + 15, cy + 20], fill=(240, 245, 250))
        draw.ellipse([cx + 5, cy - 10, cx + 25, cy + 20], fill=(240, 245, 250))
        draw.rectangle([cx - 15, cy + 5, cx + 15, cy + 20], fill=(240, 245, 250))

def draw_fb_forecast_graphic(forecasts, output_png):
    width, height = 1200, 630
    
    try:
        title_font = ImageFont.truetype("arial.ttf", 36)
        subtitle_font = ImageFont.truetype("arial.ttf", 18)
        day_font = ImageFont.truetype("arial.ttf", 22)
        temp_font = ImageFont.truetype("arial.ttf", 26)
        label_font = ImageFont.truetype("arial.ttf", 14)
        val_font = ImageFont.truetype("arial.ttf", 12)
    except:
        title_font = ImageFont.load_default()
        subtitle_font = ImageFont.load_default()
        day_font = ImageFont.load_default()
        temp_font = ImageFont.load_default()
        label_font = ImageFont.load_default()
        val_font = ImageFont.load_default()

    img = Image.new("RGB", (width, height), (18, 27, 34)) # Dark background #121b22
    draw = ImageDraw.Draw(img)
    
    # 1. Header Title
    draw.text((width//2, 35), "BOGO CITY 6-DAY WEATHER FORECAST", fill=(255, 255, 255), font=title_font, anchor="mm")
    draw.text((width//2, 75), f"Source: PAGASA Visayas Regional Services Division | Updated: {datetime.date.today().strftime('%B %d, %Y')}", fill=(150, 160, 170), font=subtitle_font, anchor="mm")
    
    # Column configuration
    margin_x = 30
    start_y = 110
    col_h = 480
    spacing = 12
    num_cols = len(forecasts)
    
    col_w = (width - 2 * margin_x - (num_cols - 1) * spacing) // num_cols
    today = datetime.date.today()
    
    # 2. Draw Columns
    for idx, entry in enumerate(forecasts):
        col_x = margin_x + idx * (col_w + spacing)
        
        # Column background card (rounded rectangle)
        draw.rounded_rectangle([col_x, start_y, col_x + col_w, start_y + col_h], radius=10, fill=(30, 45, 59)) # Card bg #1e2d3b
        
        # Day name
        f_date = today + datetime.timedelta(days=idx)
        day_name = f_date.strftime("%A")
        draw.text((col_x + col_w//2, start_y + 25), day_name, fill=(255, 255, 255), font=day_font, anchor="mm")
        
        # Weather Vector Icon
        icon_y = start_y + 90
        draw_vector_icon(draw, col_x + col_w//2, icon_y, entry.get("day_description", "cloudy"))
        
        # Temperature Range (Low Cyan, High Coral)
        temp_y = start_y + 165
        low_t = f"{entry.get('day_low', '26')}°"
        high_t = f"{entry.get('day_high', '32')}°"
        
        draw.text((col_x + col_w//3 + 5, temp_y), low_t, fill=(62, 197, 213), font=temp_font, anchor="mm") # Cyan
        draw.text((col_x + 2 * col_w//3 - 5, temp_y), high_t, fill=(255, 107, 107), font=temp_font, anchor="mm") # Coral/Red
        
        # Separator line
        draw.line([col_x + 15, start_y + 200, col_x + col_w - 15, start_y + 200], fill=(70, 80, 90), width=1)
        
        # Details layout (Wind speed, direction, coastal condition)
        details_y = start_y + 215
        
        def draw_detail(label, value, y_pos):
            draw.text((col_x + 15, y_pos), label, fill=(255, 255, 255), font=label_font)
            val_y = y_pos + 18
            words = str(value).split()
            lines = []
            curr_line = ""
            for w in words:
                test_line = curr_line + " " + w if curr_line else w
                if len(test_line) * 6 < (col_w - 30):
                    curr_line = test_line
                else:
                    lines.append(curr_line)
                    curr_line = w
            if curr_line:
                lines.append(curr_line)
                
            for line_idx, line in enumerate(lines[:2]): # limit to 2 lines
                draw.text((col_x + 15, val_y + line_idx * 14), line, fill=(200, 210, 220), font=val_font)
            return y_pos + 50
            
        y_next = draw_detail("Wind Speed", entry.get("day_wind_speed", "Light to Moderate"), details_y)
        y_next = draw_detail("Direction", entry.get("day_wind_direction", "Southwest"), y_next)
        y_next = draw_detail("Coastal Condition", entry.get("day_coastal_condition", "Slight to Moderate"), y_next)

    try:
        img.save(output_png)
        return True
    except Exception as e:
        print(f"Error saving FB graphic: {e}")
        return False

def draw_map(warned_affecting, warned_expecting, output_png):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    geojson_path = os.path.join(script_dir, "cebu_municities.json")
    if not os.path.exists(geojson_path):
        return False
        
    try:
        with open(geojson_path, "r", encoding="utf-8") as f:
            data = json.load(f)
            
        min_lon, max_lon = 180.0, -180.0
        min_lat, max_lat = 90.0, -90.0
        
        centroids = {}
        for feature in data['features']:
            name = feature['properties']['adm3_en']
            geom = feature['geometry']
            coords = geom['coordinates']
            
            lon_sum, lat_sum, pt_count = 0.0, 0.0, 0
            
            def check_coords(c_list):
                nonlocal min_lon, max_lon, min_lat, max_lat, lon_sum, lat_sum, pt_count
                for p in c_list:
                    if isinstance(p[0], (int, float)):
                        lon, lat = p[0], p[1]
                        lon_sum += lon
                        lat_sum += lat
                        pt_count += 1
                        
                        if name in BOGO_FOCUS_MUNICIPALITIES:
                            if lon < min_lon: min_lon = lon
                            if lon > max_lon: max_lon = lon
                            if lat < min_lat: min_lat = lat
                            if lat > max_lat: max_lat = lat
                    else:
                        check_coords(p)
                        
            check_coords(coords)
            if pt_count > 0:
                centroids[name] = (lon_sum / pt_count, lat_sum / pt_count)
                
        width, height = 800, 1000
        margin = 80
        
        img = Image.new("RGB", (width, height), (240, 245, 250))
        draw = ImageDraw.Draw(img)
        
        def project(lon, lat):
            x = margin + (lon - min_lon) / (max_lon - min_lon) * (width - 2 * margin)
            y = margin + (max_lat - lat) / (max_lat - min_lat) * (height - 2 * margin)
            return (x, y)
            
        for pass_idx in range(2):
            for feature in data['features']:
                name = feature['properties']['adm3_en']
                geom = feature['geometry']
                g_type = geom['type']
                coords = geom['coordinates']
                
                is_affecting = name in warned_affecting
                is_expecting = name in warned_expecting
                
                if pass_idx == 0:
                    if is_affecting or is_expecting:
                        continue
                    fill_color = (175, 210, 220)
                    outline_color = (255, 255, 255)
                else:
                    if not (is_affecting or is_expecting):
                        continue
                    if is_affecting:
                        fill_color = (100, 30, 120)
                    else:
                        fill_color = (230, 50, 120)
                    outline_color = (255, 255, 255)
                    
                def draw_poly(p_list):
                    points = [project(p[0], p[1]) for p in p_list]
                    if len(points) >= 3:
                        draw.polygon(points, fill=fill_color, outline=outline_color)
                        
                if g_type == "Polygon":
                    for poly in coords:
                        draw_poly(poly)
                elif g_type == "MultiPolygon":
                    for multipoly in coords:
                        for poly in multipoly:
                            draw_poly(poly)
                            
        labels_to_draw = warned_affecting + warned_expecting + ['City of Bogo']
        for name in list(set(labels_to_draw)):
            if name in centroids:
                lon, lat = centroids[name]
                cx, cy = project(lon, lat)
                
                if not (margin//2 <= cx <= width - margin//2 and margin//2 <= cy <= height - margin//2):
                    continue
                    
                label = name.replace("City of ", "")
                is_bogo = (name == 'City of Bogo')
                font_color = (255, 255, 0) if is_bogo else (255, 255, 255)
                
                for dx, dy in [(-1,-1), (-1,1), (1,-1), (1,1), (0,-1), (0,1), (-1,0), (1,0)]:
                    draw.text((cx + dx, cy + dy), label, fill=(0,0,0))
                draw.text((cx, cy), label, fill=font_color)
                
        draw.rectangle([0, 0, width, 80], fill=(14, 56, 122))
        draw.text((20, 18), "BOGO CITY WEATHER ADVISORY MAP", fill=(255, 255, 255))
        draw.text((20, 48), "Mapa sa mga Pahimangno sa Panahon sa Bogo City ug Kasikbit nga mga Lungsod", fill=(200, 220, 255))
        
        draw.rectangle([20, 95, 340, 205], fill=(255, 255, 255), outline=(200, 200, 200))
        draw.rectangle([35, 110, 55, 130], fill=(100, 30, 120))
        draw.text((65, 115), "AFFECTING / KASAMTANGANG APEKTADO", fill=(0, 0, 0))
        draw.rectangle([35, 155, 55, 175], fill=(230, 50, 120))
        draw.text((65, 160), "EXPECTING / GILAUMAN SULOD SA 1 ORAS", fill=(0, 0, 0))
        
        img.save(output_png)
        return True
    except Exception as e:
        print(f"Map Draw Error: {e}")
        return False

def generate_pdf(forecasts, advisories, special_alerts, output_pdf, map_png=None):
    try:
        pdf = FPDF()
        pdf.set_auto_page_break(auto=True, margin=15)
        pdf.add_page()
        
        pdf.set_fill_color(14, 56, 122)
        pdf.rect(0, 0, 210, 35, 'F')
        
        pdf.set_y(10)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font("helvetica", "B", 15)
        pdf.cell(0, 8, "BOGO CITY WEATHER FORECAST REPORT", align="C", new_x="LMARGIN", new_y="NEXT")
        pdf.set_font("helvetica", "I", 10)
        pdf.cell(0, 6, "Report gikan sa PAGASA Regional Scraper (Bogo City Focus)", align="C", new_x="LMARGIN", new_y="NEXT")
        
        pdf.set_y(40)
        pdf.set_text_color(0, 0, 0)
        
        pdf.set_font("helvetica", "B", 11)
        pdf.set_fill_color(230, 240, 255)
        pdf.cell(0, 8, " MGA PAHIMANGNO SA PANAHON (WARNINGS & ADVISORIES)", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.ln(2)
        
        pdf.set_font("helvetica", "", 9)
        if advisories or special_alerts:
            for adv in advisories:
                pdf.set_text_color(180, 0, 0)
                pdf.set_font("helvetica", "B", 9)
                pdf.cell(0, 5, "Thunderstorm Warning (Bogo City & Neighbors):", new_x="LMARGIN", new_y="NEXT")
                pdf.set_font("helvetica", "", 9)
                pdf.set_text_color(50, 50, 50)
                translated_adv = translate_warning_to_bisaya(adv)
                pdf.multi_cell(0, 4, f"English: {adv}\n\nBisaya: {translated_adv}")
                pdf.ln(2)
            
            for sa in special_alerts:
                pdf.set_text_color(200, 100, 0)
                pdf.set_font("helvetica", "B", 9)
                pdf.cell(0, 5, f"Alert: {sa}", new_x="LMARGIN", new_y="NEXT")
                pdf.ln(1)
        else:
            pdf.set_text_color(0, 128, 0)
            pdf.cell(0, 5, "No active warnings for Bogo City and its immediate neighbors.", new_x="LMARGIN", new_y="NEXT")
            
        if map_png and os.path.exists(map_png):
            pdf.ln(3)
            pdf.image(map_png, x=50, w=110)
            
        pdf.add_page()
        pdf.set_y(15)
        pdf.set_font("helvetica", "B", 11)
        pdf.set_fill_color(230, 240, 255)
        pdf.cell(0, 8, " PANGALANTAW SA PANAHON (6-DAY WEATHER OUTLOOK)", new_x="LMARGIN", new_y="NEXT", fill=True)
        pdf.ln(4)
        
        today = datetime.date.today()
        for idx, entry in enumerate(forecasts):
            forecast_date = today + datetime.timedelta(days=idx)
            english_date_str = forecast_date.strftime("%A, %B %d, %Y")
            bisaya_date_str = format_bisaya_date(forecast_date)
            
            pdf.set_font("helvetica", "B", 9)
            pdf.set_fill_color(240, 240, 240)
            pdf.cell(0, 6, f"  {bisaya_date_str} ({english_date_str})", new_x="LMARGIN", new_y="NEXT", fill=True)
            pdf.ln(2)
            
            start_y = pdf.get_y()
            
            pdf.set_x(10)
            pdf.set_font("helvetica", "B", 8)
            pdf.cell(90, 4, "BUNTAG / HAPON (DAY)", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 8)
            
            day_desc = entry.get("day_description", "N/A")
            day_bis = translate_to_bisaya(day_desc)
            day_temp = f"Temp: {entry.get('day_low', 'N/A')}C - {entry.get('day_high', 'N/A')}C"
            day_wind = f"Wind: {entry.get('day_wind_speed', 'N/A')} from {entry.get('day_wind_direction', 'N/A')}"
            day_wind_bis = f"Hangin: {translate_to_bisaya(day_wind)}"
            day_sea = f"Sea: {entry.get('day_coastal_condition', 'N/A')}"
            day_sea_bis = f"Dagat: {translate_to_bisaya(day_sea)}"
            
            day_text = (
                f"Forecast: {day_desc}\n\n"
                f"Bisaya: {day_bis}\n"
                f"{day_temp}\n"
                f"{day_wind}\n"
                f"{day_wind_bis}\n"
                f"{day_sea}\n"
                f"{day_sea_bis}"
            )
            
            pdf.set_x(10)
            pdf.multi_cell(90, 4, day_text)
            end_y_day = pdf.get_y()
            
            pdf.set_y(start_y)
            pdf.set_x(105)
            pdf.set_font("helvetica", "B", 8)
            pdf.cell(90, 4, "GABII (NIGHT)", new_x="LMARGIN", new_y="NEXT")
            pdf.set_font("helvetica", "", 8)
            
            night_desc = entry.get("night_description", "N/A")
            night_bis = translate_to_bisaya(night_desc)
            
            if entry.get('night_high') or entry.get('night_low'):
                night_temp = f"Temp: {entry.get('night_low', 'N/A')}C - {entry.get('night_high', 'N/A')}C"
                night_wind = f"Wind: {entry.get('night_wind_speed', 'N/A')} from {entry.get('night_wind_direction', 'N/A')}"
                night_wind_bis = f"Hangin: {translate_to_bisaya(night_wind)}"
                night_sea = f"Sea: {entry.get('night_coastal_condition', 'N/A')}"
                night_sea_bis = f"Dagat: {translate_to_bisaya(night_sea)}"
                
                night_text = (
                    f"Forecast: {night_desc}\n\n"
                    f"Bisaya: {night_bis}\n"
                    f"{night_temp}\n"
                    f"{night_wind}\n"
                    f"{night_wind_bis}\n"
                    f"{night_sea}\n"
                    f"{night_sea_bis}"
                )
            else:
                night_text = (
                    f"Forecast: {night_desc}\n\n"
                    f"Bisaya: {night_bis}\n"
                    "No night outlook details available."
                )
            
            pdf.set_x(105)
            pdf.multi_cell(90, 4, night_text)
            end_y_night = pdf.get_y()
            
            pdf.set_y(max(end_y_day, end_y_night) + 4)
            
        pdf.output(output_pdf)
        return True
    except Exception as e:
        print(f"PDF Generation Error: {e}")
        return False

def main():
    url = "https://www.pagasa.dost.gov.ph/regional-forecast/visprsd"
    req = urllib.request.Request(
        url, 
        headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'}
    )
    
    try:
        with urllib.request.urlopen(req) as response:
            html = response.read().decode('utf-8')
    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch PAGASA website: {e}"}))
        return

    cebu_forecasts = []
    match = re.search(r'"data"\s*:\s*\{"702200000"', html)
    if match:
        start_pos = html.find('{', match.start())
        brace_count = 0
        end_pos = -1
        for idx in range(start_pos, len(html)):
            if html[idx] == '{':
                brace_count += 1
            elif html[idx] == '}':
                brace_count -= 1
                if brace_count == 0:
                    end_pos = idx + 1
                    break
        if end_pos != -1:
            try:
                full_data = json.loads(html[start_pos:end_pos])
                cebu_data = full_data.get("702200000", {})
                cebu_forecasts = cebu_data.get("outlook", [])
            except Exception as e:
                pass

    advisories = []
    divs = re.findall(r'<div>(Thunderstorm Advisory No\..*?)</div>', html, re.DOTALL)
    
    warned_affecting = []
    warned_expecting = []
    
    for div in divs:
        clean_text = re.sub(r'<br\s*/?>', '\n', div)
        clean_text = re.sub(r'<.*?>', '', clean_text)
        clean_text = re.sub(r'\s+', ' ', clean_text).strip()
        lower_text = clean_text.lower()
        if any(kw in lower_text for kw in NORTHERN_CEBU_KEYWORDS):
            localized_text = filter_and_localize_advisory(clean_text)
            advisories.append(localized_text)
            
            aff, exp = parse_warned_municipalities(localized_text)
            warned_affecting.extend(aff)
            warned_expecting.extend(exp)

    warned_affecting = list(set(warned_affecting))
    warned_expecting = list(set(warned_expecting))

    special_alerts = []
    if "Northern Cebu" in html or "Cebu Earthquake" in html:
        special_alerts.append("Special Outlook: Northern Cebu Earthquake Weather Outlook (Valid July 12-13, 2026)")

    downloads_dir = os.path.join(os.path.expanduser("~"), "Downloads")
    output_csv = os.path.join(downloads_dir, "bogo_city_weather_forecast.csv")
    output_pdf = os.path.join(downloads_dir, "bogo_city_weather_forecast.pdf")
    output_png = os.path.join(downloads_dir, "bogo_city_advisory_map.png")
    output_fb_png = os.path.join(downloads_dir, "bogo_city_fb_weather_forecast.png")
    
    csv_headers = [
        "Date", "Date (Bisaya)",
        "Day Temp High (°C)", "Day Temp Low (°C)", "Day Forecast", "Day Wind", "Day Coastal",
        "Night Temp High (°C)", "Night Temp Low (°C)", "Night Forecast", "Night Wind", "Night Coastal",
        "Active Warnings / Advisories"
    ]

    csv_rows = []
    today = datetime.date.today()
    for idx, entry in enumerate(cebu_forecasts):
        forecast_date = today + datetime.timedelta(days=idx)
        english_date = forecast_date.strftime("%A, %B %d, %Y")
        bisaya_date = format_bisaya_date(forecast_date)
        
        entry["date"] = english_date
        entry["date_bisaya"] = bisaya_date
        
        warnings = "; ".join(advisories + special_alerts) if idx == 0 else ""
        row = [
            english_date, bisaya_date,
            entry.get("day_high"), entry.get("day_low"), entry.get("day_description"), 
            f"{entry.get('day_wind_speed', '')} from {entry.get('day_wind_direction', '')}".strip(),
            entry.get("day_coastal_condition"),
            entry.get("night_high"), entry.get("night_low"), entry.get("night_description"),
            f"{entry.get('night_wind_speed', '')} from {entry.get('night_wind_direction', '')}".strip() if entry.get('night_wind_speed') else "",
            entry.get("night_coastal_condition"),
            warnings
        ]
        csv_rows.append(row)

    os.makedirs(downloads_dir, exist_ok=True)
    csv_saved = False
    try:
        with open(output_csv, "w", newline="", encoding="utf-8") as f:
            writer = csv.writer(f)
            writer.writerow(csv_headers)
            writer.writerows(csv_rows)
        csv_saved = True
    except Exception as e:
        print(json.dumps({"error": f"Failed to save CSV: {e}"}))

    map_saved = draw_map(warned_affecting, warned_expecting, output_png)
    pdf_saved = generate_pdf(cebu_forecasts, advisories, special_alerts, output_pdf, map_png=output_png if map_saved else None)
    fb_saved = draw_fb_forecast_graphic(cebu_forecasts, output_fb_png)

    output_data = {
        "csv_path": output_csv,
        "csv_saved": csv_saved,
        "pdf_path": output_pdf,
        "pdf_saved": pdf_saved,
        "map_path": output_png,
        "map_saved": map_saved,
        "fb_graphic_path": output_fb_png,
        "fb_graphic_saved": fb_saved,
        "forecasts": cebu_forecasts,
        "advisories": advisories,
        "special_alerts": special_alerts
    }
    print(json.dumps(output_data, indent=2))

if __name__ == "__main__":
    main()
