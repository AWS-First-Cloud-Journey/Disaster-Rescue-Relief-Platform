# Myanmar Disaster Relief Platform

## Overview

The Myanmar Disaster Relief Platform is a comprehensive serverless web application built on AWS that connects those affected by disasters in Myanmar with volunteers and resources. The platform provides real-time tracking of requests and resource allocation, facilitating efficient coordination between individuals in need, volunteers, and resource managers.

The live website is accessible at: [https://help.myanmardisasterrelief.com](https://help.myanmardisasterrelief.com)

## Key Features

### For Disaster Victims
- Submit requests for emergency assistance through an intuitive interface
- Specify needs (medical help, food, water, shelter)
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

- **Frontend**: React.js with Amplify UI and AWS CloudScape Design System
- **Backend**: AWS Serverless Architecture
  - **Authentication**: AWS Cognito
  - **API**: API Gateway with Lambda
  - **Database**: DynamoDB
  - **Storage**: S3
  - **Notifications**: SNS and SES
  - **Maps**: Amazon Location Service
  - **Analytics**: AWS Analytics services with QuickSight
- **CI/CD**: AWS Amplify Console
- **Monitoring**: CloudWatch
- **Security**: WAF, Shield, and Security Hub

## Project Structure

```
ReliefConnect/
├── amplify/              # AWS Amplify configuration
│   ├── backend/          # Backend resources
│   │   ├── api/          # API definitions
│   │   ├── auth/         # Authentication configuration
│   │   ├── function/     # Lambda functions
│   │   ├── storage/      # Storage configuration
│   │   └── ...          
├── public/               # Static assets
├── src/                  # Source code
│   ├── components/       # Reusable UI components
│   ├── views/            # Page components
│   │   ├── Dashboard.jsx  # Data visualization dashboard
│   │   ├── Home.jsx       # Landing page
│   │   ├── RequestForm.jsx # Form for submitting assistance requests
│   │   └── RequestList.jsx # List of active requests
│   ├── App.js            # Main application component
│   └── ...
├── test/                 # Test files
└── ...
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
   git clone https://github.com/AWS-First-Cloud-Journey/Disaster-Rescue-Relief-Platform.git
   cd Disaster-Rescue-Relief-Platform
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

Create a `.env` file in the root directory with necessary configuration:
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
- Active Requests
- Volunteers Deployed
- Fulfilled Requests
- Affected Areas
- Request types (Medical, Water, Food, Shelter, Other)
- Request status (Pending, Verified, Fulfilled)
- Geographic distribution of requests
- Recent request listings with filtering capabilities

## Deployment

The application is configured for continuous deployment with AWS Amplify:

1. Commit your changes to the repository
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin master
   ```

2. Deploy using Amplify
   ```bash
   amplify publish
   ```

## Branching Strategy

- **Production**: `master` branch

## Security Considerations

The platform implements several security measures:
- Role-based access control with Cognito
- Field-level encryption for sensitive data
- WAF for API Gateway protection
- AWS Shield for DDoS protection
- Security Hub for compliance monitoring

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