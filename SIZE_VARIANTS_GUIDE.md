# Product Size Variants - Complete Guide

## Overview

Your restaurant ordering system now supports products with multiple sizes and prices! This feature allows customers to select their preferred size (Small, Medium, Large, etc.) before adding items to their cart.

## How It Works

### For Users:
1. **Browse Products**: Products with multiple sizes show "From Php X.XX" (lowest price)
2. **Click ADD Button**: A size selection modal appears
3. **Select Size**: Choose the desired size (each size has its own price)
4. **Confirmation**: Item is added to cart with the selected size
5. **Cart Display**: Each item shows its selected size (e.g., "Margherita Pizza (Large)")

### For Administrators:

## Product Data Structure

### Products WITH Sizes (e.g., Pizzas)
```javascript
{
  id: 1,
  name: 'Margherita Pizza',
  category: 'Pizza',
  sizes: [
    { name: 'Small', price: 10.99 },
    { name: 'Medium', price: 12.99 },
    { name: 'Large', price: 15.99 }
  ],
  image: 'assets/images/food/pepperoni.png',
  description: 'Classic tomato sauce, mozzarella, fresh basil',
  popular: true
}
```

### Products WITHOUT Sizes (e.g., Burgers, Drinks)
```javascript
{
  id: 5,
  name: 'Classic Burger',
  category: 'Burgers',
  price: 9.99,
  image: 'assets/images/food/pepperoni.png',
  description: 'Beef patty, lettuce, tomato, cheese',
  popular: true
}
```

## Google Sheets Setup

### Option 1: Using Separate Columns for Each Size

**Products Sheet Structure:**
| id | name | category | image | description | popular | small_price | medium_price | large_price |
|----|------|----------|-------|-------------|---------|-------------|--------------|-------------|
| 1  | Margherita Pizza | Pizza | assets/images/food/pepperoni.png | Classic tomato... | TRUE | 10.99 | 12.99 | 15.99 |
| 2  | Classic Burger | Burgers | assets/images/food/burger.png | Beef patty... | TRUE | | 9.99 | |

**Important Notes:**
- If a product has size columns (small_price, medium_price, large_price), leave the regular `price` column empty
- If only ONE size price is filled (e.g., only medium_price), the product won't have sizes - it uses that as the fixed price
- To add a product WITHOUT sizes (like burgers), leave all size columns empty and use the `price` column

### Option 2: Using JSON Format in a Single Column

**Products Sheet Structure:**
| id | name | category | price | sizes_json | image | description | popular |
|----|------|----------|-------|------------|-------|-------------|---------|
| 1  | Margherita Pizza | Pizza | | [{"name":"Small","price":10.99},{"name":"Medium","price":12.99},{"name":"Large","price":15.99}] | assets/images/food/pepperoni.png | Classic tomato... | TRUE |
| 2  | Classic Burger | Burgers | 9.99 | | assets/images/food/burger.png | Beef patty... | TRUE |

## Updated Google Apps Script

Update your GoogleAppsScript.js to handle sizes:

```javascript
function doGet(e) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Products');
  const data = sheet.getDataRange().getValues();
  const headers = data[0].map(h => h.toLowerCase());

  const products = [];
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const product = {};

    // Map basic fields
    headers.forEach((header, index) => {
      if (header === 'id' || header === 'popular') {
        product[header] = row[index];
      } else if (header !== 'small_price' && header !== 'medium_price' && header !== 'large_price' && header !== 'price' && header !== 'sizes_json') {
        product[header] = row[index];
      }
    });

    // Handle sizes
    const smallIdx = headers.indexOf('small_price');
    const mediumIdx = headers.indexOf('medium_price');
    const largeIdx = headers.indexOf('large_price');
    const priceIdx = headers.indexOf('price');
    const sizesJsonIdx = headers.indexOf('sizes_json');

    // Check if product has size variants
    if (sizesJsonIdx >= 0 && row[sizesJsonIdx]) {
      // Parse JSON format
      try {
        product.sizes = JSON.parse(row[sizesJsonIdx]);
      } catch (e) {
        // If JSON parsing fails, fall back to single price
        product.price = row[priceIdx] || 0;
      }
    } else if (smallIdx >= 0 && mediumIdx >= 0 && largeIdx >= 0) {
      // Check if any size prices exist
      const hasSmall = row[smallIdx] && row[smallIdx] !== '';
      const hasMedium = row[mediumIdx] && row[mediumIdx] !== '';
      const hasLarge = row[largeIdx] && row[largeIdx] !== '';

      if (hasSmall || hasMedium || hasLarge) {
        product.sizes = [];
        if (hasSmall) product.sizes.push({ name: 'Small', price: Number(row[smallIdx]) });
        if (hasMedium) product.sizes.push({ name: 'Medium', price: Number(row[mediumIdx]) });
        if (hasLarge) product.sizes.push({ name: 'Large', price: Number(row[largeIdx]) });
      } else {
        // No sizes, use regular price
        product.price = Number(row[priceIdx]) || 0;
      }
    } else {
      // No size columns, use regular price
      product.price = Number(row[priceIdx]) || 0;
    }

    products.push(product);
  }

  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    products: products
  })).setMimeType(ContentService.MimeType.JSON);
}

// Handle orders (POST requests remain the same)
function doPost(e) {
  // ... existing order handling code ...
}
```

## Features

### Size Selection Modal
- Clean, user-friendly modal dialog
- Shows product name
- Lists all available sizes with prices
- Easy tap/click selection
- Closes with X button or after selection

### Cart Management
- Items with different sizes are tracked separately
- "Margherita Pizza (Small)" and "Margherita Pizza (Large)" are separate cart entries
- Each has its own quantity counter
- Size displayed clearly under product name

### Order Details
- Orders include size information
- Format: "Margherita Pizza (Large) (x2) - Php 31.98"
- Sent to Google Sheets for tracking

## Examples

### Pizza Shop Setup
```
Small: Php 10.99
Medium: Php 12.99
Large: Php 15.99
Extra Large: Php 18.99
```

### Drink Shop Setup
```
12 oz: Php 3.99
16 oz: Php 4.99
20 oz: Php 5.99
```

### Customizable Products
```
Personal: Php 8.99
Family: Php 15.99
Party: Php 24.99
```

## Benefits

✅ Flexible pricing for different product sizes
✅ Clear size selection process
✅ Proper cart tracking (different sizes = different entries)
✅ Works seamlessly with existing single-price products
✅ No code changes needed - just update Google Sheets
✅ Professional user experience

## Backwards Compatibility

Products without the `sizes` field work exactly as before:
- Show single price
- Add directly to cart (no modal)
- No size selection needed

## Tips

1. **Consistent Naming**: Use consistent size names (Small, Medium, Large) across products
2. **Price Strategy**: Make sure price differences make sense (Medium should be more than Small)
3. **Testing**: Test with different combinations to ensure proper tracking
4. **Images**: All size variants of a product share the same image
5. **Description**: Keep descriptions generic (don't mention specific sizes)

## Troubleshooting

**Modal doesn't appear:**
- Check that product has `sizes` array with at least one size
- Verify sizes array format: `[{name: "Small", price: 10.99}, ...]`

**Wrong price shown:**
- Products with sizes show "From Php X.XX" (lowest price)
- Modal shows individual prices for each size

**Cart issues:**
- Each size is a separate cart item
- Changing size = different item (by design)
- Quantities are tracked per size

## Current Implementation

The fallback data currently has:
- **Pizzas (ids 1-4)**: All have 3 sizes (Small, Medium, Large)
- **Other products (ids 5-20)**: Single price (no sizes)

You can customize this by editing Google Sheets!
