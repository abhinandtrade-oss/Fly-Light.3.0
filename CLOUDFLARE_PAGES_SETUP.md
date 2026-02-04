# Cloudflare Pages Deployment Guide for Fly Light Tours

## Project Overview

**Repository**: https://github.com/abhinandtrade-oss/Fly-Light.3.0
**Project Type**: Static HTML Site
**Languages**: HTML 99.8%, JavaScript 0.2%, CSS
**Deployment Method**: Cloudflare Pages + Wrangler

---

## What Has Been Completed

### 1. Project Structure Analysis ✅
- **Type**: Static HTML website (not a framework project)
- **Build System**: None required (pure HTML/CSS/JS)
- **Entry Point**: `index.html` (root directory)
- **Assets**: CSS, Images, and JavaScript in `assets/` folder

### 2. Wrangler Configuration ✅
A `wrangler.toml` file has been created at the repository root with the following configuration:

```toml
name = "fly-light-tours"
type = "javascript"
pages_build_output_dir = ""

[build]
command = ""
cwd = "/"
root_dir = ""

[env.production]
vars = { ENVIRONMENT = "production" }
```

**Key Settings**:
- **name**: `fly-light-tours` - Project identifier for Cloudflare
- **type**: `javascript` - Standard Pages project type
- **pages_build_output_dir**: Empty (static files served as-is from root)
- **build.command**: Empty (no build step needed for static HTML)

---

## Deployment Steps (Remaining)

### Step 1: Authorize Cloudflare Pages GitHub App

1. Go to GitHub Settings → Applications → Installed GitHub Apps
2. Find "Cloudflare Workers and Pages" → Click "Configure"
3. Under "Repository access", select "All repositories" OR specifically add "Fly-Light.3.0"
4. Save changes

### Step 2: Create Cloudflare Pages Project

1. Log into Cloudflare Dashboard: https://dash.cloudflare.com
2. Go to Workers & Pages → Pages → Create Application
3. Choose "Import an existing Git repository"
4. Select GitHub provider
5. Authorize and select:
   - Repository: `abhinandtrade-oss/Fly-Light.3.0`
   - Branch: `main`

### Step 3: Configure Build Settings

In Cloudflare Pages project settings:
- **Build command**: Leave empty (no build needed)
- **Build output directory**: `/` (root directory - files deploy as-is)
- **Root directory**: (leave empty or leave as `/`)

### Step 4: Set Production Domain

After initial deployment:
1. Go to Pages project settings
2. Under Custom domains, add your domain: `flylighttoursandtravels.com`
3. Follow the DNS configuration (CNAME or Cloudflare nameservers)

---

## Wrangler Configuration Details

The `wrangler.toml` uses these settings optimized for static sites:

| Setting | Value | Purpose |
|---------|-------|---------|
| `name` | fly-light-tours | Unique identifier for the project |
| `type` | javascript | Pages project type |
| `pages_build_output_dir` | "" | No build artifacts needed |
| `build.command` | "" | No build preprocessing |
| `compatibility_date` | 2024-01-01 | Cloudflare Workers API version |

---

## File Structure Served by Pages

```
/
├── index.html (homepage)
├── about.html
├── contact.html
├── destinations.html
├── faq.html
├── insur.html
├── privacy-policy.html
├── terms-of-use.html
├── cookie-policy.html
├── 404.html (custom error page)
├── assets/
│   ├── css/
│   ├── images/
│   └── js/
├── admin/
└── src/
```

All files are served directly by Cloudflare Pages with no build processing required.

---

## Deployment URL Format

Once deployed, your site will be available at:
- **Temporary URL**: `fly-light-tours.pages.dev`
- **Custom Domain**: `flylighttoursandtravels.com` (after DNS setup)

---

## Environment Variables

Currently configured in `wrangler.toml`:
- `ENVIRONMENT=production` (for production builds)

To add more environment variables:
1. Update `wrangler.toml` with new variables in `[env.production]` section
2. Or use Cloudflare Pages dashboard → Settings → Environment variables

---

## Troubleshooting

### Issue: Repository Not Showing in GitHub App Selection
**Solution**: 
1. Go to GitHub → Settings → Applications → Cloudflare Pages
2. Click "Configure"
3. Select "All repositories" for access
4. Refresh Cloudflare Pages setup

### Issue: 404 Errors After Deployment
**Solution**:
1. Ensure `wrangler.toml` has correct `pages_build_output_dir` (empty string for root)
2. Verify all HTML files are in the root directory
3. Check that 404.html exists in root

### Issue: CSS/JS Not Loading
**Solution**:
1. Verify asset paths are relative: `assets/css/style.css`
2. Cloudflare Pages caches aggressively; purge cache in Cloudflare dashboard
3. Check that file permissions are readable

---

## Additional Resources

- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Wrangler CLI Docs](https://developers.cloudflare.com/workers/wrangler/)
- [Cloudflare GitHub Integration](https://developers.cloudflare.com/pages/configuration/git-integration/)

---

## Next Steps

1. Authorize the Cloudflare Pages GitHub app to access this repository
2. Create the Pages project in Cloudflare dashboard
3. Configure the production domain
4. Test the deployment by pushing changes to main branch

All the configuration is ready - deployment is just a few clicks away!
