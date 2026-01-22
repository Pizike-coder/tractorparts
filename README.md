# Product Catalog Webpage

A one-page website that automatically loads and displays data from Google Sheets with order functionality.

## Features

- ✅ Automatically loads data from Google Sheets (columns A, B, C, D, rows 1-2000)
- ✅ Daily auto-refresh (updates every 24 hours)
- ✅ Checkbox selection for each row
- ✅ Fixed contacts bar that remains visible while scrolling
- ✅ Order form with selected items display
- ✅ Email integration for order submission

## Setup Instructions

### 1. Basic Setup
Simply open `index.html` in a web browser. The page will automatically fetch data from the Google Sheets URL.

### 2. Email Configuration (Optional but Recommended)

For reliable email delivery, set up EmailJS:

1. **Sign up for EmailJS**: Go to https://www.emailjs.com/ and create a free account
2. **Add Email Service**: 
   - Go to "Email Services" and add Gmail (or your preferred email service)
   - Connect your email account
3. **Create Email Template**:
   - Go to "Email Templates"
   - Create a new template with these variables:
     - `{{to_email}}` - Recipient email (kaia@intrac.ee)
     - `{{from_name}}` - Customer name
     - `{{from_email}}` - Customer email
     - `{{company}}` - Company name
     - `{{phone}}` - Phone number
     - `{{items}}` - Selected items list
     - `{{message}}` - Full order message
4. **Update Configuration**:
   - Open `script.js`
   - Replace the placeholder values in `EMAILJS_CONFIG`:
     ```javascript
     const EMAILJS_CONFIG = {
         USER_ID: 'your_user_id_here',
         SERVICE_ID: 'your_service_id_here',
         TEMPLATE_ID: 'your_template_id_here'
     };
     ```

### 3. Fallback Email Method

If EmailJS is not configured, the form will use a `mailto:` link as a fallback. This opens the user's default email client with pre-filled information.

## File Structure

- `index.html` - Main webpage structure
- `styles.css` - Styling and layout
- `script.js` - JavaScript functionality
- `README.md` - This file

## Usage

1. Open `index.html` in a web browser
2. Wait for data to load from Google Sheets
3. Select items using the checkboxes
4. Click on the email address (epood@intrac.ee) in the contacts bar
5. Fill in the order form with your details
6. Click "Order Now" to submit

## Notes

- The page automatically refreshes data every 24 hours
- The contacts bar remains fixed at the top while scrolling
- Selected items are displayed in the order form
- All form fields are required before submission

## Browser Compatibility

Works in all modern browsers (Chrome, Firefox, Safari, Edge).
