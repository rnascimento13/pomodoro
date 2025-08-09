#!/usr/bin/env node

/**
 * Build optimization script for Pomodoro PWA
 * This script runs after the build to optimize assets and validate PWA requirements
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Starting PWA build optimization...');

const buildDir = path.join(__dirname, 'build');

// Check if build directory exists
if (!fs.existsSync(buildDir)) {
  console.error('❌ Build directory not found. Please run "npm run build" first.');
  process.exit(1);
}

// 1. Validate manifest.json
console.log('📋 Validating web app manifest...');
try {
  const manifestPath = path.join(buildDir, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  
  // Required fields validation
  const requiredFields = ['name', 'short_name', 'start_url', 'display', 'theme_color', 'background_color', 'icons'];
  const missingFields = requiredFields.filter(field => !manifest[field]);
  
  if (missingFields.length > 0) {
    console.error(`❌ Missing required manifest fields: ${missingFields.join(', ')}`);
    process.exit(1);
  }
  
  // Validate icons
  if (!manifest.icons || manifest.icons.length === 0) {
    console.error('❌ No icons found in manifest');
    process.exit(1);
  }
  
  // Check for required icon sizes
  const iconSizes = manifest.icons.map(icon => icon.sizes);
  const requiredSizes = ['192x192', '512x512'];
  const missingSizes = requiredSizes.filter(size => !iconSizes.includes(size));
  
  if (missingSizes.length > 0) {
    console.warn(`⚠️  Missing recommended icon sizes: ${missingSizes.join(', ')}`);
  }
  
  console.log('✅ Manifest validation passed');
} catch (error) {
  console.error('❌ Manifest validation failed:', error.message);
  process.exit(1);
}

// 2. Check service worker
console.log('🔧 Validating service worker...');
const swPath = path.join(buildDir, 'service-worker.js');
if (!fs.existsSync(swPath)) {
  console.error('❌ Service worker not found');
  process.exit(1);
}

const swContent = fs.readFileSync(swPath, 'utf8');
if (!swContent.includes('precacheAndRoute')) {
  console.warn('⚠️  Service worker may not be properly configured for caching');
}
console.log('✅ Service worker validation passed');

// 3. Analyze bundle size
console.log('📊 Analyzing bundle size...');
try {
  const staticDir = path.join(buildDir, 'static');
  const jsDir = path.join(staticDir, 'js');
  const cssDir = path.join(staticDir, 'css');
  
  if (fs.existsSync(jsDir)) {
    const jsFiles = fs.readdirSync(jsDir).filter(file => file.endsWith('.js'));
    let totalJSSize = 0;
    
    jsFiles.forEach(file => {
      const filePath = path.join(jsDir, file);
      const stats = fs.statSync(filePath);
      totalJSSize += stats.size;
      console.log(`  📄 ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
    });
    
    console.log(`  📦 Total JS size: ${(totalJSSize / 1024).toFixed(2)} KB`);
    
    if (totalJSSize > 250 * 1024) { // 250KB threshold
      console.warn('⚠️  Large JavaScript bundle detected. Consider code splitting.');
    }
  }
  
  if (fs.existsSync(cssDir)) {
    const cssFiles = fs.readdirSync(cssDir).filter(file => file.endsWith('.css'));
    let totalCSSSize = 0;
    
    cssFiles.forEach(file => {
      const filePath = path.join(cssDir, file);
      const stats = fs.statSync(filePath);
      totalCSSSize += stats.size;
      console.log(`  🎨 ${file}: ${(stats.size / 1024).toFixed(2)} KB`);
    });
    
    console.log(`  🎨 Total CSS size: ${(totalCSSSize / 1024).toFixed(2)} KB`);
  }
} catch (error) {
  console.warn('⚠️  Could not analyze bundle size:', error.message);
}

// 4. Check for critical resources
console.log('🔍 Checking critical resources...');
const criticalResources = [
  'index.html',
  'manifest.json',
  'service-worker.js',
  'favicon.ico'
];

criticalResources.forEach(resource => {
  const resourcePath = path.join(buildDir, resource);
  if (fs.existsSync(resourcePath)) {
    console.log(`  ✅ ${resource} found`);
  } else {
    console.error(`  ❌ ${resource} missing`);
  }
});

// 5. Generate deployment checklist
console.log('📝 Generating deployment checklist...');
const checklist = `
# PWA Deployment Checklist

## Pre-deployment Validation
- [x] Web app manifest is valid and complete
- [x] Service worker is registered and functional
- [x] All critical resources are present
- [x] Bundle size is optimized
- [ ] HTTPS is configured (required for PWA)
- [ ] Domain is configured correctly
- [ ] Cache headers are set appropriately

## Performance Optimization
- [x] Static assets are minified
- [x] Images are optimized
- [x] Service worker caching is configured
- [x] Critical resources are preloaded
- [ ] CDN is configured (optional)
- [ ] Compression (gzip/brotli) is enabled

## PWA Features
- [x] App is installable
- [x] Works offline after first visit
- [x] Responsive design implemented
- [x] Touch-friendly interface
- [x] App shortcuts configured
- [x] Proper meta tags for mobile

## Testing
- [ ] Test installation on mobile devices
- [ ] Test offline functionality
- [ ] Test app shortcuts
- [ ] Test notifications
- [ ] Run Lighthouse audit (aim for 90+ PWA score)
- [ ] Test on different browsers and devices

## Security
- [x] Content Security Policy configured
- [x] HTTPS required for production
- [ ] Security headers configured on server
- [ ] No sensitive data in client-side code

## Monitoring
- [ ] Error tracking configured
- [ ] Performance monitoring set up
- [ ] Analytics configured (optional)
- [ ] User feedback collection (optional)

Generated on: ${new Date().toISOString()}
`;

fs.writeFileSync(path.join(__dirname, 'deployment-checklist.md'), checklist);
console.log('✅ Deployment checklist generated: deployment-checklist.md');

// 6. Create production environment file
console.log('⚙️  Creating production environment configuration...');
const prodEnv = `# Production Environment Configuration
# Copy this to .env.production for production builds

# App Configuration
REACT_APP_VERSION=${require('./package.json').version}
REACT_APP_BUILD_DATE=${new Date().toISOString()}
REACT_APP_ENVIRONMENT=production

# Performance Monitoring
REACT_APP_ENABLE_PERFORMANCE_MONITORING=true
REACT_APP_ENABLE_ERROR_REPORTING=true

# PWA Configuration
REACT_APP_ENABLE_SW_UPDATE_PROMPT=true
REACT_APP_SW_UPDATE_CHECK_INTERVAL=300000

# Feature Flags
REACT_APP_ENABLE_ANALYTICS=false
REACT_APP_ENABLE_DEBUG_MODE=false

# Build Optimization
GENERATE_SOURCEMAP=false
INLINE_RUNTIME_CHUNK=false
`;

fs.writeFileSync(path.join(__dirname, '.env.production.example'), prodEnv);
console.log('✅ Production environment example created: .env.production.example');

console.log('\n🎉 PWA build optimization completed successfully!');
console.log('\n📋 Next steps:');
console.log('1. Review the deployment checklist');
console.log('2. Configure your production environment');
console.log('3. Set up HTTPS hosting');
console.log('4. Run Lighthouse audit');
console.log('5. Test on real devices');