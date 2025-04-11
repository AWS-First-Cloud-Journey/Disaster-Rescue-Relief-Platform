# 🚨 Disaster Rescue Relief Platform

<div align="center">
  <img src="src/logo.png" alt="Disaster Rescue Relief Platform Logo" width="200"/>
  
  [![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
  [![AWS](https://img.shields.io/badge/AWS-Cloud-orange)](https://aws.amazon.com)
  [![React](https://img.shields.io/badge/React-18.2.0-blue)](https://reactjs.org)
  [![Node.js](https://img.shields.io/badge/Node.js-18.0.0-green)](https://nodejs.org)
</div>

## 📋 Table of Contents
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Getting Started](#-getting-started)
- [Project Structure](#-project-structure)
- [Development](#-development)
- [Deployment](#-deployment)
- [Contributing](#-contributing)
- [Security](#-security)
- [License](#-license)

## 🌟 Overview

The Disaster Rescue Relief Platform is a comprehensive serverless web application built on AWS that connects disaster victims with volunteers and resources. The platform provides real-time tracking of requests and resource allocation, facilitating efficient coordination between individuals in need, volunteers, and resource managers.

**Live Website**: [https://help.myanmardisasterrelief.com](https://help.myanmardisasterrelief.com)

## ✨ Features

### 👥 For Disaster Victims
- 📝 Submit emergency assistance requests
- 🏥 Specify needs (medical, food, water, shelter)
- 📊 Track request status in real-time
- 🔔 Receive volunteer response updates

### 🤝 For Volunteers
- 📍 View active requests in affected areas
- 👥 Coordinate with other volunteers
- 📦 Manage resource distribution
- 🎯 Register for specialized assistance

### 👨‍💼 For Administrators
- 📈 Data visualization dashboard
- 🗺️ Real-time area monitoring
- 📊 Volunteer activity tracking
- 📑 Resource allocation reports

## 🛠️ Tech Stack

### Frontend
- React.js 18.2.0
- AWS Amplify UI
- CloudScape Design System
- i18next for internationalization
- Recharts for data visualization

### Backend (AWS Serverless)
- **Authentication**: AWS Cognito
- **API**: API Gateway + Lambda
- **Database**: DynamoDB
- **Storage**: S3
- **Notifications**: SNS + SES
- **Maps**: Amazon Location Service
- **Analytics**: AWS Analytics + QuickSight

### DevOps
- **CI/CD**: AWS Amplify Console
- **Monitoring**: CloudWatch
- **Security**: WAF, Shield, Security Hub

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- AWS account
- AWS CLI
- Amplify CLI (`npm install -g @aws-amplify/cli`)

### Installation
```bash
# Clone the repository
git clone https://github.com/AWS-First-Cloud-Journey/Disaster-Rescue-Relief-Platform.git
cd Disaster-Rescue-Relief-Platform

# Install dependencies
yarn install
# or
npm install

# Initialize Amplify
amplify init

# Push Amplify resources
amplify push

# Start development server
yarn start
# or
npm start
```

### Environment Setup
Create `.env` file:
```env
REACT_APP_REGION=your_aws_region
REACT_APP_USER_POOL_ID=your_cognito_user_pool_id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your_cognito_client_id
```

## 📁 Project Structure
```
src/
├── components/          # Reusable UI components
├── views/              # Page components
├── services/           # API and business logic
├── hooks/              # Custom React hooks
├── utils/              # Utility functions
├── constants/          # Constants and configurations
├── assets/             # Static assets
└── styles/             # Global styles
```

## 💻 Development

### Available Scripts
```bash
# Start development server
yarn start

# Build for production
yarn build

# Run tests
yarn test

# Lint code
yarn lint

# Format code
yarn format

# Analyze bundle size
yarn analyze
```

### Code Style
- Follow ESLint configuration
- Use Prettier for code formatting
- Follow React best practices
- Write meaningful commit messages

## 🚀 Deployment

### Production Deployment
```bash
# Push changes
git add .
git commit -m "Your commit message"
git push origin main

# Deploy with Amplify
amplify publish
```

### Branch Strategy
- `main`: Production branch
- `develop`: Development branch
- `feature/*`: Feature branches
- `hotfix/*`: Hotfix branches

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Pull Request Process
1. Update documentation
2. Add tests if applicable
3. Ensure all tests pass
4. Get code review approval
5. Merge to develop branch

## 🔒 Security

### Security Measures
- Role-based access control (Cognito)
- Field-level encryption
- WAF protection
- DDoS protection (AWS Shield)
- Security monitoring (Security Hub)

### Reporting Vulnerabilities
Please report security vulnerabilities to security@myanmardisasterrelief.com

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS Amplify team
- Emergency response organizations
- All contributors and volunteers
- Open source community

---

<div align="center">
  <p>Built with ❤️ for disaster relief efforts</p>
</div>