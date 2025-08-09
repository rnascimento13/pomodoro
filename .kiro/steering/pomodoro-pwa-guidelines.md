---
inclusion: fileMatch
fileMatchPattern: '.kiro/specs/pomodoro-pwa/*'
---

# Pomodoro PWA Development Guidelines

## Project Overview
This project implements a Progressive Web App for the Pomodoro Technique using React and TypeScript. The app should be installable, work offline, and provide a clean, distraction-free interface for productivity.

## Development Standards

### Code Style
- Use TypeScript for all new code
- Follow React functional components with hooks
- Use descriptive variable and function names
- Implement proper error boundaries and error handling
- Add JSDoc comments for complex functions

### Component Structure
```
src/
├── components/          # Reusable UI components
├── services/           # Business logic and data management
├── hooks/              # Custom React hooks
├── types/              # TypeScript type definitions
├── utils/              # Utility functions
├── assets/             # Images, sounds, icons
└── styles/             # CSS/SCSS files
```

### State Management
- Use React hooks (useState, useEffect, useContext) for local state
- Create custom hooks for complex state logic
- Avoid prop drilling by using Context API when needed
- Keep state as close to where it's used as possible

### PWA Requirements
- All static assets must be cacheable
- App must work offline after first load
- Service worker must handle updates gracefully
- Manifest must include all required fields
- Icons must be provided in all required sizes

### Performance Guidelines
- Lazy load components when appropriate
- Optimize images and use appropriate formats
- Minimize bundle size with tree shaking
- Use React.memo for expensive components
- Implement proper loading states

### Accessibility Standards
- All interactive elements must be keyboard accessible
- Provide proper ARIA labels and roles
- Ensure color contrast meets WCAG AA standards
- Test with screen readers
- Use semantic HTML elements

## Timer Implementation Notes

### Accuracy Requirements
- Timer must remain accurate even when tab is backgrounded
- Use requestAnimationFrame for smooth UI updates
- Consider using Web Workers for background timing
- Handle browser throttling of inactive tabs

### Audio Considerations
- Provide multiple notification sound options
- Handle autoplay restrictions gracefully
- Allow users to disable sounds completely
- Test audio on mobile devices

### Notification Strategy
- Request permissions at appropriate times
- Provide fallbacks for denied permissions
- Test notifications across different browsers
- Handle notification clicks appropriately

## Testing Strategy

### Unit Tests
- Test all timer logic thoroughly
- Mock browser APIs (localStorage, notifications)
- Test edge cases and error conditions
- Achieve high code coverage

### Integration Tests
- Test component interactions
- Verify data persistence
- Test PWA installation flow
- Validate offline functionality

### Manual Testing Checklist
- [ ] Timer accuracy across different browsers
- [ ] PWA installation on mobile and desktop
- [ ] Offline functionality
- [ ] Notification behavior
- [ ] Responsive design on various screen sizes
- [ ] Keyboard navigation
- [ ] Screen reader compatibility

## Common Pitfalls to Avoid

### PWA Issues
- Don't forget to register service worker
- Ensure manifest is properly linked
- Test on actual devices, not just DevTools
- Handle service worker updates properly

### Timer Issues
- Don't rely solely on setTimeout for accuracy
- Account for browser tab throttling
- Handle system sleep/wake cycles
- Test timer behavior during device rotation

### Storage Issues
- Handle localStorage quota exceeded errors
- Implement data migration for schema changes
- Test with disabled localStorage
- Clean up old data periodically

## Reference Files
- PWA Research: #[[file:docs/pwa-react-research.md]]
- Requirements: #[[file:.kiro/specs/pomodoro-pwa/requirements.md]]
- Design: #[[file:.kiro/specs/pomodoro-pwa/design.md]]