# Contributing to Disaster-Rescue-Relief-Platform

Thank you for your interest in contributing to the Disaster-Rescue-Relief-Platform! This document provides guidelines and instructions for contributing to this project.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Environment Setup](#development-environment-setup)
- [Branching Strategy](#branching-strategy)
- [Commit Guidelines](#commit-guidelines)
- [Pull Request Process](#pull-request-process)
- [Testing](#testing)
- [Issue Reporting](#issue-reporting)
- [Feature Requests](#feature-requests)
- [Documentation](#documentation)
- [Code Review Process](#code-review-process)
- [Community](#community)

## Code of Conduct

This project adheres to a Code of Conduct that all contributors are expected to follow. By participating, you are expected to uphold this code.

We expect all contributors to:
- Be respectful and inclusive
- Exercise empathy and kindness
- Be open to constructive feedback
- Focus on what is best for the community and the disaster relief efforts
- Show courtesy and respect towards other community members

## Getting Started

Before contributing to the Disaster-Rescue-Relief-Platform, please:

1. Read the [README.md](README.md) to understand the project's purpose and functionality
2. Review open issues that need assistance
3. Check for existing pull requests that might be addressing your intended changes

## Development Environment Setup

To set up your development environment:

1. Fork the repository
2. Clone your fork:
   ```bash
   git clone https://github.com/YOUR-USERNAME/Disaster-Rescue-Relief-Platform.git
   cd Disaster-Rescue-Relief-Platform
   ```
3. Add the original repository as upstream:
   ```bash
   git remote add upstream https://github.com/AWS-First-Cloud-Journey/Disaster-Rescue-Relief-Platform.git
   ```
4. Install dependencies:
   ```bash
   npm install
   # or 
   yarn install
   ```
5. Initialize AWS Amplify (if you have appropriate AWS credentials):
   ```bash
   amplify init
   ```
6. Start the development server:
   ```bash
   npm start
   # or
   yarn start
   ```

## Branching Strategy

- **master**: The production branch, should always be stable
- **develop**: Main development branch
- **feature/**: Feature branches should be created from develop
- **bugfix/**: Bug fix branches should be created from develop
- **hotfix/**: Critical fixes that need to be applied to production

Always create a new branch for your work:
```bash
git checkout develop
git pull upstream develop
git checkout -b feature/your-feature-name
```

## Commit Guidelines

- Write clear, concise commit messages
- Use the imperative mood ("Add feature" not "Added feature")
- Reference issues and pull requests where appropriate
- For significant changes, provide detailed descriptions

Example:
```
feat: add volunteer registration form

- Create form component with validation
- Add AWS Lambda function for registration process
- Update authentication flow for volunteer roles

Fixes #123
```

We recommend following the [Conventional Commits](https://www.conventionalcommits.org/) specification.

## Pull Request Process

1. Update your feature branch with the latest changes from develop:
   ```bash
   git checkout develop
   git pull upstream develop
   git checkout feature/your-feature-name
   git rebase develop
   ```

2. Push your branch to your fork:
   ```bash
   git push -u origin feature/your-feature-name
   ```

3. Create a pull request via the GitHub interface
   - Provide a clear description of the changes
   - Link any related issues
   - Add reviewers from the core team

4. Address review comments and make requested changes
   - Push additional commits to your branch
   - For requested changes, update your PR by adding new commits

5. Once approved, your PR will be merged by a maintainer

## Testing

- Write unit tests for all new features and bug fixes
- Ensure all tests pass before submitting a pull request
- Run tests locally:
  ```bash
  npm test
  # or
  yarn test
  ```
- Consider adding integration tests for complex features

## Issue Reporting

When reporting issues:

1. Use the issue templates provided in the repository
2. Provide a clear, descriptive title
3. Include detailed steps to reproduce the issue
4. Add information about your environment (browser, device, OS)
5. Include screenshots or error messages if applicable
6. Label the issue appropriately (bug, enhancement, documentation, etc.)

## Feature Requests

For feature requests:

1. Check if the feature has already been suggested or is in development
2. Use the feature request template
3. Clearly describe the feature and its value to the project
4. Consider how it aligns with the project's goals
5. If possible, outline how the feature might be implemented

## Documentation

Improvements to documentation are always welcome:

- Update the README.md with new features or changes
- Add or improve inline code documentation
- Create or update wiki pages
- Add examples and use cases

## Code Review Process

All submissions require review before being merged:

- At least one approval from a core maintainer is required
- Code should follow the project's style guidelines
- Tests must pass in the CI pipeline
- Documentation should be updated as needed

## Community

- Join our [Discussion forum](https://github.com/AWS-First-Cloud-Journey/Disaster-Rescue-Relief-Platform/discussions) (if available)
- Participate in issue discussions
- Help answer questions from other contributors
- Share the project with others who might be interested

## AWS Resources

Since this project uses AWS services extensively, contributors should:

1. Have basic familiarity with AWS services (Amplify, Lambda, DynamoDB, etc.)
2. Use AWS free tier when possible for development
3. Be careful with deployments that might incur costs
4. Document any changes to AWS resource configurations

Thank you for contributing to the Disaster-Rescue-Relief-Platform! Your efforts help provide crucial support to those affected by disasters.
