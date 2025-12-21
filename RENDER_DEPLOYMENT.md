# Render Deployment Guide

## Overview
This guide provides step-by-step instructions for deploying the XYZ Hotel POS system to Render.

## Prerequisites
- GitHub account with the project repository
- Render account (https://render.com)
- PostgreSQL database ready on Render

## Deployment Steps

### 1. Prepare the Repository
Ensure these files are committed to your Git repository:
- `Procfile` - Defines release and web processes
- `render.yaml` - Infrastructure as Code configuration
- `.gitignore` - Prevents secrets from being committed
- `package.json` - Updated with correct dependencies
- `server/package.json` - Backend dependencies

### 2. Set Environment Variables on Render

In your Render service dashboard, add the following environment variables:

#### Required Variables
```
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://user:password@host:port/dbname
JWT_SECRET=your_secure_jwt_secret
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_SECURE=false
EMAIL_USER=your_email@gmail.com
EMAIL_PASSWORD=your_gmail_app_password
EMAIL_FROM=XYZ Hotel <noreply@xyzhotel.com>
```

### 3. Database Configuration

#### Option A: Use render.yaml (Recommended)
The `render.yaml` file includes database configuration. Render will automatically:
- Create a PostgreSQL 15 database named `xyz_hotel_db`
- Set up the connection string in `DATABASE_URL`

#### Option B: Existing Database
If using an existing PostgreSQL database:
1. Go to your Render dashboard
2. Navigate to your service settings
3. Add the `DATABASE_URL` environment variable with your database connection string

### 4. Deploy Using Render Dashboard

#### Using GitHub Integration:
1. Go to https://dashboard.render.com
2. Click "New" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name**: `xyz-hotel-pos`
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `node server/dist/index.js`
   - **Plan**: Standard or higher

#### Using render.yaml:
1. Push `render.yaml` to your repository
2. Go to https://dashboard.render.com
3. Click "New" → "Blueprint"
4. Connect your repository
5. Select the branch with `render.yaml`
6. Render will automatically deploy according to the configuration

### 5. First Deployment - Run Migrations

After initial deployment, you need to run database migrations:

**Option A: Using Render Dashboard**
```bash
# Open Shell in Render Dashboard and run:
cd server && npm run migrate:prod
```

**Option B: Automated via Procfile**
The `release` process in `Procfile` automatically runs migrations:
```
release: cd server && npm run migrate:prod
```

### 6. Verify Deployment

1. Check health endpoint: `https://your-app.onrender.com/api/health`
2. Should return:
```json
{
  "status": "OK",
  "message": "POS Mocha Backend - Modular Architecture",
  "timestamp": "2025-12-20T...",
  "environment": "production"
}
```

3. Check logs in Render Dashboard for any errors

## Build and Start Process

### Build Phase
```bash
npm install
npm run build:frontend  # Vite builds React app to dist/client
npm run build:backend   # TypeScript compiles to server/dist
```

### Start Phase
```bash
node server/dist/index.js
```

The Express server:
- Serves compiled frontend from `dist/client`
- Runs API routes from `server/dist`
- Listens on PORT 10000

## Troubleshooting

### Build Failures
- Check logs in Render Dashboard
- Ensure all dependencies are in `package.json`
- Verify Node version compatibility (use Node 18+)

### Database Connection Issues
- Verify `DATABASE_URL` is correctly set
- Check database credentials
- Ensure database is accessible from Render servers
- Test connection: `psql <DATABASE_URL>`

### Runtime Errors
- Check application logs in Render Dashboard
- Verify environment variables are set
- Check database migrations ran successfully

### 502 Bad Gateway
- Indicates health check failing
- Verify `/api/health` endpoint is working
- Check `server/src/index.ts` line 124-131

## Security Checklist

- [ ] `.env` files are in `.gitignore`
- [ ] Sensitive environment variables set in Render (not in code)
- [ ] CORS origins configured for production domain
- [ ] JWT_SECRET is a strong, unique value
- [ ] Email credentials use app-specific passwords (not main account password)
- [ ] Database URL uses HTTPS with SSL
- [ ] No secrets committed to Git history

## Monitoring

After deployment, monitor:
1. Application logs in Render Dashboard
2. Database performance
3. Memory/CPU usage
4. Error rates and API response times

## Scaling

For increased traffic:
1. Upgrade Render plan (Standard → Pro → Premium)
2. Configure database connection pooling
3. Enable Render's caching features

## Additional Resources

- Render Docs: https://render.com/docs
- Node.js on Render: https://render.com/docs/deploy-node
- Environment Variables: https://render.com/docs/environment-variables
- Databases: https://render.com/docs/databases

## Support

For deployment issues:
1. Check Render status page
2. Review application logs
3. Contact Render support: support@render.com
