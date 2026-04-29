# 🚀 Production Deployment Guide - TnP Connect

> **Fastest way to deploy for evaluator demonstration**
> **Estimated Time:** 30-45 minutes  
> **Platforms:** Render (Backend + DB) + Netlify (Frontend)

---

## 📋 QUICK OVERVIEW

### Recommended Architecture for Demo:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│   FRONTEND      │         │    BACKEND      │         │    DATABASE     │
│   (Angular)     │────────▶│   (Spring Boot) │────────▶│   (PostgreSQL)  │
│                 │  CORS   │                 │         │                 │
│  Netlify        │         │  Render.com     │         │  Render.com     │
│  (Free CDN)     │         │  (Free Tier)    │         │  (Free Tier)    │
└─────────────────┘         └─────────────────┘         └─────────────────┘
                                    │
                                    ▼
                          ┌─────────────────┐
                          │  FILE STORAGE   │
                          │  (Optional)    │
                          │  AWS S3/Local   │
                          └─────────────────┘
```

**Why this combo?**
- ✅ **Netlify** = Fastest Angular deployment (drag & drop)
- ✅ **Render** = Free PostgreSQL + Spring Boot hosting
- ✅ **Both free tiers** = $0 cost for demo

---

## ⚡ STEP 1: Prepare Your Code (5 minutes)

### 1.1 Backend - Add CORS Configuration

Create this file if not exists: `backend/src/main/java/com/fsd_CSE/TnP_Connect/config/CorsConfig.java`

```java
package com.fsd_CSE.TnP_Connect.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class CorsConfig {
    
    @Bean
    public WebMvcConfigurer corsConfigurer() {
        return new WebMvcConfigurer() {
            @Override
            public void addCorsMappings(CorsRegistry registry) {
                registry.addMapping("/api/**")
                        .allowedOrigins(
                            "http://localhost:4200",                           // Local dev
                            "https://tnp-connect-demo.netlify.app",          // Your Netlify URL (change this)
                            "https://*.netlify.app"                          // Any Netlify subdomain
                        )
                        .allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS")
                        .allowedHeaders("*")
                        .allowCredentials(true)
                        .maxAge(3600);
            }
        };
    }
}
```

**Why CORS?** Browser security prevents frontend on Netlify from calling backend on Render directly. CORS allows it.

---

### 1.2 Backend - Update `application.properties` for Production

Create `application-prod.properties` in `backend/src/main/resources/`:

```properties
# Production Profile - Render.com

# ===================================================================
# Database (Will be set by Render Environment Variables)
# ===================================================================
spring.datasource.url=${DATABASE_URL}
spring.datasource.username=${DB_USERNAME}
spring.datasource.password=${DB_PASSWORD}

# ===================================================================
# JPA/Hibernate
# ===================================================================
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false
spring.jpa.properties.hibernate.dialect=org.hibernate.dialect.PostgreSQLDialect

# ===================================================================
# File Upload (Render has ephemeral storage - files lost on restart)
# ===================================================================
spring.servlet.multipart.enabled=true
spring.servlet.multipart.max-file-size=10MB
spring.servlet.multipart.max-request-size=10MB
file.upload-dir=/tmp/uploads

# ===================================================================
# Server
# ===================================================================
server.port=${PORT:8080}

# ===================================================================
# API Keys (Set via Environment Variables - NEVER commit real keys)
# ===================================================================
brevo.api.key=${BREVO_API_KEY}
brevo.sender.email=${BREVO_SENDER_EMAIL}
brevo.sender.name=${BREVO_SENDER_NAME}

ai.gemini.api-key=${GEMINI_API_KEY}
ai.gemini.model=gemini-2.5-flash

# ===================================================================
# JWT Secret (Set via Environment Variable)
# ===================================================================
jwt.secret=${JWT_SECRET}
```

**⚠️ IMPORTANT:** Update `application.properties` to NOT expose secrets:

```properties
# Local development only
spring.profiles.active=dev

