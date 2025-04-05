# EMERGENCY-RESPONSE-APP

## Overview

EMERGENCY-RESPONSE-APP (DisasterRescue) is a comprehensive web application designed to connect those in need with volunteers and resources during disaster situations. The platform facilitates coordination between affected individuals, volunteers, and resource managers, providing real-time data visualization and resource allocation tracking.

## Features

### For Those Affected by Disasters
- Submit requests for emergency assistance
- Specify needs (medical, food, water, shelter)
- Track request status in real-time
- Receive updates on volunteer response

### For Volunteers
- View active requests in affected areas
- Coordinate with other volunteers and donors
- Manage and track resource distribution
- Register to provide specialized assistance

### For Coordinators/Administrators
- Data dashboard with visualizations of requests and resources
- Real-time monitoring of affected areas
- Track volunteer activity and resource allocation
- Generate reports on disaster response efforts

## Tech Stack

- **Frontend**: React.js/Amplify UI/ Cloud Scape Design
- **Backend**: AWS Amplify services/ Lambda function
- **Authentication**: AWS Cognito
- **API**: API Gateway
- **Storage**: AWS DynamoDB/S3
- **Functions**: AWS Lambda
- **Charting**: Recharts for data visualization

## Project Structure

```
EMERGENCY-RESPONSE-APP/
├── .vscode/              # VS Code configuration
├── amplify/              # AWS Amplify configuration
│   ├── backend/          # Backend resources
│   │   ├── api/          # API definitions
│   │   ├── auth/         # Authentication configuration
│   │   ├── function/     # Lambda functions
│   │   ├── storage/      # Storage configuration
│   │   ├── types/        # Type definitions
│   │   ├── backend-config.json
│   │   ├── tags.json
│   │   ├── cli.json
│   │   └── team-provider-info.json
│   └── node_modules/     # Backend dependencies
├── public/               # Static assets
│   ├── favicon.ico
│   ├── index.html
│   ├── logo192.png
│   ├── logo512.png
│   ├── manifest.json
│   └── robots.txt
├── src/                  # Source code
│   ├── components/       # Reusable UI components
│   │   ├── AuthForm.css
│   │   └── AuthForm.jsx
│   ├── views/            # Page components
│   │   ├── Dashboard.jsx  # Data visualization dashboard
│   │   ├── Home.jsx       # Landing page
│   │   ├── RequestForm.jsx # Form for submitting assistance requests
│   │   └── RequestList.jsx # List of active requests
│   ├── amplifyconfig.json
│   ├── App.css
│   ├── App.js            # Main application component
│   ├── App.test.js
│   ├── aws-exports.js    # AWS configuration
│   ├── base.scss
│   ├── index.css
│   ├── index.js          # Application entry point
│   ├── logo.png
│   ├── logo.svg
│   ├── reportWebVitals.js
│   ├── setupTests.js
│   └── style.scss        # Global styles
├── test/                 # Test files
├── .env                  # Environment variables
├── .gitignore
├── package-lock.json
├── package.json          # Project dependencies
├── README.md
└── yarn.lock
```

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- AWS account
- AWS CLI configured locally
- Amplify CLI (`npm install -g @aws-amplify/cli`)

### Installation

1. Clone the repository
   ```bash
   git clone https://github.com/yourusername/EMERGENCY-RESPONSE-APP.git
   cd EMERGENCY-RESPONSE-APP
   ```

2. Install dependencies
   ```bash
   yarn install
   # or
   npm install
   ```

3. Initialize Amplify (if setting up a new environment)
   ```bash
   amplify init
   ```

4. Push Amplify resources to AWS
   ```bash
   amplify push
   ```

5. Start the development server
   ```bash
   yarn start
   # or
   npm start
   ```

6. Open [http://localhost:3000](http://localhost:3000) to view the application in your browser

### Environment Setup

Make sure to have a `.env` file in the root directory with necessary configuration:
```
REACT_APP_REGION=your_aws_region
REACT_APP_USER_POOL_ID=your_cognito_user_pool_id
REACT_APP_USER_POOL_WEB_CLIENT_ID=your_cognito_client_id
```

## Main Application Screens

### Home Page
Landing page with options to request help, volunteer, or access the dashboard

### Request Form
User-friendly form for submitting assistance requests with categories for different types of aid

### Dashboard
Data visualization interface showing:
- Active Requests (247)
- Volunteers (89)
- Fulfilled Requests (156)
- Affected Areas (12)
- Request types (Medical, Water, Food, Shelter, Other)
- Request status (Pending, Verified, Fulfilled)
- Geographic distribution of requests
- Recent request listings with filtering capabilities

### Request List
Overview of all requests with status tracking and management options

## Deployment

The application is configured for deployment with AWS Amplify:

1. Commit your changes to the repository
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```

2. Deploy using Amplify
   ```bash
   amplify publish
   ```

## Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Future Enhancements

- Mobile application for on-the-ground volunteers
- Offline functionality for areas with limited connectivity
- Integration with weather and disaster alert systems
- Machine learning for optimizing resource allocation
- Multi-language support for international deployment

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Acknowledgments

- Built with AWS Amplify for scalable cloud infrastructure
- Designed to address critical needs during disaster response scenarios
- Special thanks to all contributors and emergency response organizations for their input and feedback