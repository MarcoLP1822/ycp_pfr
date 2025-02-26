# Web Proofreading App

## Overview

The Web Proofreading App is a modern, minimalistic web application that allows users to upload editable text-based documents (doc, docx, odf, txt) for proofreading. The app leverages an AI-powered language model to scan, proofread, and correct text. It highlights inline corrections and enables users to accept corrections individually or in bulk. Additionally, the system maintains version control to allow rollbacks of changes.

## Features

- **File Management:** 
  - Upload, rename, and delete text-based documents.
  - Initiate and monitor the proofreading process.
- **Proofreading Engine:**
  - AI-powered proofreading for grammar, punctuation, spelling, and orthography.
  - Inline highlighting of corrections.
- **Proofreading Interface:**
  - Side-by-side view of original and corrected texts.
  - Options to accept individual or bulk corrections.
  - Version control for rollbacks.
- **User Management & Security:**
  - Secure authentication using Supabase Auth.
  - Protected routes and database security with Supabase RLS.
- **Modern Design:**
  - Responsive, minimalistic UI built with Tailwind CSS.

## Setup Instructions

### Prerequisites
- **Node.js** (v14 or later)
- **npm** or **yarn**
- **Git**

### Clone the Repository
```bash
git clone https://github.com/your-username/web-proofreading-app.git
cd web-proofreading-app
```

### Install Dependencies
```bash
npm install
```

### Configure Environment Variables
Create a .env.local file in the root of the project and add the following variables:
```bash
# OpenAI API Key for proofreading functionality
OPENAI_API_KEY=your_openai_api_key

# JWT Secret for authentication
JWT_SECRET=your_jwt_secret

# Supabase configuration for Authentication, Storage, and Database
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# PostgreSQL connection URL for Drizzle ORM migrations (if needed)
DATABASE_URL=your_database_url
```
### Database Migrations
To generate and apply database migrations using Drizzle ORM, run:
```bash
npx drizzle-kit generate
npx drizzle-kit migrate
```

### Running the application locally
```bash
npm run dev
```
## Deployment Guidelines
### Deploying to Vercel
This project is pre-configured for deployment on Vercel.

Push your changes to your GitHub repository.
Log in to Vercel and import your repository.
Set the environment variables in the Vercel dashboard (use the same values as in your .env.local file).
Deploy the project. Vercel will automatically build and deploy your application.
###   Alternative Deployment Options
If deploying to another hosting provider:

Ensure that all environment variables are set correctly.
The build command should be npm run build and the start command should be npm run start.
## Testing
This project uses Jest and React Testing Library for unit and integration tests.

Run tests using:

bash
Copia
npm run test
Ensure that all necessary testing dependencies are installed.

## Future Enhancements
Integration of additional LLM APIs for proofreading.
Enhanced performance monitoring and logging.
Support for additional file formats (e.g., PDF).
Expanded version control features.
## Troubleshooting
Environment Variables: Double-check that all required environment variables are correctly set in .env.local or in your deployment provider's configuration.
Database Migrations: Verify your DATABASE_URL and ensure your PostgreSQL instance is running if migrations fail.
Deployment Issues: Review logs in your hosting provider's dashboard (e.g., Vercel) for any error messages.

##   License
This project is licensed under the MIT License.

