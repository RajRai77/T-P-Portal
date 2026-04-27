<div align="center">

# TnP Connect

### *The AI-Driven Training & Placement Ecosystem for Engineering Institutions*

[![Angular](https://img.shields.io/badge/Angular-19-DD0031?style=for-the-badge&logo=angular&logoColor=white)](https://angular.io/)
[![Spring Boot](https://img.shields.io/badge/Spring_Boot-3.5.6-6DB33F?style=for-the-badge&logo=springboot&logoColor=white)](https://spring.io/projects/spring-boot)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Gemini AI](https://img.shields.io/badge/Gemini_AI-v1beta-8E75B2?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)
[![LangChain4j](https://img.shields.io/badge/LangChain4j-0.36.2-1C3C3C?style=for-the-badge&logo=chainlink&logoColor=white)](https://github.com/langchain4j/langchain4j)
[![Java](https://img.shields.io/badge/Java-17-ED8B00?style=for-the-badge&logo=openjdk&logoColor=white)](https://openjdk.org/)

[![Build Status](https://img.shields.io/badge/Build-Passing-2ea44f?style=flat-square&logo=github-actions)](/)
[![Version](https://img.shields.io/badge/Version-1.0.0-blue?style=flat-square)](/)
[![License](https://img.shields.io/badge/License-MIT-yellow?style=flat-square)](LICENSE)
[![API Docs](https://img.shields.io/badge/API_Docs-Swagger_UI-85EA2D?style=flat-square&logo=swagger)](http://localhost:8080/swagger-ui.html)

<br/>

![TnP Connect Hero Banner](https://placehold.co/1200x400/141413/F3F0EE?text=TnP+Connect+%E2%80%94+Placement+Intelligence+Redefined)

<br/>

**[Live Demo](#)** · **[API Documentation](#api-documentation)** · **[Architecture Diagrams](ARCHITECTURE.md)** · **[Report Bug](#)**

</div>

---

## The Problem

Engineering colleges manage placement processes through a fragmented patchwork of WhatsApp broadcasts, Excel sheets, email chains, and notice boards. Students miss critical deadlines. Faculty lack real-time visibility. Recruiters receive unfiltered, unprepared applicants.

**TnP Connect** eliminates this chaos.

It is a full-stack, production-grade Training and Placement Cell Connectivity Platform that unifies the entire placement lifecycle — from internship discovery and session management to AI-powered resume building and mock interview preparation — into a single, institution-grade ecosystem.

> **From scattered spreadsheets to an AI-driven, centralized command center for every placement stakeholder.**

---

## Core Features

### AI-Powered Career Intelligence (Google Gemini + LangChain4j)

The platform integrates a full **AI Career Suite** via LangChain4j's Vertex AI Gemini bridge, enabling production-grade AI workflows with rate-limit handling, timeout guards, and structured JSON response parsing.

| Feature | Description |
|---|---|
| **Resume Builder** | Multi-section resume editor (Experience, Education, Skills, Hobbies + unlimited Custom Sections) with live right-panel preview. One click triggers Gemini to structurally optimize the entire document. Fully draggable section ordering via HTML5 Drag-and-Drop. Export to PDF via jsPDF + html2canvas. |
| **Career Roadmap Generator** | Student specifies a target role (e.g., "ML Engineer"). Backend constructs a role-aware prompt; Gemini returns a month-by-month skill and project roadmap rendered as structured timeline cards. |
| **Mock Interview Transcript** | Configurable difficulty modes: Introduction & Basics, Medium Technical, Deep-Dive Technical, HR/Behavioral, Stress/Rapid Fire. Gemini generates a realistic 3–4 page interviewer–candidate transcript. Exportable as formatted PDF. |
| **Floating AI Chatbot** | Persistent bubble-style chatbot overlay backed by `ChatbotService`. Answers placement-related queries contextually. Hides behind the profile drawer via z-index management when the drawer opens. |
| **Semantic Resume Parser** | Parses uploaded PDF resumes using Apache PDFBox, generates vector embeddings via `EmbeddingService`, and uses cosine similarity (`CosineSimilarityUtil`) to match students to live internship JD requirements. |

### Smart Dashboarding

- **Dual-role dashboards**: Entirely separate UI experiences for Students and TnP Admins (Faculty/Placement Officers).
- **Real-time KPI cards**: Active internships, submitted applications, upcoming sessions, active contests — computed live from backend data.
- **Interactive Chart.js visualizations**: Application status doughnut chart with live `PENDING`, `SHORTLISTED`, `SELECTED`, `REJECTED` breakdown.
- **Expandable Job Cards**: Each internship/session card uses progressive disclosure — click to expand inline with full details and the posting admin's profile.
- **Application Tracker Table**: Sortable status tracker showing every application with company, role, date applied, and current pipeline stage.

### Role-Based Access Control

The system enforces a strict dual-role architecture secured by **JWT (JJWT 0.11.5)** with HTTP Interceptors on the frontend.

**Admin (TnP Faculty / Placement Officer)**
- Post, update, and delete Internship Drives and Sessions with deadline management
- Broadcast targeted Notifications filtered by student Branch and Year
- Manage the full Resource Library (study material, placement guides, PDFs)
- Host and manage Coding Contests with external Arena links
- View detailed student applicant summaries and registration lists
- Full admin profile with LinkedIn/WhatsApp/Email contact exposure to students

**Student**
- Discover and apply to active internship drives (with real-time deadline enforcement)
- Register for placement sessions and masterclasses
- Access the complete AI Career Suite
- Manage a rich structured profile (skills, experiences as JSON, projects, GitHub/LinkedIn links, CGPA, about me)
- Explore the **Profile Constellation** — an interactive CSS-based 3D star-map visualizer of skills and achievements

### Modern UI/UX Design System

Built on a custom **Mastercard-inspired design system** (documented in `DESIGN.md`):

| Design Token | Value | Usage |
|---|---|---|
| Canvas Cream | `#F3F0EE` | Page canvas background |
| Ink Black | `#141413` | Headlines, primary CTAs, footer |
| Signal Orange | `#CF4500` | Accent, urgency, hover states |
| Sofia Sans | Primary Font | Body and display typography |
| Border Radius (Card) | `20px` | All card containers |
| Border Radius (Button) | `20px` (pill) | All interactive buttons |
| Shadow Level 2 | `0 24px 48px rgba(0,0,0,0.08)` | Elevated cards |

- **Sliding Profile Drawer** — 360px right-side panel with smooth cubic-bezier transition, circular avatar, skill pills, AI suggestion card, and Profile Constellation quick-link
- **Dark Mode** — Full theme toggle via `:host-context(.dark-theme)` CSS variable remapping
- **Drag-and-Drop** — HTML5 native resume section reordering (no external DnD library)
- **Inline SVG icon system** — All emoji replaced with professional Lucide-style inline SVG icons for production quality

---

## Architecture & Tech Stack

```
+---------------------------------------------------------------+
|                    Angular 19 Frontend                        |
|  Components · Services · Guards · HTTP Interceptors (JWT)     |
+-------------------------------+-------------------------------+
                                |  REST/JSON  (HTTP + JWT Bearer)
+-------------------------------v-------------------------------+
|                 Spring Boot 3.5.6 Backend                     |
|  Controllers · Services · JPA Repositories · JWT Filter       |
|  EmailService · FileStorageService · LangChain4j AI Bridge    |
+---------------+-------------------------------+---------------+
                |                               |
+---------------v-----------+   +---------------v---------------+
|   PostgreSQL 16            |   |  Google Gemini v1beta         |
|   (Primary Datastore)      |   |  via LangChain4j Vertex AI    |
|   Spring Data JPA / ORM    |   |  langchain4j-vertex-ai-gemini |
+----------------------------+   +-------------------------------+
```

### Detailed Stack Breakdown

| Layer | Technology | Version | Purpose |
|---|---|---|---|
| **Frontend Framework** | Angular | 19 (NgModule) | SPA, routing, DI, reactive forms |
| **Angular Build** | Angular CLI | 19.x | Build, serve, optimise |
| **Charting** | Chart.js | 4.x | Doughnut & bar visualisations |
| **PDF Export (Client)** | jsPDF + html2canvas | Latest | Client-side PDF generation from HTML canvas |
| **Backend Framework** | Spring Boot | 3.5.6 | REST API, security, DI container |
| **ORM** | Spring Data JPA / Hibernate | 3.5.x | Entity persistence, relationship mapping |
| **Security** | JJWT (io.jsonwebtoken) | 0.11.5 | JWT generation, validation, expiry |
| **AI Orchestration** | LangChain4j | 0.36.2 | Prompt chaining, structured output, Gemini bridge |
| **AI Model** | Google Gemini | v1beta | LLM for resume optimisation, roadmap, interview |
| **PDF Processing (Server)** | Apache PDFBox | 3.0.2 | Server-side resume text extraction |
| **Database** | PostgreSQL | 16 | All relational data (students, internships, sessions) |
| **Email** | Spring Boot Mail | 3.5.x | Verification emails, notification triggers |
| **API Documentation** | SpringDoc OpenAPI | 2.8.9 | Swagger UI at `/swagger-ui.html` |
| **Build Tool** | Maven | 3.x | Backend dependency management, packaging |
| **Code Generation** | Lombok | Latest | `@Data`, `@Builder`, constructor boilerplate |

> **Architecture Diagrams:** See [ARCHITECTURE.md](ARCHITECTURE.md) for detailed Mermaid sequence diagrams covering Auth, AI, Internship, Profile, and Notification flows.

---

## Getting Started

### Prerequisites

| Requirement | Minimum Version |
|---|---|
| Java JDK | 17+ |
| Node.js | 18+ |
| npm | 9+ |
| Angular CLI | 19.x (`npm i -g @angular/cli@19`) |
| PostgreSQL | 16+ |
| Maven | 3.8+ |

---

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/tnp-connect.git
cd tnp-connect
```

### 2. Database Setup

```sql
CREATE DATABASE tnp_connect;
CREATE USER tnp_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE tnp_connect TO tnp_user;
```

### 3. Backend Configuration

Edit **`backend/src/main/resources/application.properties`**:

```properties
# ── Database ─────────────────────────────────────────────────────────
spring.datasource.url=jdbc:postgresql://localhost:5432/tnp_connect
spring.datasource.username=tnp_user
spring.datasource.password=your_secure_password
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=false

# ── JWT Security ──────────────────────────────────────────────────────
jwt.secret=your_256_bit_hex_secret_key_minimum_32_chars
jwt.expiration=86400000

# ── Google Gemini AI  <<< REQUIRED >>>  ───────────────────────────────
ai.gemini.api-key=YOUR_GEMINI_API_KEY_HERE
ai.gemini.model-name=gemini-1.5-flash

# ── Email (SMTP — Gmail example) ──────────────────────────────────────
spring.mail.host=smtp.gmail.com
spring.mail.port=587
spring.mail.username=your_college_email@gmail.com
spring.mail.password=your_gmail_app_password
spring.mail.properties.mail.smtp.auth=true
spring.mail.properties.mail.smtp.starttls.enable=true

# ── File Storage ──────────────────────────────────────────────────────
file.upload-dir=./uploads

# ── Server ────────────────────────────────────────────────────────────
server.port=8080
```

> **Gemini API Key:** Obtain your free key at [ai.google.dev](https://ai.google.dev). The `gemini-1.5-flash` model is recommended for optimal speed/cost balance in a college deployment scenario.

> **Gmail App Password:** Enable 2-Factor Authentication on your Google account, then generate an App Password at [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords).

### 4. Run the Backend

```bash
cd backend
./mvnw spring-boot:run
```

- API base URL: `http://localhost:8080`
- Swagger UI: `http://localhost:8080/swagger-ui.html`
- The schema will auto-migrate via `spring.jpa.hibernate.ddl-auto=update`

### 5. Frontend Setup & Run

```bash
cd frontend2
npm install
ng serve
```

Application available at: **`http://localhost:4200`**

> All `/api/**` calls are proxied to `http://localhost:8080`. Ensure the backend is running first.

---

## API Documentation

| Endpoint Group | Base Path | Key Operations |
|---|---|---|
| Student Auth | `/api/students` | Register, Login (JWT), Get Profile, Update Profile |
| Admin Auth | `/api/admin` | Register, Login (JWT), Get Profile |
| Internships | `/api/internships` | CRUD, Get All, Get by Admin |
| Internship Applications | `/api/applications` | Apply, Get By Student, Get By Internship |
| Sessions | `/api/sessions` | CRUD, Get All, Get by Admin |
| Session Registrations | `/api/session-registrations` | Register, Get By Student, Get By Session |
| Contests | `/api/contests` | CRUD, Get All |
| Resources | `/api/resources` | CRUD, Get All |
| Notifications | `/api/notifications` | Create, Get All, Get by Branch/Year |
| Notes | `/api/notes` | CRUD personal notes |
| AI Suite | `/api/ai` | Resume optimize, Roadmap, Interview, Chat, Parse Resume |
| File Management | `/api/files` | Upload resume PDF, Download by filename |
| Admin Profiles | `/api/admin/profile` | Get admin profile with contact info |

**Full API contract with request/response schemas:** [`API DOCS.md`](API%20DOCS.md)

---

## Screenshots

| Dashboard Overview | AI Resume Builder |
|:---:|:---:|
| ![Dashboard](https://placehold.co/500x320/F3F0EE/141413?text=Dashboard+Overview) | ![Resume Builder](https://placehold.co/500x320/F3F0EE/141413?text=AI+Resume+Builder) |

| Mock Interview Transcript | Profile Constellation |
|:---:|:---:|
| ![Mock Interview](https://placehold.co/500x320/F3F0EE/141413?text=Mock+Interview+Transcript) | ![Constellation](https://placehold.co/500x320/141413/F3F0EE?text=Profile+Constellation) |

---

## Project Structure

```
tnp-connect/
├── backend/
│   └── src/main/java/com/fsd_CSE/TnP_Connect/
│       ├── ai/
│       │   ├── config/          # GeminiConfig.java — LangChain4j model setup
│       │   ├── controller/      # AiController.java — /api/ai/** endpoints
│       │   ├── dto/             # AiDtos.java — request/response DTOs
│       │   ├── service/         # ResumeAiService, InterviewService,
│       │   │                    #   RoadmapService, ChatbotService,
│       │   │                    #   EmbeddingService, ResumeParserService
│       │   └── util/            # CosineSimilarityUtil.java
│       ├── controllers/         # Domain REST controllers
│       │                        #   (Internship, Session, Contest, Resource,
│       │                        #    Notification, Student, TnPAdmin, File, Note)
│       ├── Enitities/           # JPA Entities
│       │                        #   Student, TnPAdmin, Internship,
│       │                        #   InternshipApplication, Session,
│       │                        #   SessionRegistration, Contest,
│       │                        #   Resource, Notification, Notes
│       ├── Repository/          # Spring Data JPA Repositories (all entities)
│       ├── Response/            # DTOs — Request/Response/Summary per domain
│       ├── ExceptionHandling/   # GlobalExceptionHandler, custom exceptions
│       └── util/                # JwtUtil, EmailService, CleanupService
│
├── frontend2/
│   └── src/app/
│       ├── auth/                # Login, Register (Student & Admin)
│       ├── core/                # JWT Interceptor, Auth Guard, Core Services
│       ├── dashboard/
│       │   ├── components/
│       │   │   ├── student-dashboard/   # Main student dashboard (1200+ line template)
│       │   │   └── admin-dashboard/     # Admin control panel
│       │   └── services/
│       │       └── student-dashboard.service.ts  # All API calls + AI suite
│       ├── landing/             # Public landing/marketing page
│       ├── profiles/            # Profile Constellation visualizer
│       └── shared/              # Shared pipes, components
│
├── DESIGN.md                    # UI/UX design system specification
├── API DOCS.md                  # Complete REST API reference (79KB)
├── ARCHITECTURE.md              # System architecture + Mermaid diagrams
└── README.md                    # This file
```

---

## Roadmap

- [ ] **Automated Email Triggers** — Deadline reminder emails via Spring `@Scheduled` + JavaMailSender; shortlisting/offer notifications triggered by admin status updates
- [ ] **Recruiter Portal** — Third-party recruiter accounts with direct pipeline visibility, shortlisting controls, and offer letter PDF upload
- [ ] **AI Match Scoring** — Live cosine similarity scoring between student embedding vectors and internship JD embeddings to auto-rank and filter applicants
- [ ] **Placement Analytics Dashboard** — Admin-facing analytics: offer rate by branch/year, top recruiters by volume, historical placement trend charts with Chart.js
- [ ] **Mobile PWA** — Progressive Web App shell with push notification support for new drives and deadline alerts
- [ ] **Resume Version History** — Store multiple AI-optimized resume snapshots with side-by-side diff comparison

---

## Contributing

```bash
# 1. Fork & clone
git clone https://github.com/your-username/tnp-connect.git

# 2. Create feature branch
git checkout -b feature/your-feature-name

# 3. Make changes (follow the DESIGN.md system for all UI work)

# 4. Commit with Conventional Commits
git commit -m "feat(ai): add multi-turn conversation context to chatbot"

# 5. Push and open a Pull Request
git push origin feature/your-feature-name
```

> Before making any UI changes, read [`DESIGN.md`](DESIGN.md). All components **must** use the established CSS token system — no ad-hoc color values or font declarations.

---

## License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for details.

---

<div align="center">
  <strong>Built for TCET Mumbai's Training & Placement Cell</strong><br/>
  <a href="ARCHITECTURE.md">System Architecture & Diagrams →</a>
</div>
