# CodeCue - Advanced Project Management App

<div align="center">
  <img src="assets/images/logo.png" alt="CodeCue Logo" width="200"/>
  
  [![React Native](https://img.shields.io/badge/React%20Native-0.72-blue.svg)](https://reactnative.dev/)
  [![Expo](https://img.shields.io/badge/Expo-49.0.0-black.svg)](https://expo.dev/)
  [![Appwrite](https://img.shields.io/badge/Appwrite-13.0.0-red.svg)](https://appwrite.io/)
  [![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)
  [![License](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
</div>

## 🎯 Overview

CodeCue is a powerful, modern project management application built with React Native and Expo, featuring a sophisticated 3-level hierarchy system (Project → Phase → Task) with advanced collaboration tools, GitHub integration, and offline capabilities.

## ✨ Features

### 🏗️ **Advanced Project Management**
- **3-Level Hierarchy**: Organize work with Projects → Phases → Tasks
- **Weighted Progress**: Phases contribute to overall project progress
- **Status Tracking**: Multiple status options for projects and phases
- **Priority Management**: Priority levels for projects and tasks
- **Budget & Timeline**: Track project budgets and deadlines

### 📊 **Enhanced Task Management**
- **Phase Assignment**: Tasks can be assigned to specific phases
- **Time Tracking**: Estimated and actual hours tracking
- **Dependencies**: Task and phase dependencies management
- **Tags & Categories**: Flexible task categorization
- **Assignee Management**: Team member task assignment
- **Subtasks**: Break down complex tasks into smaller components

### 🔄 **Offline-First Architecture**
- **Local Caching**: All data cached locally for instant access
- **Offline Operations**: Create, edit, and manage projects offline
- **Smart Sync**: Automatic synchronization when back online
- **Conflict Resolution**: Intelligent handling of data conflicts

### 🔗 **GitHub Integration**
- **Repository Linking**: Connect GitHub repositories to projects
- **Commit Tracking**: Link commits to specific tasks
- **Code Integration**: Seamless development workflow
- **Branch Management**: Track feature branches and pull requests

### 👥 **Team Collaboration**
- **User Management**: Team member profiles and roles
- **Comments & Discussions**: Task-level communication
- **Notifications**: Real-time updates and alerts
- **Activity Tracking**: Comprehensive project activity logs

### 🎨 **Modern UI/UX**
- **Responsive Design**: Works on mobile and web
- **Dark/Light Themes**: Customizable appearance
- **Smooth Animations**: Engaging user interactions
- **Haptic Feedback**: Enhanced mobile experience
- **Accessibility**: WCAG compliant design

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Expo CLI
- Appwrite account

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/code-cue.git
   cd code-cue
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   EXPO_PUBLIC_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
   EXPO_PUBLIC_APPWRITE_PROJECT_ID=your-project-id
   EXPO_PUBLIC_GEMINI_API_KEY=your-gemini-api-key
   EXPO_PROJECT_ID=your-expo-project-id
   ```

4. **Set up Appwrite backend**
   - Follow the [Appwrite Setup Guide](APPWRITE_SETUP.md)
   - Create all required collections and configure permissions

5. **Start the development server**
   ```bash
   npx expo start
   ```

6. **Run on your device**
   - Install Expo Go on your mobile device
   - Scan the QR code from the terminal
   - Or press `w` to open in web browser

## 📱 Platform Support

- **iOS**: 13.0+
- **Android**: 8.0+ (API level 26+)
- **Web**: Modern browsers (Chrome, Firefox, Safari, Edge)

## 🏗️ Project Structure

```
code-cue/
├── app/                    # Expo Router app directory
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── project/           # Project management screens
│   ├── phase/             # Phase management screens
│   └── task/              # Task management screens
├── components/            # Reusable UI components
├── contexts/              # React contexts for state management
├── hooks/                 # Custom React hooks
├── lib/                   # Appwrite client configuration
├── services/              # API and business logic services
├── types/                 # TypeScript type definitions
├── constants/             # App constants and configurations
└── assets/                # Images, fonts, and static files
```

## 🔧 Configuration

### Appwrite Setup
See [APPWRITE_SETUP.md](APPWRITE_SETUP.md) for detailed backend configuration.

### Environment Variables
- `EXPO_PUBLIC_APPWRITE_ENDPOINT`: Appwrite API endpoint
- `EXPO_PUBLIC_APPWRITE_PROJECT_ID`: Your Appwrite project ID
- `EXPO_PUBLIC_GEMINI_API_KEY`: Gemini AI API key for smart features
- `EXPO_PROJECT_ID`: Expo project ID

## 🧪 Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Run specific test file
npm test -- --testNamePattern="ProjectCard"
```

## 📦 Building for Production

### iOS
```bash
npx expo build:ios
```

### Android
```bash
npx expo build:android
```

### Web
```bash
npx expo build:web
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Workflow
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- [React Native](https://reactnative.dev/) - Mobile app framework
- [Expo](https://expo.dev/) - Development platform
- [Appwrite](https://appwrite.io/) - Backend as a Service
- [React Navigation](https://reactnavigation.org/) - Navigation library
- [React Native Elements](https://reactnativeelements.com/) - UI component library

## 📞 Support

- **Documentation**: [Wiki](https://github.com/yourusername/code-cue/wiki)
- **Issues**: [GitHub Issues](https://github.com/yourusername/code-cue/issues)
- **Discussions**: [GitHub Discussions](https://github.com/yourusername/code-cue/discussions)
- **Email**: support@codecue.app

## 🔄 Changelog

See [CHANGELOG.md](CHANGELOG.md) for a detailed history of changes.

## 📊 Project Status

- **Version**: 2.0.0
- **Status**: Active Development
- **Last Updated**: December 2024

---

<div align="center">
  Made with ❤️ by the CodeCue Team
</div> 