# Google Sheets Setup Guide

## Step 1: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Restaurant Orders" or whatever you prefer

## Step 2: Create the Products Sheet

1. Rename the first sheet to "Products"
2. Add the following headers in row 1:

| id | name | category | price | image | description | popular |
|----|------|----------|-------|-------|-------------|---------|

3. Add your products starting from row 2. Example:

| id | name | category | price | image | description | popular |
|----|------|----------|-------|-------|-------------|---------|
| 1 | Margherita Pizza | Pizza | 12.99 | assets/images/food/pepperoni.png | Classic tomato sauce, mozzarella, fresh basil | TRUE |
| 2 | Pepperoni Pizza | Pizza | 14.99 | assets/images/food/burgerpizza.png | Loaded with pepperoni and mozzarella | TRUE |
| 3 | BBQ Chicken Pizza | Pizza | 15.99 | assets/images/food/pepperoni.png | BBQ sauce, grilled chicken, red onions | FALSE |

**Important Notes:**
- `id` must be a number
- `price` must be a number (use decimal point, not comma)
- `popular` must be TRUE or FALSE
- `category` options: Pizza, Burgers, Pasta, Salads, Drinks, Desserts
- `image` path should match your actual image files in the assets folder

## Step 3: Create the Orders Sheet

1. Create a new sheet called "Orders"
2. Add the following headers in row 1:

| Timestamp | Order Number | Full Name | Email | Phone | Address | City | Barangay | Payment Method | Items | Subtotal | Delivery Fee | Tax | Total | Status |
|-----------|--------------|-----------|-------|-------|---------|------|----------|----------------|-------|----------|--------------|-----|-------|--------|

## Step 4: Set Up Google Apps Script

1. In your Google Sheet, click **Extensions** → **Apps Script**
2. Delete any existing code in the editor
3. Copy all the code from `GoogleAppsScript.js` file
4. Paste it into the Apps Script editor
5. Click **Save** (disk icon)
6. Name your project (e.g., "Restaurant API")

## Step 5: Deploy the Script

1. Click **Deploy** → **New deployment**
2. Click the gear icon ⚙️ next to "Select type"
3. Choose **Web app**
4. Configure the deployment:
   - **Description**: "Restaurant API v1"
   - **Execute as**: Me
   - **Who has access**: Anyone
5. Click **Deploy**
6. Click **Authorize access**
7. Choose your Google account
8. Click **Advanced** → **Go to [Your Project Name] (unsafe)**
9. Click **Allow**
10. **Copy the Web App URL** - it looks like:
    ```
    https://script.google.com/macros/s/[LONG_ID]/exec
    ```

## Step 6: Update Your React App

1. Open `src/App.jsx`
2. Find this line (around line 774):
   ```javascript
   const GOOGLE_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw.../exec';
   ```
3. Replace it with your new Web App URL from Step 5

## Testing

1. Test GET (Products):
   - Open your Web App URL in a browser
   - You should see JSON data with your products

2. Test POST (Orders):
   - Place a test order through your app
   - Check the Orders sheet for the new row

## Updating Products

To add/edit/remove products:
1. Simply update the Products sheet in Google Sheets
2. Refresh your web app to see the changes
3. No code deployment needed!

## Important Security Notes

- The script URL is public, but only you can edit the Google Sheet
- Orders are stored in your personal Google Sheet
- Consider setting up proper authentication for production use
- Do NOT share your script URL publicly if it contains sensitive data
