---
inclusion: always
---

# React PWA Best Practices

## PWA Implementation Checklist

### Essential PWA Features
- [ ] Web App Manifest with all required fields
- [ ] Service Worker registered and functioning
- [ ] HTTPS deployment (required for PWA)
- [ ] Responsive design for all screen sizes
- [ ] Fast loading (< 3 seconds on 3G)
- [ ] Works offline after first visit

### Create React App PWA Setup
```bash
# Use the PWA template
npx create-react-app my-app --template cra-template-pwa-typescript

# Enable service worker in src/index.js
serviceWorkerRegistration.register();
```

### Manifest Configuration
```json
{
  "name": "App Full Name",
  "short_name": "AppName",
  "start_url": "/",
  "display": "standalone",
  "theme_color": "#000000",
  "background_color": "#ffffff",
  "icons": [
    {
      "src": "icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any maskable"
    },
    {
      "src": "icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any maskable"
    }
  ]
}
```

## Service Worker Patterns

### Basic Service Worker Registration
```javascript
// In src/index.js
import * as serviceWorkerRegistration from './serviceWorkerRegistration';

// Register the service worker
serviceWorkerRegistration.register({
  onSuccess: (registration) => {
    console.log('SW registered: ', registration);
  },
  onUpdate: (registration) => {
    console.log('SW updated: ', registration);
    // Show update notification to user
  }
});
```

### Handling Service Worker Updates
```javascript
// Show update notification
const showUpdateNotification = () => {
  if (confirm('New version available! Reload to update?')) {
    window.location.reload();
  }
};

// Listen for service worker updates
navigator.serviceWorker.addEventListener('controllerchange', () => {
  window.location.reload();
});
```

## Offline Functionality

### Network Status Detection
```javascript
const useOnlineStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
};
```

### Local Storage Best Practices
```javascript
// Safe localStorage wrapper
const storage = {
  get: (key, defaultValue = null) => {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
      console.error('Error reading from localStorage:', error);
      return defaultValue;
    }
  },
  
  set: (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error writing to localStorage:', error);
      return false;
    }
  }
};
```

## Installation Prompt

### Handle Install Prompt
```javascript
const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [showInstall, setShowInstall] = useState(false);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowInstall(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setDeferredPrompt(null);
      setShowInstall(false);
    }
  };

  return { showInstall, handleInstall };
};
```

## Performance Optimization

### Code Splitting
```javascript
import { lazy, Suspense } from 'react';

const LazyComponent = lazy(() => import('./LazyComponent'));

function App() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
```

### Image Optimization
```javascript
// Use appropriate image formats
const ImageComponent = ({ src, alt, ...props }) => (
  <picture>
    <source srcSet={`${src}.webp`} type="image/webp" />
    <source srcSet={`${src}.jpg`} type="image/jpeg" />
    <img src={`${src}.jpg`} alt={alt} {...props} />
  </picture>
);
```

## Notifications

### Browser Notifications
```javascript
const useNotifications = () => {
  const [permission, setPermission] = useState(Notification.permission);

  const requestPermission = async () => {
    if ('Notification' in window) {
      const result = await Notification.requestPermission();
      setPermission(result);
      return result === 'granted';
    }
    return false;
  };

  const showNotification = (title, options = {}) => {
    if (permission === 'granted') {
      new Notification(title, {
        icon: '/icon-192x192.png',
        badge: '/icon-192x192.png',
        ...options
      });
    }
  };

  return { permission, requestPermission, showNotification };
};
```

## Testing PWAs

### Lighthouse Audit
- Run Lighthouse in Chrome DevTools
- Aim for scores > 90 in all categories
- Pay special attention to PWA checklist

### Manual Testing
- Test installation on different devices
- Verify offline functionality
- Check responsive design
- Test notification behavior
- Validate manifest properties

### Common Issues
- Service worker not registering
- Manifest validation errors
- Icons not displaying correctly
- Offline functionality not working
- Installation prompt not showing

## Deployment Considerations

### HTTPS Requirement
- PWAs require HTTPS in production
- Use services like Netlify, Vercel, or GitHub Pages
- Configure proper SSL certificates

### Cache Headers
```
# Example cache headers
Cache-Control: public, max-age=31536000  # Static assets
Cache-Control: no-cache                  # HTML files
```

### Build Optimization
```json
{
  "scripts": {
    "build": "react-scripts build",
    "analyze": "npm run build && npx serve -s build"
  }
}
```