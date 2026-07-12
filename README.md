# HireTrack - Applicant Tracking System

A modern ATS (Applicant Tracking System) built for recruiters to manage job postings and track candidates through the hiring process.

## Features

- **AI Resume Parser**: Upload PDF resumes to automatically extract and populate candidate details (Name, Email, Phone, Skills, Experience, Education) using regex heuristics and high-accuracy Google Gemini AI (when API key is configured).
- **Candidate Match Scoring**: Dynamically calculates and displays overall, skills, experience, and education match percentages comparing candidate profiles against job posting requirements.
- **Kanban Hiring Pipeline**: A drag-and-drop workflow pipeline board categorizing candidates by hiring stage (Applied, Screening, Interview, Technical, HR, Offer, Hired, Rejected) for intuitive candidate movement.
- **Detailed Candidate Drawers**: Beautiful details drawer showcasing match dashboards, contact details, edit forms, timeline history log events, and recruiter comments.
- **History Timeline & Audit Logs**: Auto-generated history logger tracking every transition (e.g. creations, status changes, profile edits, feedback comments) with details of who performed the action.
- **Recruiter Comments**: Collaborative comments thread on candidate profiles letting recruiters post and manage targeted feedback notes.
- **Enhanced Recruitment Analytics**: Visual dashboard charts displaying hiring funnel stage conversions, average Time-to-Hire speed metrics, and required skills demand indices using Recharts.
- **Authentication & Role-Based Access**: Secure JWT-based auth separating Admin, Recruiter, and Viewer roles with appropriate read/write privileges.

## Tech Stack

### Backend
- Node.js with Express
- MongoDB with Mongoose
- JWT for authentication
- bcryptjs for password hashing

### Frontend
- React 18
- React Router for navigation
- TailwindCSS for styling
- Recharts for data visualization
- Lucide React for icons
- Axios for API calls

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (running locally or MongoDB Atlas connection string)
- npm or yarn

## Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd "HireTracker (ATS)"
   ```

2. **Install dependencies**
   ```bash
   npm run install-all
   ```

   This will install dependencies for both the root, backend, and frontend.

3. **Configure environment variables**
   
   The backend `.env` file is already configured with default values. If you wish to enable the AI resume parser, edit `backend/.env` to include your Google Gemini API key:
  ```
  PORT=5000
  MONGODB_URI=mongodb://localhost:27017/hiretracker
  JWT_SECRET=your_jwt_secret_key_here
  NODE_ENV=development
  GEMINI_API_KEY=your_google_gemini_api_key_here
  ```

4. **Start MongoDB**
   
   Make sure MongoDB is running locally on port 27017, or update the `MONGODB_URI` in the `.env` file to use MongoDB Atlas.

## Running the Application

### Development Mode

Run both frontend and backend simultaneously:
```bash
npm run dev
```

This will start:
- Backend server on http://localhost:5000
- Frontend on http://localhost:3000

### Individual Services

**Backend only:**
```bash
cd backend
npm run dev
```

**Frontend only:**
```bash
cd frontend
npm start
```

## Usage

1. **Register an account**
   - Navigate to http://localhost:3000/register
   - Fill in your details and select a role (Admin, Recruiter, or Viewer)

2. **Login**
   - Use your credentials to login at http://localhost:3000/login

3. **Create Jobs**
   - Go to the Jobs page
   - Click "Add Job" to create a new job posting
   - Fill in job details (title, description, department, location, etc.)

4. **Add Candidates**
   - Go to the Candidates page
   - Click "Add Candidate"
   - Fill in candidate information and assign to a job
   - Set initial status (Applied, Screening, Interview, etc.)

5. **Track Progress**
   - Use the Dashboard to view analytics
   - Update candidate status as they progress through the pipeline
   - Search and filter candidates as needed

## Role Permissions

- **Admin**: Full access - can create/edit/delete jobs and candidates
- **Recruiter**: Can create/edit jobs and candidates, but cannot delete jobs
- **Viewer**: Read-only access to view jobs and candidates

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user
- `GET /api/auth/me` - Get current user

### Jobs
- `GET /api/jobs` - Get all jobs
- `GET /api/jobs/:id` - Get single job
- `POST /api/jobs` - Create job (Admin/Recruiter)
- `PUT /api/jobs/:id` - Update job (Admin/Recruiter)
- `DELETE /api/jobs/:id` - Delete job (Admin only)

### Candidates
- `GET /api/candidates` - Get all candidates (with filters)
- `GET /api/candidates/:id` - Get single candidate details
- `POST /api/candidates` - Create candidate (Admin/Recruiter)
- `PUT /api/candidates/:id` - Update candidate (Admin/Recruiter)
- `PATCH /api/candidates/:id/status` - Update candidate status (Admin/Recruiter)
- `DELETE /api/candidates/:id` - Delete candidate (Admin/Recruiter)
- `POST /api/candidates/parse` - Parse PDF resume text (Admin/Recruiter)
- `GET /api/candidates/:id/timeline` - Get candidate activity audit log
- `POST /api/candidates/:id/comments` - Add comment to candidate feedback feed
- `DELETE /api/candidates/:id/comments/:commentId` - Delete comment from candidate

### Analytics
- `GET /api/analytics/dashboard` - Get dashboard analytics (funnel conversion, time-to-hire, top skills)

### Public (Unauthenticated)
- `GET /api/public/jobs` - Get list of open job postings
- `GET /api/public/jobs/:id` - Get detail specifications of a single open job
- `POST /api/public/jobs/:jobId/apply` - Apply to a job posting (handles PDF resume upload and auto-parsing)

## Candidate Status Flow

The hiring pipeline follows these stages:
1. **Applied** - Initial application received
2. **Screening** - Resume review and initial screening
3. **Interview** - Scheduled for interview
4. **Technical** - Technical assessment / take-home tests
5. **HR Round** - Cultural fit and behavioral interview
6. **Offer** - Employment offer extended
7. **Hired** - Offer accepted and candidate onboarded
8. **Rejected** - Candidate rejected at any stage

## Project Structure

```
HireTracker (ATS)/
├── backend/
│   ├── models/          # Mongoose models (User, Job, Candidate, Activity)
│   ├── routes/          # API routes (auth, jobs, candidates, analytics, public)
│   ├── utils/           # Utilities (resumeParser parser engine)
│   ├── middleware/      # Authentication middleware
│   ├── server.js        # Express server setup
│   └── .env             # Environment variables
├── frontend/
│   ├── src/
│   │   ├── components/  # Reusable UI (Layout, CandidateDetailsModal)
│   │   ├── context/     # React state context (AuthContext)
│   │   ├── pages/       # Page components (Dashboard, Jobs, Candidates, Pipeline Kanban, Careers Job Board, Login, Register)
│   │   ├── utils/       # API helper endpoints
│   │   ├── App.jsx      # Main app component with routing
│   │   └── index.js     # Entry point
│   ├── public/          # Static files
│   └── tailwind.config.js
└── package.json         # Root package.json
```

## Troubleshooting

- **MongoDB connection error**: Ensure MongoDB is running and the connection string in `.env` is correct
- **CORS errors**: The backend is configured to allow CORS from all origins in development
- **Port already in use**: Change the PORT in `backend/.env` if port 5000 is unavailable

## License

MIT License - feel free to use this project for your own purposes.
