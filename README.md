# NestJS File Upload Service

A NestJS application for uploading files to Google Drive with PostgreSQL database integration.

## Prerequisites

- Docker Compose installed in your system
- Google Cloud Platform account with Google Drive API enabled
- Google Service Account credentials

## Getting Started

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd <repository-name>
   ```

2. **Environment Setup**

   - Copy `.env.example` to `.env`:
     ```bash
     cp .env.example .env
     ```
   - Update the `.env` file with your Google Drive API credentials (see [Obtaining Google Drive API Credentials](#obtaining-google-drive-api-credentials) section)

3. **Docker Compose Setup**

   - `docker-compose.override.yml.example` is a sample file for local development. Copy `docker-compose.override.yml.example` to `docker-compose.override.yml`:
     ```bash
     cp docker-compose.override.yml.example docker-compose.override.yml
     ```
   - Update the override file with your local development settings if needed

4. **Start the Application**

   ```bash
   # Start the application with Docker Compose
   docker-compose up -d
   ```

   The application will be available at `http://localhost:3000` (or other port if you configured it in `docker-compose.override.yml`)

## Obtaining Google Drive API Credentials

1. **Create a Google Cloud Project**

   - Go to [Google Cloud Console](https://console.cloud.google.com/)
   - Click "Create Project" and follow the setup process

2. **Enable Google Drive API**

   - In your project dashboard, go to "APIs & Services" > "Library"
   - Search for "Google Drive API"
   - Click "Enable"

3. **Create Service Account**

   - Go to "APIs & Services" > "Credentials"
   - Click "Create Credentials" > "Service Account"
   - Fill in the service account details
   - Click "Create and Continue"
   - For the role, select "Basic" > "Editor"
   - Click "Done"

4. **Generate Service Account Key**

   - In the service accounts list, find your newly created account
   - Click on it and go to the "Keys" tab
   - Click "Add Key" > "Create new key"
   - Choose JSON format
   - Click "Create"
   - The JSON key file will be downloaded automatically

5. **Share Google Drive Folder**

   - Create a folder in your Google Drive
   - Right-click the folder and select "Share"
   - Add your service account email (it looks like `your-service-account@your-project-id.iam.gserviceaccount.com`)
   - Give it "Editor" access
   - Click "Share"

6. **Configure Environment Variables**
   - Add your Google Drive folder ID to `.env` file as `GOOGLE_DRIVE_FOLDER_ID` (you can find it in the folder's URL: `https://drive.google.com/drive/folders/YOUR_FOLDER_ID`)
   - Open the downloaded JSON key file, copy private key and set it as `GOOGLE_PRIVATE_KEY` in `.env` file (it should be a single line string)
   - Add your service account email to `.env` file as `GOOGLE_SERVICE_ACCOUNT_EMAIL`

## API Documentation

Once the application is running, you can access the Swagger documentation at:

```
http://localhost:3000/swagger
```

## Dependencies

- NestJS Framework
- TypeORM for database operations
- Google Drive API integration
- PostgreSQL database
- Swagger for API documentation
