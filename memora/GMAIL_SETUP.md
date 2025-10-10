# Gmail SMTP Setup Guide

## 📧 Using Gmail to Send Passcodes

You can use your Gmail account to send authentication emails directly.

---

## 🔑 Step 1: Enable 2-Factor Authentication

Gmail requires 2FA to create App Passwords.

1. Go to https://myaccount.google.com/security
2. Click on "2-Step Verification"
3. Follow the steps to enable it (you'll need your phone)

---

## 🔐 Step 2: Create App Password

**Important**: You CANNOT use your regular Gmail password. You must create an "App Password".

1. Go to https://myaccount.google.com/apppasswords

   - Or: Google Account → Security → 2-Step Verification → App passwords

2. You might need to sign in again

3. In "Select app" dropdown:

   - Choose "Mail" or "Other (Custom name)"
   - If "Other", type "Memora"

4. In "Select device" dropdown:

   - Choose "Other (Custom name)"
   - Type "Memora App"

5. Click "Generate"

6. **Copy the 16-character password** (looks like: `abcd efgh ijkl mnop`)
   - Remove the spaces: `abcdefghijklmnop`
   - You'll only see this once!

---

## ⚙️ Step 3: Configure Environment Variables

Create or update `.env.local` in your project root:

```bash
# Gmail SMTP Configuration
GMAIL_USER=philomela.zhang@gmail.com
GMAIL_APP_PASSWORD=zjotuavzedylislu
```

**Replace:**

- `your.email@gmail.com` with your actual Gmail address
- `abcdefghijklmnop` with your 16-character App Password (no spaces)

---

## 📦 Step 4: Install Dependencies

```bash
npm install
```

---

## 🚀 Step 5: Restart Server

```bash
npm run dev
```

---

## ✅ Test It!

1. Go to your app
2. Click "Get Started"
3. Enter any email address
4. Check that email's inbox for the code
5. The code should arrive within seconds!

---

## 🔍 Troubleshooting

### "Invalid login" error

- Make sure you're using the **App Password**, not your regular Gmail password
- Remove any spaces from the App Password
- Make sure 2FA is enabled on your Google account

### "Less secure app access" message

- You don't need to enable "Less secure app access"
- App Passwords work without this setting

### Emails not arriving

- Check spam folder
- Make sure `GMAIL_USER` is correct
- Verify App Password has no spaces
- Check server console for error messages

### Can't find App Passwords option

- Make sure 2-Step Verification is enabled first
- Try this direct link: https://myaccount.google.com/apppasswords
- If still not available, your organization might have disabled it

---

## 🔒 Security Notes

1. **Never commit `.env.local`** - It's already in `.gitignore`
2. **Don't share your App Password** - Treat it like a password
3. **Revoke unused App Passwords** - Go to App Passwords page and delete old ones
4. **Use a dedicated email** - Consider creating a separate Gmail for your app

---

## 📊 Gmail Sending Limits

- **Free Gmail**: ~500 emails per day
- **Google Workspace**: ~2,000 emails per day

For higher volume, consider SendGrid or AWS SES.

---

## 🆚 Gmail vs SendGrid

| Feature            | Gmail SMTP        | SendGrid               |
| ------------------ | ----------------- | ---------------------- |
| **Setup**          | 5 minutes         | 10 minutes             |
| **Cost**           | Free              | Free (100/day)         |
| **Daily Limit**    | 500 emails        | 100 emails (free tier) |
| **Deliverability** | Good              | Excellent              |
| **Analytics**      | No                | Yes                    |
| **Best For**       | Personal projects | Production apps        |

---

## 🎯 Quick Reference

### Environment Variables

```bash
GMAIL_USER=your.email@gmail.com
GMAIL_APP_PASSWORD=your16charpassword
```

### Where to Get Them

- **GMAIL_USER**: Your Gmail address
- **GMAIL_APP_PASSWORD**: https://myaccount.google.com/apppasswords

### Test Command

```bash
# Check if env vars are set
echo $GMAIL_USER
echo $GMAIL_APP_PASSWORD
```

---

## 🔄 Alternative: Use SendGrid with Gmail

You can also use SendGrid to send emails that **appear to come from your Gmail**:

1. Sign up for SendGrid (free)
2. Verify your Gmail address in SendGrid
3. Use SendGrid API (see `EMAIL_SETUP.md`)

This gives you better analytics and deliverability while keeping your Gmail as the sender!

---

## 📝 Summary

1. ✅ Enable 2FA on Google Account
2. ✅ Create App Password
3. ✅ Add to `.env.local`
4. ✅ Run `npm install`
5. ✅ Restart server
6. ✅ Test authentication

That's it! Your Gmail is now sending passcodes. 📬
