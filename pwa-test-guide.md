# PWA Testing Guide

## Quick PWA Installation Test

### 1. Build and Serve the App
```bash
npm run build
npm run serve
```

### 2. Test Installation Prompt
1. Open Chrome/Edge in **incognito mode**
2. Navigate to `http://localhost:3000`
3. Wait 3 seconds - you should see an install prompt at the bottom
4. Click "Install App" to test installation
5. The app should appear in your app drawer/start menu

### 3. Test App-Like Experience
After installation:
- [ ] App opens in standalone mode (no browser UI)
- [ ] App icon appears in system app launcher
- [ ] App has proper title and icon
- [ ] App works offline (disconnect internet and reload)
- [ ] App shows offline indicator when disconnected
- [ ] Timer functions work offline
- [ ] Settings persist across sessions

### 4. Test PWA Features
- [ ] Install prompt appears for new users
- [ ] App shortcuts work (right-click app icon)
- [ ] Notifications work (if permissions granted)
- [ ] App updates properly when new version available
- [ ] Responsive design works on mobile

### 5. Run Lighthouse Audit
```bash
npm run lighthouse:pwa
```
Open `lighthouse-pwa-report.html` to see PWA score.

## Common Issues and Fixes

### Install Prompt Not Showing
- Clear browser data and try in incognito
- Ensure you're on HTTPS (or localhost)
- Check console for manifest errors
- Wait 3 seconds after page load

### App Not Looking App-Like
- Check manifest `display: "standalone"`
- Verify proper viewport meta tag
- Ensure theme colors are set correctly
- Test on actual mobile device

### Poor Lighthouse Score
- Fix color contrast issues
- Optimize images and assets
- Remove unused JavaScript
- Ensure proper caching headers

## Testing Commands

```bash
# Full optimization and validation
npm run optimize:full

# Quick PWA validation
npm run validate:pwa

# Lighthouse PWA audit only
npm run lighthouse:pwa

# Bundle analysis
npm run build:analyze

# Serve built app for testing
npm run serve
```

## Mobile Testing

### Android Chrome
1. Open Chrome on Android
2. Navigate to your app URL
3. Tap menu → "Add to Home screen"
4. Test app from home screen

### iOS Safari
1. Open Safari on iOS
2. Navigate to your app URL
3. Tap Share → "Add to Home Screen"
4. Test app from home screen

## Deployment Checklist

Before deploying to production:
- [ ] Run `npm run optimize:full`
- [ ] Test on multiple devices
- [ ] Verify HTTPS is configured
- [ ] Test offline functionality
- [ ] Check Lighthouse PWA score (aim for 90+)
- [ ] Test installation flow
- [ ] Verify app shortcuts work
- [ ] Test notifications (if used)