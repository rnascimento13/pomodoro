# Pomodoro PWA

A modern, offline-capable Pomodoro Timer built as a Progressive Web App (PWA) using React and TypeScript.

## Features

- ⏱️ **Pomodoro Timer** - Classic 25/5 minute work/break cycles
- 📱 **Progressive Web App** - Install on any device, works offline
- 🔔 **Smart Notifications** - Browser and audio notifications
- 📊 **Session Tracking** - Track your productivity sessions
- 🎨 **Modern UI** - Clean, responsive design
- 🚀 **High Performance** - Optimized for speed and efficiency
- 🔒 **Privacy First** - All data stored locally

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build

# Serve production build
npm run serve
```

## PWA Features

- **Offline Support** - Works without internet after first visit
- **Installable** - Add to home screen on mobile/desktop
- **Fast Loading** - Optimized caching strategies
- **Responsive** - Works on all screen sizes
- **Notifications** - Stay focused with timely alerts

## Development

### Available Scripts

- `npm start` - Development server
- `npm test` - Run tests
- `npm run build` - Production build
- `npm run analyze` - Bundle analysis
- `npm run lighthouse` - Performance audit
- `npm run optimize` - Build optimization

### Testing

```bash
# Run all tests
npm test

# Run specific test suites
npm test -- --testNamePattern="PWA"
npm test -- --testNamePattern="Performance"
```

## Deployment

This PWA is optimized for deployment on:

- **Netlify** - Automatic HTTPS and PWA optimization
- **Vercel** - Zero-config deployment
- **GitHub Pages** - Free hosting with custom domain support

### Build Optimization

The project includes automatic optimization:

```bash
npm run optimize
```

This will:
- Analyze bundle size
- Check PWA compliance
- Generate performance reports
- Validate service worker

## Browser Support

- Chrome/Edge 88+
- Firefox 85+
- Safari 14+
- Mobile browsers with PWA support

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Tech Stack

- **React 18** - UI framework
- **TypeScript** - Type safety
- **Workbox** - Service worker management
- **Web APIs** - Notifications, Storage, etc.
- **Jest** - Testing framework
- **Lighthouse** - Performance monitoring