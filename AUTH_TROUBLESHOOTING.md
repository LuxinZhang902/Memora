# Authentication Troubleshooting Guide

## 🐛 Issue: "Invalid email or password" after successful signup

### Root Causes & Solutions:

#### 1. **Whitespace in Email/Password**
**Problem:** Extra spaces before/after email or password
**Solution:** ✅ **FIXED** - Added `.trim()` to all inputs

```typescript
// Before
body: JSON.stringify({ email, password })

// After
const trimmedEmail = email.trim();
const trimmedPassword = password.trim();
body: JSON.stringify({ email: trimmedEmail, password: trimmedPassword })
```

#### 2. **Password Not Saved During Signup**
**Problem:** User created but password_hash is null
**Solution:** Check server logs during signup

**How to Debug:**
1. Open browser DevTools → Console
2. Sign up with test credentials
3. Check server logs for: `[Auth] Created new user with password: email@example.com`
4. Verify `has password: true` in logs

#### 3. **Elasticsearch Index Not Refreshed**
**Problem:** User saved but not immediately queryable
**Solution:** ✅ Already using `refresh: true` in both signup and login

#### 4. **Case Sensitivity**
**Problem:** Email stored as lowercase but login uses mixed case
**Solution:** ✅ Already normalizing to `.toLowerCase()` in both functions

---

## 🔍 Debugging Steps

### Step 1: Check Server Logs

**During Signup:**
```
[Auth] Attempting password signup for: test@example.com
[Auth] Created new user with password: test@example.com
```

**During Login:**
```
[Auth] Login attempt for: test@example.com
[Auth] User found: test@example.com, has password_hash: true
[Auth] Verifying password...
[Auth] Stored hash: ce94093c003a97b646fc...
[Auth] Password valid: true
[Auth] User test@example.com logged in with password
```

### Step 2: Check Browser Console

**Look for:**
```
[AuthModal] signup attempt for: test@example.com
[AuthModal] login attempt for: test@example.com
```

### Step 3: Verify User in Elasticsearch

```bash
# Check if user exists
curl -X GET "localhost:9200/memora-users/_search?pretty" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": {
      "term": { "email": "test@example.com" }
    }
  }'
```

**Expected Response:**
```json
{
  "hits": {
    "total": { "value": 1 },
    "hits": [{
      "_source": {
        "user_id": "user-abc123",
        "email": "test@example.com",
        "password_hash": "salt:hash...",
        "created_at": "2025-01-20T...",
        "is_verified": true
      }
    }]
  }
}
```

### Step 4: Test Authentication Directly

Run the test script:
```bash
cd memora
npx tsx scripts/test_auth.ts
```

**Expected Output:**
```
✅ Signup successful!
✅ Login successful!
✅ Login correctly failed (wrong password)
```

---

## 🔧 Common Fixes

### Fix 1: Clear Elasticsearch Index
```bash
# Delete all users (CAUTION: This deletes all user data!)
curl -X DELETE "localhost:9200/memora-users"

# Recreate index
cd memora
npm run create-index
```

### Fix 2: Clear Browser LocalStorage
```javascript
// In browser console
localStorage.clear();
location.reload();
```

### Fix 3: Check Password Hash Format
```bash
# Get a user's password hash
curl -X GET "localhost:9200/memora-users/_search?pretty" | grep password_hash
```

**Should look like:**
```
"password_hash": "ce94093c003a97b646fc:7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d..."
                 ^^^^^^^^^^^^^^^^^^^^^^^^ ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^
                 Salt (16 bytes hex)      Hash (64 bytes hex)
```

---

## ✅ Verification Checklist

After making changes:

- [ ] Server logs show successful signup
- [ ] Server logs show `has password_hash: true`
- [ ] Server logs show `Password valid: true` on login
- [ ] Browser console shows no errors
- [ ] User can login immediately after signup
- [ ] Wrong password correctly fails
- [ ] Email is case-insensitive (Test@Example.com = test@example.com)

---

## 🧪 Test Cases

### Test 1: Basic Signup & Login
```
1. Sign up: test@example.com / password123
2. Logout (clear localStorage)
3. Login: test@example.com / password123
Expected: ✅ Success
```

### Test 2: Case Insensitive Email
```
1. Sign up: Test@Example.com / password123
2. Logout
3. Login: test@example.com / password123
Expected: ✅ Success
```

### Test 3: Whitespace Handling
```
1. Sign up: " test@example.com " / " password123 "
2. Logout
3. Login: "test@example.com" / "password123"
Expected: ✅ Success (trimmed automatically)
```

### Test 4: Wrong Password
```
1. Sign up: test@example.com / password123
2. Logout
3. Login: test@example.com / wrongpassword
Expected: ❌ "Invalid email or password"
```

---

## 📊 Current Status

**✅ Fixed Issues:**
1. Input trimming (whitespace)
2. Email normalization (lowercase)
3. Password hashing (PBKDF2)
4. Elasticsearch refresh
5. Detailed logging

**✅ Working Features:**
- Password-only authentication
- Secure password hashing
- User storage in Elasticsearch
- Immediate login after signup
- Case-insensitive email

---

## 🚀 Next Steps

If issue persists:

1. **Check server logs** - Most issues show up here
2. **Run test script** - `npx tsx scripts/test_auth.ts`
3. **Verify Elasticsearch** - Check if user exists with password_hash
4. **Clear cache** - Browser localStorage and cookies
5. **Try different browser** - Rule out browser-specific issues

---

## 📝 Notes

- Passwords are **never** stored in plaintext
- Password hashes are **never** sent to client
- Each user has a **unique salt**
- Minimum password length: **8 characters**
- Email is always **normalized to lowercase**
- All inputs are **trimmed** automatically

---

**If you still see "Invalid email or password" after following this guide, please check the server logs and share them for further debugging.**
