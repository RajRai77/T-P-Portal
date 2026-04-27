# TnP Connect — System Architecture

> This document contains enterprise-grade system design diagrams for every core workflow in TnP Connect.
> All diagrams are written in [Mermaid.js](https://mermaid.js.org/) and render natively on GitHub.

---

## Table of Contents

1. [High-Level Component Overview](#1-high-level-component-overview)
2. [Authentication & Security Flow](#2-authentication--security-flow)
3. [Internship & Sessions Dual-Role Workflow](#3-internship--sessions-dual-role-workflow)
4. [AI Intelligence Pipeline](#4-ai-intelligence-pipeline)
5. [Profile & Constellation Visualizer](#5-profile--constellation-visualizer)
6. [Global Modules — Contests, Resources, Alerts](#6-global-modules--contests-resources-alerts)

---

## 1. High-Level Component Overview

```mermaid
graph TB
    subgraph CLIENT["Angular 19 — Browser Client"]
        direction LR
        AUTH_COMP["Auth Components\n(Login / Register)"]
        STUDENT_DASH["Student Dashboard\n(1200+ line component)"]
        ADMIN_DASH["Admin Dashboard"]
        CONSTELLATION["Profile Constellation\n(CSS 3D Visualizer)"]
        INTERCEPTOR["JWT HTTP Interceptor\n(attaches Bearer token\nto every request)"]
        GUARD["AuthGuard\n(route protection)"]
    end

    subgraph BACKEND["Spring Boot 3.5.6 — REST API Server"]
        direction TB
        JWT_FILTER["JwtAuthFilter\n(validates every\nprotected route)"]
        CONTROLLERS["REST Controllers\n(Student, Admin, Internship,\nSession, Contest, Resource,\nNotification, File, Note)"]
        AI_CTRL["AiController\n(/api/ai/**)"]
        SERVICES["Service Layer\n(business logic,\nvalidation, orchestration)"]
        AI_SERVICES["AI Services\n(ResumeAiService,\nInterviewService,\nRoadmapService,\nChatbotService,\nEmbeddingService)"]
        EMAIL["EmailService\n(JavaMailSender)"]
        JWT_UTIL["JwtUtil\n(sign / validate / extract)"]
    end

    subgraph DATA["Data & External Services"]
        PG[("PostgreSQL 16\n(All entities)")]
        GEMINI["Google Gemini v1beta\n(via LangChain4j\nVertex AI bridge)"]
        SMTP["SMTP Server\n(Gmail / College Mail)"]
        FS["File System\n(./uploads — PDF resumes)"]
    end

    STUDENT_DASH & ADMIN_DASH & AUTH_COMP --> INTERCEPTOR
    INTERCEPTOR -->|"HTTP + Bearer JWT"| JWT_FILTER
    JWT_FILTER -->|"valid"| CONTROLLERS
    JWT_FILTER -->|"valid"| AI_CTRL
    CONTROLLERS --> SERVICES
    AI_CTRL --> AI_SERVICES
    SERVICES --> PG
    SERVICES --> EMAIL --> SMTP
    SERVICES --> FS
    AI_SERVICES --> GEMINI
    GUARD -->|"checks localStorage JWT"| STUDENT_DASH & ADMIN_DASH & CONSTELLATION
```

---

## 2. Authentication & Security Flow

This diagram covers the complete lifecycle: Registration with email verification through to JWT issuance and frontend interceptor attachment.

```mermaid
sequenceDiagram
    autonumber

    actor User
    participant AngularForm as Angular<br/>Auth Component
    participant Interceptor as JWT HTTP<br/>Interceptor
    participant AuthCtrl as Spring Boot<br/>StudentController
    participant JwtUtil as JwtUtil<br/>(JJWT 0.11.5)
    participant DB as PostgreSQL<br/>(Student Table)
    participant Email as EmailService<br/>(JavaMailSender)
    participant SMTP as SMTP Server

    rect rgb(235, 245, 255)
        Note over User, SMTP: REGISTRATION FLOW
        User->>AngularForm: Fill Register form<br/>(name, email, password, branch, year)
        AngularForm->>AuthCtrl: POST /api/students/register {StudentRequest}
        AuthCtrl->>DB: Check if email already exists
        DB-->>AuthCtrl: Not found (OK to proceed)
        AuthCtrl->>DB: INSERT Student (isVerified=false, verificationToken=UUID)
        DB-->>AuthCtrl: Student saved
        AuthCtrl->>Email: sendVerificationEmail(student.email, token)
        Email->>SMTP: SMTP AUTH + send HTML email<br/>with verification link
        SMTP-->>User: Verification email received
        AuthCtrl-->>AngularForm: 200 OK — "Check your email"
        AngularForm-->>User: Show "Verify Email" prompt
    end

    rect rgb(235, 255, 240)
        Note over User, DB: EMAIL VERIFICATION
        User->>AuthCtrl: GET /api/students/verify?token={UUID}
        AuthCtrl->>DB: SELECT student WHERE verificationToken = token
        DB-->>AuthCtrl: Student found
        AuthCtrl->>DB: UPDATE Student SET isVerified=true, verificationToken=NULL
        DB-->>AuthCtrl: Updated
        AuthCtrl-->>User: 200 OK — "Account verified. Please login."
    end

    rect rgb(255, 248, 230)
        Note over User, JwtUtil: LOGIN & JWT ISSUANCE
        User->>AngularForm: Submit Login form (email, password)
        AngularForm->>AuthCtrl: POST /api/students/login {LoginRequest}
        AuthCtrl->>DB: SELECT student WHERE email = ? AND isVerified = true
        DB-->>AuthCtrl: Student record returned

        alt Password valid (BCrypt match)
            AuthCtrl->>JwtUtil: generateToken(studentId, role="STUDENT")
            JwtUtil-->>AuthCtrl: Signed JWT (HS256, 24h expiry)
            AuthCtrl-->>AngularForm: 200 OK {token, studentId, role}
            AngularForm->>AngularForm: localStorage.setItem('token', jwt)<br/>localStorage.setItem('userRole', 'STUDENT')
            AngularForm-->>User: Redirect to /dashboard/student
        else Password invalid or unverified
            AuthCtrl-->>AngularForm: 401 Unauthorized
            AngularForm-->>User: Show error toast
        end
    end

    rect rgb(245, 235, 255)
        Note over AngularForm, AuthCtrl: SUBSEQUENT AUTHENTICATED REQUESTS
        User->>AngularForm: Navigate to any protected route
        AngularForm->>Interceptor: Outgoing HTTP request
        Interceptor->>Interceptor: Read JWT from localStorage
        Interceptor->>AuthCtrl: Request + Header: "Authorization: Bearer {jwt}"
        AuthCtrl->>JwtUtil: validateToken(jwt) — check signature & expiry
        alt Token valid
            JwtUtil-->>AuthCtrl: Claims extracted (studentId, role)
            AuthCtrl-->>AngularForm: 200 OK with requested data
        else Token expired or invalid
            JwtUtil-->>AuthCtrl: JwtException thrown
            AuthCtrl-->>Interceptor: 401 Unauthorized
            Interceptor->>Interceptor: Clear localStorage
            Interceptor-->>User: Redirect to /auth/login
        end
    end
```

---

## 3. Internship & Sessions Dual-Role Workflow

This diagram covers both roles: Admin posting a drive, and a Student applying with deadline enforcement.

```mermaid
sequenceDiagram
    autonumber

    actor Admin
    actor Student
    participant AngularAdmin as Admin<br/>Dashboard (Angular)
    participant AngularStudent as Student<br/>Dashboard (Angular)
    participant InternCtrl as InternshipController<br/>(Spring Boot)
    participant AppCtrl as InternshipApplication<br/>Controller
    participant InternSvc as Internship<br/>Service Layer
    participant DB as PostgreSQL
    participant NotifSvc as Notification<br/>Service

    rect rgb(230, 245, 255)
        Note over Admin, DB: ADMIN — POST INTERNSHIP DRIVE
        Admin->>AngularAdmin: Fill "New Drive" form<br/>(company, role, stipend, deadline, description)
        AngularAdmin->>InternCtrl: POST /api/internships<br/>{InternshipRequest} + Bearer JWT
        InternCtrl->>InternCtrl: JWT filter validates Admin role
        InternCtrl->>InternSvc: create(request, adminId)
        InternSvc->>DB: INSERT Internship (status=ACTIVE,<br/>createdByAdminId=adminId, deadline=LocalDate)
        DB-->>InternSvc: Internship{id} saved
        InternSvc->>NotifSvc: broadcastNewDriveAlert(internship)
        NotifSvc->>DB: INSERT Notification (type=NEW_DRIVE,<br/>targetBranch=null [all], message)
        DB-->>NotifSvc: Notification saved
        InternSvc-->>InternCtrl: InternshipResponse
        InternCtrl-->>AngularAdmin: 201 Created {InternshipResponse}
        AngularAdmin-->>Admin: Show success toast + refresh list
    end

    rect rgb(240, 255, 240)
        Note over Student, DB: STUDENT — FETCH & APPLY
        Student->>AngularStudent: Opens "Internships" tab
        AngularStudent->>InternCtrl: GET /api/internships + Bearer JWT
        InternCtrl->>DB: SELECT * FROM internships ORDER BY deadline ASC
        DB-->>InternCtrl: List<InternshipResponse>
        InternCtrl-->>AngularStudent: 200 OK [{...internships}]
        AngularStudent->>AngularStudent: categorize():\n  activeInternships = filter(!applied && !missed)\n  closedInternships = filter(!applied && missed)\n  appliedInternships = filter(applied)
        AngularStudent-->>Student: Render categorized card grid

        Student->>AngularStudent: Click "Apply Now" on a card

        alt Deadline has passed (isJobMissed == true)
            AngularStudent-->>Student: Button disabled — "Closed"
        else Already applied (isJobApplied == true)
            AngularStudent-->>Student: Button disabled — "Applied"
        else Eligible to apply
            AngularStudent->>AppCtrl: POST /api/applications<br/>{InternshipApplicationRequest:<br/>  internshipId, studentId} + Bearer JWT
            AppCtrl->>DB: Check duplicate: SELECT WHERE<br/>internshipId=? AND studentId=?
            DB-->>AppCtrl: No duplicate found
            AppCtrl->>DB: INSERT InternshipApplication<br/>(status=PENDING, appliedAt=now())
            DB-->>AppCtrl: Application{id} saved
            AppCtrl->>AngularStudent: 201 Created {InternshipApplicationResponse}
            AngularStudent->>AngularStudent: Add internshipId to appliedJobIds Set<number>
            AngularStudent->>AngularStudent: Re-categorize internships\n(card now shows "Applied" stamp)
            AngularStudent->>AngularStudent: Increment applicationsCount KPI card
            AngularStudent-->>Student: Show success toast "Application submitted!"
        end
    end

    rect rgb(255, 245, 230)
        Note over Admin, DB: ADMIN — VIEW APPLICANTS
        Admin->>AngularAdmin: Click internship in admin panel
        AngularAdmin->>AppCtrl: GET /api/applications/internship/{id} + Bearer JWT
        AppCtrl->>DB: SELECT applications JOIN students<br/>WHERE internshipId=?
        DB-->>AppCtrl: List<InternshipApplicationSummary>
        AppCtrl-->>AngularAdmin: 200 OK [{studentName, cgpa, branch, status}]
        Admin->>AngularAdmin: Update status (SHORTLISTED / REJECTED)
        AngularAdmin->>AppCtrl: PUT /api/applications/{id} {status: "SHORTLISTED"}
        AppCtrl->>DB: UPDATE application SET status=?
        DB-->>AppCtrl: Updated
        AppCtrl-->>AngularAdmin: 200 OK
    end
```

---

## 4. AI Intelligence Pipeline

This diagram covers the complete multi-tier AI flow through the Angular frontend, Spring Boot service layer, and Google Gemini via LangChain4j.

```mermaid
sequenceDiagram
    autonumber

    actor Student
    participant AngularAI as Angular<br/>AI Builder Component
    participant AiCtrl as AiController<br/>(Spring Boot)
    participant RateGuard as AiRateLimitException<br/>/ AiTimeoutException
    participant ResumeAI as ResumeAiService<br/>(LangChain4j)
    participant InterviewSvc as InterviewService<br/>(LangChain4j)
    participant RoadmapSvc as RoadmapService<br/>(LangChain4j)
    participant GeminiConf as GeminiConfig<br/>(VertexAI Model)
    participant Gemini as Google Gemini<br/>v1beta API

    rect rgb(235, 245, 255)
        Note over Student, Gemini: AI RESUME OPTIMISER FLOW

        Student->>AngularAI: Fill Builder form:\n(name, role, experiences[], educations[],\nskills, hobbies, customSections[])
        Student->>AngularAI: Click "AI Optimize Layout"
        AngularAI->>AngularAI: resumeLoading = true
        AngularAI->>AiCtrl: POST /api/ai/generate-resume<br/>{ResumeRequest} + Bearer JWT

        AiCtrl->>AiCtrl: JWT filter validates Student role
        AiCtrl->>ResumeAI: generateOptimizedResume(request)

        ResumeAI->>ResumeAI: Build structured prompt:\n- System context (professional resume writer)\n- Inject all sections as formatted text\n- Instruct output format (clean text/markdown)

        ResumeAI->>GeminiConf: Get configured ChatLanguageModel\n(gemini-1.5-flash, temperature=0.7)
        GeminiConf-->>ResumeAI: LangChain4j ChatLanguageModel instance

        ResumeAI->>Gemini: HTTP POST /v1beta/models/gemini-1.5-flash:generateContent\n{system_instruction, user_message}

        alt Gemini responds (2xx)
            Gemini-->>ResumeAI: {candidates[{content{parts[{text}]}}]}
            ResumeAI->>ResumeAI: Extract text, clean markdown artifacts
            ResumeAI-->>AiCtrl: Optimized resume string
            AiCtrl-->>AngularAI: 200 OK {result: "...formatted resume..."}
            AngularAI->>AngularAI: resumeResult = response.result\nresumeLoading = false
            AngularAI-->>Student: Render formatted resume in\nright-panel preview canvas
        else Rate limit exceeded (429)
            Gemini-->>ResumeAI: 429 Too Many Requests
            ResumeAI->>RateGuard: throw new AiRateLimitException()
            RateGuard-->>AiCtrl: AiRateLimitException caught
            AiCtrl-->>AngularAI: 429 {error: "Rate limit reached. Retry in 60s."}
            AngularAI-->>Student: Error toast with retry guidance
        else Timeout (>30s)
            Gemini-->>ResumeAI: Connection timeout
            ResumeAI->>RateGuard: throw new AiTimeoutException()
            RateGuard-->>AiCtrl: AiTimeoutException caught
            AiCtrl-->>AngularAI: 504 {error: "AI service timed out"}
            AngularAI-->>Student: Error toast "Try again"
        end
    end

    rect rgb(235, 255, 240)
        Note over Student, Gemini: MOCK INTERVIEW TRANSCRIPT FLOW

        Student->>AngularAI: Select tab "Mock Interview"
        Student->>AngularAI: Enter job role/description\nSelect difficulty (intro/medium/hard/hr/stress)
        Student->>AngularAI: Click "Generate Script"
        AngularAI->>AiCtrl: POST /api/ai/generate-interview\n{jd, difficulty} + Bearer JWT
        AiCtrl->>InterviewSvc: generateFullScript(jd, difficulty)
        InterviewSvc->>InterviewSvc: Build difficulty-aware prompt:\n- "hard" → deep system design, DSA\n- "hr" → STAR method, behavioral\n- "stress" → rapid-fire cadence
        InterviewSvc->>Gemini: POST with max_tokens=4096\n(3-4 page transcript target)
        Gemini-->>InterviewSvc: Full interviewer↔candidate transcript
        InterviewSvc-->>AiCtrl: Transcript string (markdown formatted)
        AiCtrl-->>AngularAI: 200 OK {interviewScript: "..."}
        AngularAI->>AngularAI: interviewScript = result\nRender in <pre class="ai-formatted-doc">
        AngularAI-->>Student: Full interview transcript rendered\n+ Export Script button enabled
    end

    rect rgb(255, 248, 230)
        Note over Student, Gemini: CAREER ROADMAP FLOW

        Student->>AngularAI: Enter "Target Role" (e.g. "Data Scientist")
        Student->>AngularAI: Click "Generate Flowchart"
        AngularAI->>AiCtrl: POST /api/ai/generate-roadmap\n{targetRole: "Data Scientist"} + Bearer JWT
        AiCtrl->>RoadmapSvc: generateRoadmap(targetRole)
        RoadmapSvc->>RoadmapSvc: Prompt: "Return JSON array of\n{month, topics[], projects[]} objects\nfor 6-month roadmap"
        RoadmapSvc->>Gemini: POST — JSON response mode
        Gemini-->>RoadmapSvc: JSON [{month:1, topics:[...], projects:[...]}, ...]
        RoadmapSvc->>RoadmapSvc: Parse JSON string to RoadmapStep[]
        RoadmapSvc-->>AiCtrl: List<RoadmapStep>
        AiCtrl-->>AngularAI: 200 OK {steps: [{month, topics, projects}]}
        AngularAI->>AngularAI: prepRoadmap = response.steps
        AngularAI-->>Student: Render timeline cards with topic badges
    end
```

---

## 5. Profile & Constellation Visualizer

This diagram shows how the student's full profile is fetched, parsed, and injected into the Profile Constellation CSS 3D visualizer.

```mermaid
sequenceDiagram
    autonumber

    actor Student
    participant ConstellView as Profile Constellation\nComponent (Angular)
    participant StudentCtrl as StudentController\n(Spring Boot)
    participant DB as PostgreSQL\n(Student Table)
    participant AngularBind as Angular Template\n& CSS Engine
    participant ConstellationCSS as CSS Constellation\n(3D Star-Map Renderer)

    rect rgb(235, 245, 255)
        Note over Student, ConstellationCSS: PROFILE DATA FETCH & PARSE

        Student->>ConstellView: Navigate to /profiles/constellation\n(or click from Profile Drawer)
        ConstellView->>ConstellView: ngOnInit() — extract studentId\nfrom localStorage JWT claims

        ConstellView->>StudentCtrl: GET /api/students/{id} + Bearer JWT
        StudentCtrl->>DB: SELECT * FROM students WHERE id = ?
        DB-->>StudentCtrl: Student entity

        StudentCtrl->>StudentCtrl: Map to StudentFullDetailsResponse:\n{id, name, email, branch, year, cgpa,\n skills (CSV String),\n experiences (JSON String),\n projects (JSON String),\n githubUrl, linkedinUrl,\n aboutMe, resumeUrl}

        StudentCtrl-->>ConstellView: 200 OK {StudentFullDetailsResponse}
    end

    rect rgb(240, 255, 240)
        Note over ConstellView, ConstellationCSS: PAYLOAD PARSING & ENRICHMENT

        ConstellView->>ConstellView: Parse skills:\n  skillsArray = skills.split(',').map(trim)
        ConstellView->>ConstellView: Parse experiences JSON:\n  editExperiences = JSON.parse(experiences)\n  // [{role, company, duration, description}]
        ConstellView->>ConstellView: Parse projects JSON:\n  editProjects = JSON.parse(projects)\n  // [{title, techStack, link, description}]

        ConstellView->>ConstellView: Compute constellation layout:\n  - Each skill → star node\n  - Each experience → planet orbit\n  - Each project → satellite body\n  - Assign CSS orbital positions\n    using modular angle calculation:\n    angle = (index / total) * 360deg
    end

    rect rgb(255, 248, 230)
        Note over ConstellView, ConstellationCSS: CONSTELLATION RENDERING

        ConstellView->>AngularBind: *ngFor skill → <div class="c-star">\n  [style.--orbit-angle]="angle"\n  [style.--orbit-radius]="radius"
        ConstellView->>AngularBind: *ngFor experience → <div class="c-planet">\n  orbital animation via\n  CSS @keyframes c-orbit-shape
        ConstellView->>AngularBind: *ngFor project → <div class="c-satellite">\n  click → emit activeProject = proj

        AngularBind->>ConstellationCSS: CSS custom properties injected:\n  --orbit-angle, --orbit-radius,\n  --skill-glow-color, --planet-color
        ConstellationCSS->>ConstellationCSS: CSS transforms:\n  rotate(var(--orbit-angle))\n  translateX(var(--orbit-radius))\n  rotate(calc(-1 * var(--orbit-angle)))\n  [counter-rotation keeps labels upright]

        ConstellationCSS-->>Student: 3D star-map renders:\n  - Core nucleus pulsing (c-pulse-core keyframe)\n  - Skill stars orbiting at different radii\n  - Project satellites with hover glow\n  - Diamond algo-shapes rotating

        alt Student clicks a Project node
            Student->>ConstellView: Click on c-planet element
            ConstellView->>ConstellView: activeProject = selectedProject
            ConstellView->>AngularBind: *ngIf="activeProject" → show project modal
            AngularBind-->>Student: Project detail overlay:\n  title, techStack, description,\n  "View Project" link button
        end
    end
```

---

## 6. Global Modules — Contests, Resources, Alerts

This diagram shows the unified CRUD flow for broadcast modules: how Admins create content and how the Frontend filters and delivers it to specific student cohorts.

```mermaid
flowchart TD
    subgraph ADMIN_SIDE["Admin Interface (Angular AdminDashboard)"]
        A1([Admin logged in\nwith valid JWT]) --> A2{Select module}
        A2 -->|"New Alert"| A3[/"Fill Notification form:\ntitle, message, type,\ntargetBranch?, targetYear?"/]
        A2 -->|"New Resource"| A4[/"Fill Resource form:\ntitle, description, url,\ncategory, branch?, year?"/]
        A2 -->|"New Contest"| A5[/"Fill Contest form:\ntitle, description, startDate,\nendDate, arenaLink"/]
    end

    subgraph API_LAYER["Spring Boot REST API Layer"]
        direction TB
        B1["POST /api/notifications\n+ Bearer JWT\nNotificationController"]
        B2["POST /api/resources\n+ Bearer JWT\nResourceController"]
        B3["POST /api/contests\n+ Bearer JWT\nContestController"]

        B_JWT["JwtAuthFilter\nvalidates Admin role\nchecks token signature & expiry"]

        B1 & B2 & B3 --> B_JWT
    end

    subgraph DB_LAYER["PostgreSQL — Data Persistence"]
        direction LR
        DB_N[("notifications\n─────────────\nid, title, message,\ntype, targetBranch,\ntargetYear, createdAt,\ncreatedByAdminId")]
        DB_R[("resources\n─────────────\nid, title, description,\nurl, category,\ntargetBranch, targetYear,\ncreatedByAdminId")]
        DB_C[("contests\n─────────────\nid, title, description,\nstartDate, endDate,\narenaLink,\ncreatedByAdminId")]
    end

    subgraph STUDENT_SIDE["Student Interface (Angular StudentDashboard)"]
        direction TB
        S1([Student opens\nAlerts / Resources / Contests tab])
        S2["GET /api/notifications\n+ Bearer JWT"]
        S3["GET /api/resources\n+ Bearer JWT"]
        S4["GET /api/contests\n+ Bearer JWT"]

        S_FILTER{Angular-side\nbranch & year filter}
        S_NOTIF["Render alert cards:\n• Type badge (INFO / URGENT / EVENT)\n• Posted by admin name\n• View Admin Profile link"]
        S_RES["Render resource library:\n• Category pills\n• External URL cards\n• Download / Open link"]
        S_CONT["Render contest cards:\n• Countdown timer (endDate)\n• 'Enter Arena' button → arenaLink\n• Status badge (Active / Ended)"]
        S_NOTIF_DOT["Sidebar Alert badge\n(count of unread notifications)"]
    end

    A3 -->|"HTTP POST"| B1
    A4 -->|"HTTP POST"| B2
    A5 -->|"HTTP POST"| B3

    B_JWT -->|"valid — INSERT"| DB_N & DB_R & DB_C
    B_JWT -->|"invalid — 401"| ERR[/"Return 401\nUnauthorized"/]

    DB_N -->|"SELECT WHERE\ntargetBranch IS NULL OR = student.branch\nAND targetYear IS NULL OR = student.year"| S2
    DB_R -->|"SELECT WHERE\ntargetBranch IS NULL OR = student.branch"| S3
    DB_C -->|"SELECT all active contests"| S4

    S1 --> S2 & S3 & S4
    S2 --> S_FILTER
    S3 --> S_FILTER
    S4 --> S_FILTER

    S_FILTER -->|"notifications"| S_NOTIF
    S_FILTER -->|"resources"| S_RES
    S_FILTER -->|"contests"| S_CONT

    S_NOTIF --> S_NOTIF_DOT

    classDef adminBox fill:#F3F0EE,stroke:#141413,color:#141413
    classDef apiBox fill:#141413,stroke:#CF4500,color:#F3F0EE
    classDef dbBox fill:#3860BE,stroke:#1a3a8c,color:#FFFFFF
    classDef studentBox fill:#FCFBFA,stroke:#696969,color:#141413
    classDef errorBox fill:#dc2626,stroke:#991b1b,color:#FFFFFF

    class A1,A2,A3,A4,A5 adminBox
    class B1,B2,B3,B_JWT apiBox
    class DB_N,DB_R,DB_C dbBox
    class S1,S2,S3,S4,S_FILTER,S_NOTIF,S_RES,S_CONT,S_NOTIF_DOT studentBox
    class ERR errorBox
```

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **JWT in localStorage** | Simple SPA-compatible storage; `AuthGuard` + `JwtInterceptor` handle automatic injection and expiry redirect |
| **LangChain4j over raw REST** | Provides structured output parsing, retry logic, and prompt templating out of the box, reducing boilerplate in AI service layer |
| **Experiences/Projects as JSON Strings in PostgreSQL** | Avoids complex relational modeling for variable-length arrays; parsed in-memory in Angular and Spring services |
| **Client-side PDF export (jsPDF + html2canvas)** | Zero server load; the HTML canvas captures the live preview exactly as styled and converts to PDF without a second render pass |
| **HTML5 native Drag-and-Drop** | No external DnD library dependency; `draggable="true"` with `(dragstart)`, `(dragover)`, `(drop)` handlers, array splice/insert on drop |
| **CSS Variables for theming** | All design tokens in `:host { --token: value }` allow instant Dark Mode via `:host-context(.dark-theme)` remapping — zero JavaScript for theme switching |

---

*Back to [README.md](README.md)*
