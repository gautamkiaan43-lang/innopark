# 🔄 Development Mode - Auto Reload Setup

## Problem
Server bar bar restart karne se frontend disconnect ho jata hai.

## Solution
**Nodemon use karein** - ye automatically file changes detect karke server reload karta hai.

## Setup

### 1. Nodemon already installed hai
```bash
npm install  # agar nodemon missing ho to
```

### 2. Development mode start karein
```bash
cd crm-backend
npm run dev
```

### 3. Ab kya hoga?
- ✅ File save karte hi server automatically reload hoga
- ✅ Frontend disconnect nahi hoga
- ✅ Manual restart ki zarurat nahi
- ✅ Fast development

## Important Notes

### ✅ Auto-reload hoga:
- Controllers me changes
- Routes me changes  
- Config me changes
- Middleware me changes
- server.js me changes

### ❌ Manual restart zaruri hai:
- Database schema changes (migrations)
- .env file changes
- Package installation (npm install)

## Current Status
- ✅ nodemon.json config file ready
- ✅ npm run dev script ready
- ✅ Auto-watch enabled for all important folders

## Usage
**Ab se sirf `npm run dev` use karein** - manual restart ki zarurat nahi!