# Keep other local settings...
```

---

### 1.3 Frontend - Update API URLs for Production

**Option A: Environment Variables (Recommended)**

Edit `frontend2/src/environments/environment.prod.ts`:

```typescript
export const environment = {
  production: true,
  apiUrl: 'https://tnp-connect-api.onrender.com/api',  // Your Render backend URL
  geminiApiKey: 'YOUR_GEMINI_API_KEY'  // If using client-side AI features
};
```

Also update `frontend2/src/environments/environment.ts` for local:

```typescript
export const environment = {
  production: false,
  apiUrl: '/api'  // Uses proxy for local dev
};
```

**Option B: Update Services Directly (Quick but messy)**

If no environment files exist, update all service files:

```typescript
// In admin-dashboard.service.ts, student-dashboard.service.ts, auth.service.ts

// Change this:
private apiUrl = '/api';

// To this for production:
private apiUrl = 'https://tnp-connect-api.onrender.com/api';
```

**⚠️ Only do this temporarily - use environment files for proper solution!**

---

### 1.4 Frontend - Build for Production

```bash
# Navigate to frontend directory
cd frontend2

# Install dependencies (if not done)
npm install

# Build for production
ng build --configuration production

# Output will be in dist/frontend2/browser/
```

---

## ⚡ STEP 2: Deploy Database + Backend to Render (15 minutes)

### 2.1 Create Render Account
1. Go to https://render.com
2. Sign up with GitHub (fastest)
3. Verify email

### 2.2 Create PostgreSQL Database
1. Dashboard → **New +** → **PostgreSQL**
2. Name: `tnp-connect-db`
3. Region: Choose closest to you (Singapore for India)
4. Plan: **Free** ($0/month)
5. Click **Create Database**

**Save these credentials (you'll need them):**
```
Hostname: tnp-connect-db-xxx.render.com
Port: 5432
Database: tnp_connect_db
Username: tnp_connect_user
Password: [auto-generated, copy this!]
Internal Database URL: postgres://... [Copy this full URL]
```

### 2.3 Deploy Spring Boot Backend

**Method A: Deploy from GitHub (Recommended)**

1. Push your code to GitHub (if not already)
2. Render Dashboard → **New +** → **Web Service**
3. Connect your GitHub repository
4. Configure:
   - **Name**: `tnp-connect-api`
   - **Region**: Same as database
   - **Branch**: `main` (or your branch)
   - **Runtime**: `Java`
   - **Build Command**: `./mvnw clean package -DskipTests`
   - **Start Command**: `java -jar target/*.jar --spring.profiles.active=prod`
   - **Plan**: Free

5. Click **Advanced** and add Environment Variables:

| Variable | Value |
|----------|-------|
| `DATABASE_URL` | `jdbc:postgresql://hostname:5432/dbname` (from step 2.2) |
| `DB_USERNAME` | Username from step 2.2 |
| `DB_PASSWORD` | Password from step 2.2 |
| `JWT_SECRET` | Generate: `openssl rand -base64 32` (any long random string) |
| `GEMINI_API_KEY` | `AIzaSyBcQlHyayKnjerhE-PJY8YQlixU01ATqsI` (your key) |
| `BREVO_API_KEY` | `xkeysib-...` (your key) or skip email for demo |
| `BREVO_SENDER_EMAIL` | `rajrai092004@gmail.com` |
| `PORT` | `8080` |

6. Click **Create Web Service**

**Method B: Manual Deploy (No Git)**

1. Build JAR locally:
```bash
cd backend
./mvnw clean package -DskipTests
```

2. Render Dashboard → **New +** → **Web Service**
3. At bottom: **Deploy an existing image** or use Docker
4. Upload JAR (more complex - use Git method instead)

---

### 2.4 Test Backend Deployment

Once deployed, your backend URL will be:
```
https://tnp-connect-api.onrender.com
```

Test these endpoints:
```bash
# Health check
curl https://tnp-connect-api.onrender.com/api/sessions/

# Should return JSON (possibly empty array [] which is fine)
```

**⚠️ First startup takes 2-3 minutes (free tier sleeps when idle)**

---

## ⚡ STEP 3: Deploy Frontend to Netlify (10 minutes)

### 3.1 Create Netlify Account
1. Go to https://netlify.com
2. Sign up with GitHub
3. Verify email

### 3.2 Deploy Angular App

**Method A: Drag & Drop (Fastest for Demo)**

1. Build your Angular app (from Step 1.4):
```bash
cd frontend2
ng build --configuration production
```

2. Go to `frontend2/dist/frontend2/browser/` folder
3. Select all files, create ZIP: `frontend.zip`
4. Netlify Dashboard → **Sites** → **Add new site** → **Deploy manually**
5. Drag & drop your `frontend.zip`
6. Done! Get your URL: `https://tnp-connect-demo-xxx.netlify.app`

**Method B: Git Deploy (Better for updates)**

1. Push `frontend2/dist` to GitHub (or separate repo)
2. Netlify → **Add new site** → **Import from Git**
3. Select repository
4. Build settings:
   - **Build command**: `cd frontend2 && npm install && ng build --configuration production`
   - **Publish directory**: `frontend2/dist/frontend2/browser`
5. Click **Deploy**

### 3.3 Update CORS with Netlify URL

Go back to your `CorsConfig.java`:
```java
.allowedOrigins(
    "http://localhost:4200",
    "https://tnp-connect-demo-xxx.netlify.app",  // ← UPDATE THIS!
    "https://*.netlify.app"
)
```

Commit, push, and re-deploy backend on Render.

---

## ⚡ STEP 4: Configure Domain & HTTPS (5 minutes)

### 4.1 Custom Domain (Optional but Professional)

**Free option:**
1. Get free subdomain from https://freenom.com (e.g., `tnp-demo.tk`)
2. Netlify: Site settings → Domain management → Add custom domain
3. Render: Web service settings → Custom domain
4. Update DNS records as instructed

**Easier option:**
- Use Netlify's generated URL (looks like: `https://tnp-connect-5a3b2c.netlify.app`)
- It's professional enough for evaluators

### 4.2 HTTPS (Auto-enabled)
- Both Netlify and Render provide free HTTPS automatically
- No action needed! 🔒

---

## ⚡ STEP 5: Production Fixes for File Uploads (Important!)

### Problem: File Storage on Render

**Issue:** Render's free tier has **ephemeral storage** — files are deleted when service restarts (happens every 15 mins of inactivity on free tier).

### Solution Options:

**Option A: Use AWS S3 (Recommended for real production)**

1. Create AWS account: https://aws.amazon.com
2. Create S3 bucket
3. Add dependency to `pom.xml`:
```xml
<dependency>
    <groupId>com.amazonaws</groupId>
    <artifactId>aws-java-sdk-s3</artifactId>
    <version>1.12.500</version>
</dependency>
```

4. Create `S3Service.java` to replace `FileController.java` for uploads

**Option B: Disable File Upload for Demo (Fastest)**

Simply don't demonstrate file uploads during evaluation:
- Skip resume upload feature
- Use external links for resources (Google Drive links)
- Focus on other features (Sessions, Contests, AI Chat)

**Option C: Use Base64 Images (Hack)**

Store small images as base64 in database (not recommended for production, but works for demo).

---

## ⚡ STEP 6: Quick Production Checklist

Before evaluator demo, verify:

### ✅ Backend Health
```bash
curl https://your-backend.onrender.com/api/sessions/
# Should return [] or JSON data
```

### ✅ Frontend Loads
```
Open https://your-frontend.netlify.app
Should show login page without console errors
```

### ✅ Database Connected
- Login as student/admin
- Create a test session
- Refresh page — data should persist

### ✅ CORS Working
- Browser console should show NO CORS errors
- API calls should return 200 OK

### ✅ AI Features (if demonstrating)
- Gemini API key should be set in environment variables
- Chatbot should respond

---

## 🎯 FASTEST DEPLOYMENT (Emergency Mode - 15 minutes)

If you're in a hurry, skip file uploads:

### Minimal Deploy (No File Storage)

1. **Comment out FileController endpoints** in backend
2. **Use external links** for all resources (Google Drive, etc.)
3. **Skip resume upload** feature during demo
4. **Deploy backend to Render** (5 min)
5. **Deploy frontend to Netlify** (5 min)
6. **Update CORS** and redeploy (5 min)

**Demo Strategy:**
- Show Auth, Sessions, Contests, AI Chatbot
- Skip: Resume upload, Profile pictures, Resource PDF uploads
- Use: External links for everything

---

## 🔧 Environment Variables Summary

### Render Backend Environment Variables:

```bash
# Database (from Render PostgreSQL dashboard)
DATABASE_URL=jdbc:postgresql://dpg-xxx.render.com:5432/tnp_connect_xxx
DB_USERNAME=tnp_connect_user
DB_PASSWORD=[copy from dashboard]

# Security (generate new)
JWT_SECRET=your-super-secret-jwt-key-min-32-chars-long

# AI (your existing key)
GEMINI_API_KEY=AIzaSyBcQlHyayKnjerhE-PJY8YQlixU01ATqsI

# Email (optional for demo)
BREVO_API_KEY=your-brevo-key
BREVO_SENDER_EMAIL=rajrai092004@gmail.com

# Server
PORT=8080
```

### Netlify Build Environment (if using Git):

```bash
NG_CLI_ENVIRONMENT=production
```

---

## 📱 Post-Deploy Testing Script

Test this sequence before evaluators arrive:

```
1. Open frontend URL
2. Register a new student account
3. Login as student
4. View Sessions → Should load
5. Register for a session
6. View Contests → Should show contests
7. Open AI Assistant → Ask "What is DSA?"
8. Login as Admin
9. Create a new session
10. Verify student sees new session
```

---

## 🚨 Troubleshooting

### Issue: CORS errors in browser
**Fix:** Update `CorsConfig.java` with exact Netlify URL, redeploy backend

### Issue: Database connection failed
**Fix:** Check DATABASE_URL format — should be full JDBC URL with hostname, not `localhost`

### Issue: Frontend can't reach backend
**Fix:** Verify API URL in frontend environment.ts matches Render URL exactly (including `/api`)

### Issue: Backend sleeps too slow (free tier)
**Fix:** Ping backend every 10 minutes with cron job, or accept 30-second cold start

### Issue: File uploads disappear
**Fix:** Use external links or implement S3 (see Step 5)

---

## 💰 Cost Summary

| Service | Tier | Cost |
|---------|------|------|
| Render Web Service | Free | $0 |
| Render PostgreSQL | Free | $0 |
| Netlify Hosting | Free | $0 |
| **Total** | | **$0** |

**Limits:**
- Render: Sleeps after 15 min inactivity (30-sec cold start)
- Netlify: 100GB bandwidth/month (more than enough)

---

## ✅ FINAL DEPLOYMENT CHECKLIST

Copy this and tick as you go:

- [ ] CORS config added to backend
- [ ] `application-prod.properties` created
- [ ] Frontend API URLs updated for production
- [ ] Frontend built with `ng build --configuration production`
- [ ] Render PostgreSQL database created
- [ ] Backend deployed to Render
- [ ] Environment variables set on Render
- [ ] Frontend deployed to Netlify
- [ ] Test login works
- [ ] Test database persistence
- [ ] Test AI features (if using)
- [ ] Custom domain configured (optional)

---

**Your app should be live at:**
- 🌐 Frontend: `https://tnp-connect-xxx.netlify.app`
- 🔌 Backend: `https://tnp-connect-api.onrender.com`

**Good luck with your demonstration! 🚀**
