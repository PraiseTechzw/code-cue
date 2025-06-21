# Contributing to CodeCue

Thank you for your interest in contributing to CodeCue! This document provides guidelines and information for contributors.

## 🤝 How to Contribute

We welcome contributions from the community! Here are the main ways you can contribute:

### 🐛 Bug Reports
- Use the [GitHub Issues](https://github.com/yourusername/code-cue/issues) page
- Include a clear description of the bug
- Provide steps to reproduce the issue
- Include device/OS information if relevant

### 💡 Feature Requests
- Use the [GitHub Discussions](https://github.com/yourusername/code-cue/discussions) page
- Describe the feature and its benefits
- Consider implementation complexity
- Check if similar features already exist

### 🔧 Code Contributions
- Fork the repository
- Create a feature branch
- Make your changes
- Add tests if applicable
- Submit a pull request

## 🚀 Development Setup

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Git

### Local Development
1. Fork and clone the repository
2. Install dependencies: `npm install`
3. Set up environment variables (see README.md)
4. Start development server: `npx expo start`

## 📝 Code Style Guidelines

### TypeScript
- Use TypeScript for all new code
- Define proper types and interfaces
- Avoid `any` type when possible
- Use strict type checking

### React Native
- Follow React Native best practices
- Use functional components with hooks
- Implement proper error boundaries
- Optimize for performance

### File Naming
- Use PascalCase for components: `ProjectCard.tsx`
- Use camelCase for utilities: `useProjectData.ts`
- Use kebab-case for files: `project-detail.tsx`

### Code Formatting
- Use Prettier for code formatting
- Follow ESLint rules
- Use meaningful variable and function names
- Add JSDoc comments for complex functions

## 🧪 Testing

### Writing Tests
- Write tests for new features
- Use Jest and React Native Testing Library
- Test both success and error scenarios
- Maintain good test coverage

### Running Tests
```bash
# Run all tests
npm test

# Run tests with coverage
npm run test:coverage

# Run tests in watch mode
npm run test:watch
```

## 📦 Pull Request Process

### Before Submitting
1. Ensure your code follows the style guidelines
2. Run tests and ensure they pass
3. Update documentation if needed
4. Test on both iOS and Android if applicable

### Pull Request Template
```markdown
## Description
Brief description of changes

## Type of Change
- [ ] Bug fix
- [ ] New feature
- [ ] Breaking change
- [ ] Documentation update

## Testing
- [ ] Tests pass
- [ ] Tested on iOS
- [ ] Tested on Android
- [ ] Tested on Web

## Screenshots (if applicable)
Add screenshots for UI changes

## Checklist
- [ ] Code follows style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] No console errors
```

## 🏗️ Project Structure

### Key Directories
- `app/` - Expo Router screens and navigation
- `components/` - Reusable UI components
- `services/` - API and business logic
- `types/` - TypeScript type definitions
- `hooks/` - Custom React hooks
- `contexts/` - React contexts for state management

### Adding New Features
1. Create necessary types in `types/`
2. Add service functions in `services/`
3. Create UI components in `components/`
4. Add screens in `app/`
5. Update navigation if needed

## 🔒 Security

### Reporting Security Issues
- **DO NOT** create public issues for security vulnerabilities
- Email security@codecue.app instead
- Include detailed information about the vulnerability
- Allow time for investigation and fix

### Security Guidelines
- Never commit API keys or secrets
- Use environment variables for sensitive data
- Validate all user inputs
- Follow OWASP security guidelines

## 📚 Documentation

### Code Documentation
- Add JSDoc comments for functions and classes
- Document complex business logic
- Include usage examples for components
- Update README.md for new features

### API Documentation
- Document new API endpoints
- Include request/response examples
- Specify error codes and messages
- Update API documentation in wiki

## 🎯 Issue Labels

We use the following labels to categorize issues:

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `priority: high` - High priority issues
- `priority: low` - Low priority issues

## 🏆 Recognition

### Contributors
- All contributors will be listed in the README.md
- Significant contributions will be highlighted
- Contributors will be mentioned in release notes

### Hall of Fame
- Top contributors will be featured in our Hall of Fame
- Special recognition for major features
- Community awards for outstanding contributions

## 📞 Getting Help

### Questions and Support
- Use [GitHub Discussions](https://github.com/yourusername/code-cue/discussions)
- Check existing issues and discussions
- Join our community chat (if available)
- Email support@codecue.app

### Mentorship
- New contributors can request mentorship
- Experienced contributors can offer to mentor
- Pair programming sessions available
- Code review assistance

## 📋 Code of Conduct

### Our Standards
- Be respectful and inclusive
- Use welcoming and inclusive language
- Be collaborative and constructive
- Focus on what is best for the community

### Enforcement
- Unacceptable behavior will not be tolerated
- Violations will be addressed promptly
- Consequences may include temporary or permanent ban

## 🎉 Thank You

Thank you for contributing to CodeCue! Your contributions help make this project better for everyone in the community.

---

**Remember**: Every contribution, no matter how small, makes a difference! 🚀 