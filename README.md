# Evalis – Unified College Assessment Portal with Secure Proctoring and Analytics

## Overview

Evalis is a full-stack in-house assessment ecosystem designed for educational institutions to conduct secure examinations, AI-powered practice sessions, automated evaluation, and performance analytics.

The platform provides separate dashboards for Administrators, Teachers, and Students while integrating secure code execution, AI proctoring, Retrieval-Augmented Generation (RAG) based question generation, and AI-driven mentorship.


---

## Key Features

### Secure Online Examination System
- MCQ and coding assessments
- Automated grading
- Exam scheduling and management
- Role-based access control

### Docker-Based Code Execution Engine
- Secure isolated execution environment
- Multi-language support
- Time and memory constraints
- Automated evaluation against hidden test cases

### AI Proctoring System
- Face detection
- Multiple-person detection
- Tab-switch monitoring
- Fullscreen monitoring
- Automatic exam suspension for violations

### AI-Powered Practice Mode
- Personalized study plans
- Big-O complexity analysis
- Code quality feedback
- Learning recommendations

### RAG-Based Question Generation
- Upload syllabus or lecture PDFs
- Generate curriculum-aligned MCQs
- Generate coding questions
- Context-aware question creation using Gemini AI

### Analytics & Reporting
- Student performance analytics
- Exam statistics
- Proctoring reports
- Teacher insights dashboard

### Cross-Platform Support
- Web Application (Admin, Teacher, Student)
- Mobile Application (React Native)

---

## System Architecture

Evalis consists of:

- React.js Web Dashboard
- React Native Mobile Application
- FastAPI Backend
- MongoDB Atlas Database
- Docker Sandbox Engine
- Google Gemini AI Services
- OpenCV & MediaPipe Proctoring Engine
- AWS EC2 Execution Environment

---

## Technology Stack

| Layer | Technology |
|---------|------------|
| Frontend | React.js, TailwindCSS, Framer Motion |
| Mobile | React Native (Expo) |
| Backend | FastAPI, Python |
| Database | MongoDB Atlas |
| Authentication | JWT |
| AI Services | Google Gemini 2.5 Flash |
| Proctoring | OpenCV, MediaPipe |
| Code Execution | Docker |
| Cloud Infrastructure | AWS EC2 |
| Deployment | Vercel, Render |

---

## Repository Structure

Evalis/
│
├── backend/
├── frontend/
│   └── evalis-student-ui/
├── evalis-mobile/
├── EC2/
│
├── README.md
└── configuration files
```

---

## Installation

### Prerequisites

- Python 3.11+
- Node.js 18+
- MongoDB Atlas Account
- Docker
- Git

---

### Clone Repository

```bash
git clone https://github.com/reevacodes/Evalis.git
cd evalis
```

---

### Backend Setup

```bash
cd backend

pip install -r requirements.txt

uvicorn app.main:app --reload
```

---

### Frontend Setup

```bash
cd frontend/evalis-student-ui

npm install

npm run dev
```

---

### Mobile Application Setup

```bash
cd evalis-mobile

npm install

npx expo start
```

---

## Environment Variables

Create a `.env` file inside the backend directory:

```env
MONGODB_URI=your_mongodb_uri
JWT_SECRET=your_secret
GEMINI_API_KEY=your_api_key
AWS_SANDBOX_URL=your_ec2_endpoint
```

---

## Deployment

### Frontend
- Vercel

### Backend
- Render

### Sandbox Engine
- AWS EC2

### Database
- MongoDB Atlas

## Live Demo

### Frontend Application
https://evalis-nine.vercel.app/

### Backend API
Hosted on Render

> Note: Backend service is deployed on Render and connected to the frontend application.

## Deployment Architecture

Frontend (React.js)
      │
      ▼
Backend (FastAPI on Render)
      │
      ▼
MongoDB Atlas
      │
      ├── Google Gemini API
      ├── Docker Sandbox Engine (AWS EC2)
      └── AI Proctoring Services

---

## Major Modules

### Module 1 – Docker Sandbox Execution Engine
Secure execution of student code using isolated Docker containers.

### Module 2 – AI Proctoring System
Real-time examination monitoring using computer vision.

### Module 3 – RAG Question Generator
Curriculum-grounded question generation from uploaded PDFs.

### Module 4 – Background Workers
Automated scheduling, grading, and email notifications.

### Module 5 – Cross-Platform Client Ecosystem
Web and mobile interfaces for all stakeholders.

---

## Team Members

- Reeva Gupta (2022A1R144)
- Arpit Thakur (2022A1R159)
- Vidhi Mahajan (2022A1R158)

---

## Future Enhancements

- Adaptive examinations
- Code plagiarism detection
- Large-scale concurrent load support
- LMS integration (Moodle, Canvas)
- Persistent vector databases for RAG

---

## License

This project was developed for academic and educational purposes as part of the Bachelor of Technology (Computer Science & Engineering) curriculum at MIET Jammu.
