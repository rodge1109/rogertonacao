# Semaphore SMS Integration Guide

## Overview

Your restaurant ordering system now sends automatic SMS confirmations to customers after they place an order. This guide will help you set up Semaphore SMS integration.

## What Customers Receive

After placing an order, customers automatically receive an SMS like this:

```
Hi John Doe! Your order ORD-1706678400000 has been confirmed.
Total: Php 450.50. Payment: GCash.
We'll deliver to 123 Main St, Manila in 25-30 mins.
Thank you for ordering from Kuchefnero!
```

## Setup Instructions

### Step 1: Get Your Semaphore API Key

1. Visit [https://semaphore.co/](https://semaphore.co/)
2. Create an account or log in
3. Navigate to your account dashboard
4. Find your API key (it will look like: `a1b2c3d4e5f6g7h8i9j0`)
5. Copy the API key

### Step 2: Load Credits

1. In your Semaphore dashboard, add credits to your account
2. Pricing: Php 0.50 per SMS (160 characters)
3. Recommended starting amount: Php 500 (1,000 messages)

### Step 3: Configure Google Apps Script

1. Open your Google Sheets spreadsheet
2. Go to **Extensions > Apps Script**
3. Find the configuration section at the top of the script:

```javascript
// ===========================
// CONFIGURATION - SMS SETTINGS
// ===========================
const SEMAPHORE_API_KEY = 'YOUR_SEMAPHORE_API_KEY_HERE';
const SEMAPHORE_SENDER_NAME = 'Kuchefnero'; // Max 11 characters
const SMS_ENABLED = true; // Set to false to disable SMS notifications
```

4. Replace `'YOUR_SEMAPHORE_API_KEY_HERE'` with your actual API key:

```javascript
const SEMAPHORE_API_KEY = 'a1b2c3d4e5f6g7h8i9j0'; // Your actual key
```

5. **Optional**: Customize the sender name (max 11 characters):

```javascript
const SEMAPHORE_SENDER_NAME = 'MyRestro'; // Your custom name
```

6. Click **Save** (disk icon)
7. **Deploy** the updated script:
   - Click **Deploy > New deployment**
   - Or if already deployed: Click **Deploy > Manage deployments**
   - Click the **Edit** icon (pencil)
   - Under "Version", select **New version**
   - Click **Deploy**

### Step 4: Test the Integration

1. Place a test order through your website
2. Make sure to use a valid Philippine mobile number (e.g., 09171234567)
3. Complete the checkout process
4. Check if you receive the SMS confirmation

**Important Testing Notes:**
- Test messages (those starting with "TEST") are silently ignored by Semaphore
- Use a real phone number for testing
- Check your Semaphore dashboard for SMS logs and delivery status

## Phone Number Format

The system automatically handles these formats:
- `09171234567` → Converts to `639171234567`
- `9171234567` → Converts to `639171234567`
- `+639171234567` → Converts to `639171234567`
- `0917-123-4567` → Removes dashes, converts to `639171234567`

## SMS Message Template

The default message includes:
- Customer name
- Order number
- Total amount
- Payment method
- Delivery address and city
- Estimated delivery time
- Thank you message

### Customizing the SMS Message

To modify the message, edit the `smsMessage` in [GoogleAppsScript.js:212-214](GoogleAppsScript.js#L212-L214):

```javascript
const smsMessage = `Hi ${data.fullName}! Your order ${orderNumber} has been confirmed. Total: Php ${data.total}. Payment: ${data.paymentMethod}. We'll deliver to ${data.address}, ${data.city} in 25-30 mins. Thank you for ordering from Kuchefnero!`;
```

**Character Limit:**
- Standard SMS: 160 characters per message
- Messages longer than 160 characters are automatically split (charged per 160 chars)
- Keep messages concise to minimize costs

## Enable/Disable SMS

To temporarily disable SMS without removing your configuration:

```javascript
const SMS_ENABLED = false; // Set to false to disable
```

To re-enable:

```javascript
const SMS_ENABLED = true; // Set to true to enable
```

## Cost Management

### Estimated Costs
- 10 orders/day × 30 days = 300 SMS = Php 150/month
- 50 orders/day × 30 days = 1,500 SMS = Php 750/month
- 100 orders/day × 30 days = 3,000 SMS = Php 1,500/month

### Tips to Reduce Costs
1. Keep messages under 160 characters
2. Use abbreviations where appropriate
3. Monitor your Semaphore credit balance regularly
4. Set up low-balance alerts in your Semaphore dashboard

## Troubleshooting

### SMS Not Sending

**Issue:** Orders save but no SMS received

**Solutions:**
1. Check if `SMS_ENABLED = true`
2. Verify API key is correct (no extra spaces)
3. Check Semaphore credit balance
4. View Google Apps Script logs:
   - Open Apps Script editor
   - Click **Executions** (left sidebar)
   - Check for errors

### Invalid Phone Number

**Issue:** SMS fails due to phone number format

**Solutions:**
- Ensure phone number is Philippine mobile (starts with 09)
- Check that customer entered 11 digits (09XXXXXXXXX)
- System auto-converts, but validate input

### Rate Limiting

**Issue:** "Too many requests" error

**Solutions:**
- Semaphore limits: 120 requests per minute
- For high volume, contact Semaphore support for increased limits
- Consider batching during peak times

### Wrong Sender Name

**Issue:** SMS shows "SEMAPHORE" instead of your name

**Solutions:**
- Check `SEMAPHORE_SENDER_NAME` in configuration
- Sender name must be max 11 characters
- Redeploy script after changes

## Monitoring and Logs

### Google Apps Script Logs

1. Open Apps Script editor
2. Click **Executions** (left sidebar)
3. View all SMS sending attempts and results
4. Check for errors or failures

### Semaphore Dashboard

1. Log in to [https://semaphore.co/](https://semaphore.co/)
2. View your SMS logs
3. Check delivery status
4. Monitor credit balance
5. Download reports

## API Rate Limits

- **Standard calls:** 120 requests per minute
- **Multiple recipients:** Use comma-separated numbers in a single call
- For bulk operations, contact Semaphore support

## Security Best Practices

1. **Never commit API key to public repositories**
2. Store API key only in Google Apps Script (server-side)
3. Keep your Google account secure with 2FA
4. Regularly rotate your API key
5. Monitor usage for suspicious activity

## Advanced Features

### Priority Messages

For urgent/time-sensitive orders, use Semaphore's priority queue:
- Cost: 2 credits per SMS (Php 1.00)
- Bypasses regular queue
- Instant delivery

### OTP Messages

If you plan to add order verification:
- Dedicated OTP route
- 2 credits per SMS
- Better deliverability during high volume

## Support

### Semaphore Support
- Website: [https://semaphore.co/](https://semaphore.co/)
- Documentation: [https://semaphore.co/docs](https://semaphore.co/docs)
- Email: Check their website for contact details

### Common Questions

**Q: Can I send to multiple numbers per order?**
A: Yes, modify the script to include additional numbers (e.g., restaurant staff notification)

**Q: Can I use this outside the Philippines?**
A: Semaphore is optimized for Philippine numbers. For international, consider Twilio or similar

**Q: How do I track delivery status?**
A: Check Semaphore dashboard for real-time delivery reports

**Q: What if customer doesn't receive SMS?**
A: Check: 1) Phone number validity, 2) Network coverage, 3) Semaphore logs, 4) Credits balance

## Features Included

✅ Automatic SMS on order confirmation
✅ Philippine phone number auto-formatting
✅ Customizable sender name
✅ Customizable message template
✅ Error handling and logging
✅ Enable/disable toggle
✅ Credit-efficient single message per order
✅ Professional order confirmation format

## Example SMS Flow

1. Customer places order on website
2. Order saved to Google Sheets
3. System sends SMS via Semaphore API
4. Customer receives confirmation within seconds
5. Order number, total, and ETA included
6. Professional branded message with your restaurant name

## Next Steps

1. Get your Semaphore API key
2. Load initial credits (recommended: Php 500)
3. Configure Google Apps Script
4. Deploy the updated script
5. Test with a real order
6. Monitor your first few orders
7. Adjust message template if needed

## Need Help?

If you encounter issues:
1. Check this guide's Troubleshooting section
2. Review Google Apps Script execution logs
3. Check Semaphore dashboard for API errors
4. Verify your API key and credit balance
5. Test with different phone numbers

---

**Congratulations!** Your restaurant now has professional SMS order confirmations. 🎉📱
