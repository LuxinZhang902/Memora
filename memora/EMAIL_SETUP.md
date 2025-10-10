# Email Setup Guide for Memora

## 🔍 Current Behavior

Right now, passcodes are **only logged to your server console** (not sent to actual email). This is intentional for development.

When you request a passcode, look in your terminal where `npm run dev` is running for:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 Email to: your@email.com
🔐 Your Memora login code: 123456
⏰ Expires in 10 minutes
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Copy the 6-digit code and paste it into the verification form.

---

## 📧 Enable Real Email Sending

To send actual emails, you need to set up an email service. Here are your options:

### Option 1: SendGrid (Recommended)

SendGrid offers a free tier with 100 emails/day.

#### Step 1: Create SendGrid Account
1. Go to https://sendgrid.com/
2. Sign up for a free account
3. Verify your email address

#### Step 2: Create API Key
1. Go to Settings → API Keys
2. Click "Create API Key"
3. Name it "Memora Auth"
4. Select "Full Access" or "Mail Send" permission
5. Copy the API key (you'll only see it once!)

#### Step 3: Verify Sender Email
1. Go to Settings → Sender Authentication
2. Click "Verify a Single Sender"
3. Fill in your details (use your real email)
4. Verify the email SendGrid sends you

#### Step 4: Add Environment Variables
Create or update `.env.local` in your project root:

```bash
# SendGrid Configuration
SENDGRID_API_KEY=SG.your_api_key_here
SENDGRID_FROM_EMAIL=your-verified-email@example.com
```

#### Step 5: Install Dependencies
```bash
npm install
```

#### Step 6: Restart Server
```bash
npm run dev
```

Now emails will be sent automatically! 🎉

---

### Option 2: AWS SES (Amazon Simple Email Service)

Good for production, requires AWS account.

#### Setup Steps:
1. Create AWS account
2. Go to AWS SES console
3. Verify your email/domain
4. Create SMTP credentials
5. Install `nodemailer`:
   ```bash
   npm install nodemailer
   ```

6. Update `lib/auth.ts` to use nodemailer:
   ```typescript
   const nodemailer = require('nodemailer');
   
   const transporter = nodemailer.createTransport({
     host: 'email-smtp.us-east-1.amazonaws.com',
     port: 587,
     secure: false,
     auth: {
       user: process.env.AWS_SES_USERNAME,
       pass: process.env.AWS_SES_PASSWORD,
     },
   });
   
   await transporter.sendMail({
     from: process.env.FROM_EMAIL,
     to: email,
     subject: `Your Memora ${type} code`,
     html: `Your code is: ${code}`,
   });
   ```

---

### Option 3: Resend (Modern Alternative)

Resend is a developer-friendly email API with a generous free tier.

#### Setup Steps:
1. Go to https://resend.com/
2. Sign up and verify your email
3. Get your API key
4. Install package:
   ```bash
   npm install resend
   ```

5. Update `lib/auth.ts`:
   ```typescript
   import { Resend } from 'resend';
   
   const resend = new Resend(process.env.RESEND_API_KEY);
   
   await resend.emails.send({
     from: 'Memora <onboarding@resend.dev>',
     to: email,
     subject: `Your Memora ${type} code`,
     html: `Your code is: ${code}`,
   });
   ```

---

## 🧪 Testing Email Delivery

### 1. Check Server Logs
Always check your terminal for email sending status:
- ✅ `[Email] Successfully sent login code to user@example.com`
- ❌ `[Email] Failed to send via SendGrid: ...`

### 2. Check Spam Folder
First-time emails often go to spam. Check your spam folder!

### 3. SendGrid Activity Feed
Go to SendGrid dashboard → Activity Feed to see delivery status.

### 4. Test with Your Own Email
Use your own email address to test before going live.

---

## 🚨 Troubleshooting

### "SendGrid not configured" message
- Make sure `.env.local` exists in project root
- Verify environment variables are set correctly
- Restart your dev server after adding env vars

### Emails not arriving
- Check spam folder
- Verify sender email in SendGrid
- Check SendGrid Activity Feed for errors
- Make sure you're using the verified sender email

### API Key errors
- Make sure you copied the full API key
- API keys start with `SG.`
- Don't commit API keys to git!

---

## 🔒 Security Best Practices

1. **Never commit API keys** - Add `.env.local` to `.gitignore`
2. **Use environment variables** - Never hardcode credentials
3. **Rotate keys regularly** - Change API keys every few months
4. **Monitor usage** - Check SendGrid dashboard for suspicious activity
5. **Rate limiting** - Consider adding rate limits to prevent abuse

---

## 📊 Email Service Comparison

| Service | Free Tier | Pros | Cons |
|---------|-----------|------|------|
| **SendGrid** | 100/day | Easy setup, good docs | Requires sender verification |
| **AWS SES** | 62,000/month | Very cheap, scalable | Complex setup, AWS account needed |
| **Resend** | 3,000/month | Modern API, great DX | Newer service |
| **Mailgun** | 5,000/month | Reliable, feature-rich | Requires credit card |

---

## 🎯 Recommended Setup

For **development/testing**: Use console logging (current setup)

For **production**: Use SendGrid or Resend
- Easy to set up
- Generous free tier
- Good deliverability
- Great documentation

---

## 📝 Next Steps

1. Install dependencies: `npm install`
2. Choose an email service (SendGrid recommended)
3. Get API key and verify sender
4. Add environment variables
5. Restart server
6. Test with your email
7. Deploy! 🚀
