# Uptime Monitoring Setup Guide

This guide explains how to set up automatic uptime monitoring for your chat backend service to prevent cold starts on Render.

## Overview

The GitHub Actions workflow will ping your service every 5 minutes to keep it warm and monitor its health.

## 🚀 Quick Setup

### Step 1: Configure Repository Secrets

1. Go to your GitHub repository
2. Navigate to `Settings` → `Secrets and variables` → `Actions`
3. Click `New repository secret`

Add the following secret:

- **Name**: `SERVICE_URL`
- **Value**: Your Render service URL (e.g., `https://your-chat-backend.onrender.com`)

### Step 2: Enable GitHub Actions

1. Push the workflow file to your repository
2. Go to `Actions` tab in your GitHub repository
3. Enable Actions if not already enabled
4. Find the "Uptime Monitor" workflow in the list

### Step 3: Test the Workflow

1. Go to the `Actions` tab
2. Click on "Uptime Monitor"
3. Click "Run workflow" to test it manually
4. Check the logs to ensure it's working

## 📊 Monitoring Features

### Health Checks
- **Primary**: `/health/simple` endpoint (lightweight)
- **Backup**: `/health` and `/` endpoints (if primary fails)
- **Timeout**: 30 seconds with 2 retries
- **Status**: Success if HTTP 200 response

### Schedule
- **Frequency**: Every 5 minutes (`*/5 * * * *`)
- **Manual Trigger**: Can be run manually for testing

### Error Handling
- ✅ Retry mechanism (2 attempts with 5-second delay)
- 🔄 Backup endpoints if primary fails
- 🚨 Failure notifications (configurable)

## 🔧 Advanced Configuration

### Custom Notification Setup

To receive notifications when your service goes down, you can:

#### Slack Notification
Add this secret to your repository:
- **Name**: `SLACK_WEBHOOK_URL`
- **Value**: Your Slack webhook URL

Then uncomment the Slack webhook section in the workflow.

#### Discord Notification
Add this secret:
- **Name**: `DISCORD_WEBHOOK_URL`
- **Value**: Your Discord webhook URL

And add this notification step:
```yaml
- name: Notify Discord
  if: failure()
  run: |
    curl -X POST -H 'Content-type: application/json' \
      --data '{"content":"🚨 Chat backend service is down! Check: '"$SERVICE_URL"'"'}' \
      "${{ secrets.DISCORD_WEBHOOK_URL }}"
```

### Custom Schedule

To change the monitoring frequency, edit the cron schedule in `.github/workflows/uptime-monitor.yml`:

```yaml
schedule:
  # Every 10 minutes
  - cron: '*/10 * * * *'

  # Every hour
  - cron: '0 * * * *'

  # Every 30 minutes
  - cron: '*/30 * * * *'
```

## 📈 Monitoring Dashboard

### Check Workflow Status
1. Go to `Actions` tab in GitHub
2. Click on "Uptime Monitor"
3. View recent runs and their status

### View Logs
1. Click on any workflow run
2. Expand the steps to see detailed logs
3. Check response times and HTTP status codes

## 🔍 Troubleshooting

### Common Issues

#### Service URL Not Working
- Verify your Render service URL is correct
- Check that your service is deployed and accessible
- Test the URL manually in your browser

#### HTTP Status Codes
- **200**: Service is healthy ✅
- **404**: Endpoint not found (check service routes)
- **500**: Service error (check service logs)
- **Timeout**: Service not responding (cold start or downtime)

#### Workflow Not Running
- Check that Actions are enabled in your repository
- Verify the workflow file is in `.github/workflows/`
- Check the schedule syntax is correct

### Debug Steps

1. **Manual Test**: Visit `https://your-service-url.onrender.com/health/simple`
2. **Check Logs**: Look at Render service logs
3. **Verify Secrets**: Ensure SERVICE_URL is set correctly
4. **Test Workflow**: Run the workflow manually

## 📋 Checklist

- [ ] Repository secret `SERVICE_URL` configured
- [ ] GitHub Actions enabled
- [ ] Workflow file committed
- [ ] Manual test successful
- [ ] Scheduled runs working
- [ ] Monitoring alerts configured (optional)

## 🔄 Alternative Solutions

If GitHub Actions doesn't work for you, consider:

1. **UptimeRobot** - Free external monitoring service
2. **Better Uptime** - Free 1-minute monitoring
3. **Self-hosted bot** - Small Node.js service on another platform

## 📞 Support

If you encounter issues:

1. Check Render service status
2. Review workflow logs
3. Test endpoints manually
4. Verify repository configuration

The monitoring should keep your service warm and prevent cold starts, ensuring your chatbot remains responsive for users.