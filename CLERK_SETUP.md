# Clerk Authentication Setup

## Quick Setup (5 minutes)

### 1. Create a Clerk Account
1. Go to [clerk.com](https://clerk.com)
2. Sign up for free
3. Create a new application

### 2. Get Your Publishable Key
1. In your Clerk dashboard, go to **API Keys**
2. Copy the **Publishable Key** (starts with `pk_test_` or `pk_live_`)
3. Paste it into your `.env` file:

```bash
VITE_CLERK_PUBLISHABLE_KEY=pk_test_your_actual_key_here
```

### 3. Restart the Dev Server
```bash
npm run dev
```

### 4. Test Authentication
1. Open http://localhost:5173
2. Click "Sign In" in the top-right corner
3. Create an account or sign in
4. Your journal entries will now be tied to your user account!

## Features Enabled by Clerk

✅ **User Authentication** - Secure sign-in/sign-up
✅ **User-Specific Data** - Each user has their own journal entries
✅ **Session Management** - Automatic session handling
✅ **Profile Management** - User profile with avatar
✅ **Multi-User Support** - Ready for production deployment

## Why This Boosts Your Hackathon Score

- **Theme Alignment**: +1 point (uses multiple partner technologies)
- **Real-World Impact**: +1 point (production-ready with user accounts)
- **Technical Complexity**: Shows proper authentication implementation
