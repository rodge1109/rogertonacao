# Google Sheets Integration - Complete Setup Guide

## Overview

Your restaurant ordering system now fetches products directly from Google Sheets! This means you can update your menu without touching any code.

## Files Created

1. **GoogleAppsScript.js** - Copy this code into Google Apps Script
2. **GOOGLE_SHEETS_SETUP.md** - Detailed setup instructions
3. **SAMPLE_PRODUCTS.csv** - Sample product data to import into Google Sheets
4. **App.jsx** - Updated to fetch products from Google Sheets

## Quick Start

### 1. Set Up Google Sheet

1. Create a new Google Sheet
2. Create two sheets (tabs):
   - **Products** - for your menu items
   - **Orders** - for customer orders (already working)

### 2. Import Sample Data

**Option A: Copy from CSV**
1. Open `SAMPLE_PRODUCTS.csv`
2. Copy all content
3. In Google Sheets, paste into the Products sheet

**Option B: Manual Entry**
In the Products sheet, add these column headers in Row 1:
- id
- name
- category
- price
- image
- description
- popular

Then add your products starting from Row 2.

### 3. Deploy Google Apps Script

1. In Google Sheets: **Extensions → Apps Script**
2. Delete existing code
3. Copy **ALL** code from `GoogleAppsScript.js`
4. Paste into the script editor
5. Save (Ctrl+S or disk icon)
6. Click **Deploy → New deployment**
7. Select type: **Web app**
8. Settings:
   - Execute as: **Me**
   - Who has access: **Anyone**
9. Click **Deploy**
10. Authorize the app when prompted
11. **COPY THE WEB APP URL** (looks like: `https://script.google.com/macros/s/...long-id.../exec`)

### 4. Update Your React App

1. Open `src/App.jsx`
2. Find line ~15:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/...old-url.../exec';
   ```
3. Replace with your new Web App URL from step 3

### 5. Test It!

1. Save all files
2. Restart your development server if needed
3. Open your app - it should now load products from Google Sheets!
4. Try updating a product in Google Sheets and refresh your app

## How It Works

### Loading Products
1. App loads → Fetches products from Google Sheets
2. Shows loading spinner while fetching
3. Displays products when loaded
4. Falls back to hardcoded data if fetch fails

### Adding/Updating Products
1. Edit Google Sheets Products tab
2. Refresh web app to see changes
3. No code deployment needed!

### Product Data Format

Each product needs:
- **id**: Unique number (1, 2, 3, etc.)
- **name**: Product name (e.g., "Margherita Pizza")
- **category**: One of: Pizza, Burgers, Pasta, Salads, Drinks, Desserts
- **price**: Number with decimals (e.g., 12.99)
- **image**: Path to image (e.g., "assets/images/food/pepperoni.png")
- **description**: Short description
- **popular**: TRUE or FALSE (determines if shown in "Popular Now")

## Important Notes

### Categories
Your app supports these categories:
- All
- Pizza
- Burgers
- Pasta
- Salads
- Drinks
- Desserts

Make sure products use exactly these category names!

### Popular Items
- Set `popular` to TRUE for items you want in the "Popular Now" section
- The app shows the first 6 popular items
- At least a few items should be marked as popular

### Images
- Image paths should match your actual image files
- Format: `assets/images/food/filename.png`
- Make sure images exist in your public/assets/images/food/ folder

### Prices
- Use decimal point (12.99) not comma
- Don't include currency symbol (Php) in the sheet
- The app adds "Php" automatically

## Troubleshooting

### Products not loading?
1. Check browser console for errors (F12 → Console)
2. Verify Google Apps Script URL is correct in App.jsx
3. Test the script URL directly in browser - should return JSON
4. Make sure script is deployed as "Anyone" can access

### "Loading menu..." forever?
- Script URL might be wrong
- Google Apps Script might not be deployed
- Check if Products sheet exists and has data
- App will use fallback data if fetch fails

### Changes not showing?
- Hard refresh the page (Ctrl+F5 or Cmd+Shift+R)
- Clear browser cache
- Make sure you saved changes in Google Sheets
- Verify column names are lowercase in the script

### Script errors?
- Make sure Products sheet name is exact: "Products"
- Check that all column headers are present
- Verify no empty rows between data

## Benefits

✅ Update menu without coding
✅ Change prices instantly
✅ Add/remove items easily
✅ No app redeployment needed
✅ Non-technical staff can manage menu
✅ All data in one place (Google Sheets)

## Security

- Your Google Sheet is private (only you can edit)
- The script URL is public but read-only for products
- Orders are saved to your private Google Sheet
- Consider authentication for production use

## Next Steps

Once everything works:
1. Replace sample products with your actual menu
2. Update image paths to your actual images
3. Set correct prices and categories
4. Mark your popular items
5. Test ordering flow end-to-end

Need help? Check `GOOGLE_SHEETS_SETUP.md` for detailed instructions!
