# AWS Deployment Guide

This document covers the deployment of the Strokecovery web application on AWS with HTTPS using S3, CloudFront, Route 53, and ACM.

## Architecture Overview

```
User → https://strokecovery.com → CloudFront (CDN + HTTPS) → S3 (Static Website)
```

## Services Used

| Service | Purpose | Cost |
|---------|---------|------|
| S3 | Static website hosting | Free tier: 5GB storage |
| CloudFront | CDN + HTTPS | Free tier: 1TB/month |
| Route 53 | Domain registration + DNS | ~$12-14/year (domain) + $0.50/month (hosted zone) |
| ACM | SSL Certificate | Free |

---

## Step 1: Create S3 Bucket

1. Go to **S3** → **Create bucket**

| Field | Value |
|-------|-------|
| Bucket name | `strokecovery-web` |
| AWS Region | `ap-south-1` (or closest to users) |
| Object Ownership | ACLs disabled |
| Block Public Access | **Uncheck** "Block all public access" |
| Acknowledge warning | Check the box |
| Bucket Versioning | Disable |
| Default encryption | SSE-S3 |
| Bucket Key | Enable |
| Object Lock | Disable |

2. Click **Create bucket**

---

## Step 2: Enable Static Website Hosting

1. Click on the bucket → **Properties** tab
2. Scroll to **Static website hosting** → **Edit**

| Field | Value |
|-------|-------|
| Static website hosting | Enable |
| Hosting type | Host a static website |
| Index document | `index.html` |
| Error document | `index.html` |

3. Click **Save changes**
4. Note the **Bucket website endpoint**: `http://strokecovery-web.s3-website.ap-south-1.amazonaws.com`

---

## Step 3: Add Bucket Policy

1. Go to **Permissions** tab → **Bucket policy** → **Edit**
2. Paste:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "PublicReadGetObject",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::strokecovery-web/*"
        }
    ]
}
```

3. Click **Save changes**

---

## Step 4: Upload Files

1. Go to **Objects** tab → **Upload**
2. Upload these files from `web/` folder:
   - `index.html`
   - `config.js`

**Do NOT upload:** `.env`, `.env.example`, `config.example.js`, `README.md`

---

## Step 5: Register Domain (Route 53)

1. Go to **Route 53** → **Registered domains** → **Register domains**
2. Search for your domain name
3. Select and proceed to checkout

| Field | Value |
|-------|-------|
| Contact type | Person |
| Privacy protection | Enable (free) |
| Auto-renew | Enable (recommended) |

4. Complete payment
5. **Verify email** within 15 days

---

## Step 6: Request SSL Certificate (ACM)

**IMPORTANT**: Must be in **us-east-1** region for CloudFront.

1. Switch to **US East (N. Virginia)** region
2. Go to **ACM (Certificate Manager)** → **Request certificate**

| Field | Value |
|-------|-------|
| Certificate type | Request a public certificate |
| Domain name | `strokecovery.com` |
| Add another name | `*.strokecovery.com` |
| Validation method | DNS validation |
| Key algorithm | RSA 2048 |

3. Click **Request**
4. Click on the certificate → **Create records in Route 53** → **Create records**
5. Wait for status to change to **Issued** (2-5 minutes)

---

## Step 7: Create CloudFront Distribution

1. Go to **CloudFront** → **Create distribution**

### Distribution options

| Field | Value |
|-------|-------|
| Distribution type | Web distribution |
| Distribution name | `strokecovery-web` |

### Origin

| Field | Value |
|-------|-------|
| Origin type | Amazon S3 |
| Origin domain | `strokecovery-web.s3-website.ap-south-1.amazonaws.com` (type manually, don't select from dropdown) |
| Protocol | HTTP only |
| Origin access | Public (no OAC) |

### Cache behavior

| Field | Value |
|-------|-------|
| Viewer protocol policy | Redirect HTTP to HTTPS |
| Allowed HTTP methods | GET, HEAD |
| Cache settings | Use recommended settings |

### WAF

| Field | Value |
|-------|-------|
| WAF | Do not enable security protections |

### Settings

| Field | Value |
|-------|-------|
| Price class | Use all edge locations (or cheaper option) |
| Alternate domain name (CNAME) | `strokecovery.com` |
| Add another CNAME | `www.strokecovery.com` |
| Custom SSL certificate | Select your certificate |
| Default root object | `index.html` |

2. Click **Create distribution**
3. Wait for deployment (5-10 minutes)

---

## Step 8: Connect Domain to CloudFront (Route 53)

1. Go to **Route 53** → **Hosted zones** → click your domain

### Record 1: Root domain

Click **Create record**:

| Field | Value |
|-------|-------|
| Record name | (leave blank) |
| Record type | A |
| Alias | ON |
| Route traffic to | Alias to CloudFront distribution |
| Distribution | Select your distribution |

### Record 2: WWW subdomain

Click **Create record**:

| Field | Value |
|-------|-------|
| Record name | `www` |
| Record type | A |
| Alias | ON |
| Route traffic to | Alias to another record in this hosted zone |
| Record | `strokecovery.com` |

---

## Updating the Website

### To update content:

1. Edit files locally in `web/` folder
2. Go to **S3** → bucket → **Upload** (overwrites existing files)
3. Go to **CloudFront** → distribution → **Invalidations** → **Create invalidation**
4. Enter path: `/*` (all files) or `/index.html` (specific file)
5. Wait 2-3 minutes for changes to propagate

---

## Troubleshooting

### 403 Forbidden Error
- Check S3 bucket policy allows public read
- Check "Block Public Access" is disabled
- Verify files are uploaded

### 504 Gateway Timeout
- Verify origin domain uses website endpoint (`s3-website` not `s3`)
- Ensure protocol is set to **HTTP only**
- Disable Origin Access Control (OAC) - use Public access

### Changes not appearing
- Create CloudFront invalidation for `/*`
- Wait 2-3 minutes
- Clear browser cache

---

## Live URLs

- Production: `https://strokecovery.com`
- WWW: `https://www.strokecovery.com`
- S3 Direct (HTTP only): `http://strokecovery-web.s3-website.ap-south-1.amazonaws.com`

---

## Monthly Cost Estimate

For low-traffic website:
- Route 53 Hosted Zone: $0.50/month
- CloudFront: Free tier (1TB/month)
- S3: Free tier (5GB storage)
- SSL Certificate: Free

**Total: ~$0.50-1/month**
