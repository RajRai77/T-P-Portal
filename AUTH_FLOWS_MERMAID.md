# Auth Module - Complete Mermaid Diagrams

> All flows in proper Mermaid syntax for PPT

---

## 1️⃣ LOGIN EXECUTION FLOW

```mermaid
flowchart TD
    A[👤 User Fills Form<br/>Email + Password] --> B[Click Submit]
    B --> C{Form Valid?}
    C -->|No| D[Show Validation Errors]
    C -->|Yes| E[🅰️ Login Component<br/>onSubmit()]
    
    E --> F{Which Tab?}
    F -->|Student| G[authService.loginStudent()]
    F -->|Admin| H[authService.loginAdmin()]
    
    G --> I[🌱 Backend<br/>POST /api/students/login]
    H --> J[🌱 Backend<br/>POST /api/admins/login]
    
    I --> K{Credentials Valid?}
    J --> L{Approved Status?}
    
    K -->|No| M[❌ Error Message<br/>Invalid Credentials]
    L -->|Pending| N[❌ Error Message<br/>Account Pending Approval]
    
    K -->|Yes| O[✅ Generate JWT Token<br/>{id, role, email, expiry}]
    L -->|Approved + Valid| O
    
    O --> P[📤 Return Response<br/>{token, role, id}]
    P --> Q[🅰️ tap() Operator]
    
    Q --> R[💾 localStorage.setItem<br/>'token' + 'userRole']
    R --> S[✅ Login Success]
    
    S --> T{Role?}
    T -->|Student| U[Navigate to<br/>/dashboard/student]
    T -->|Admin| V[Navigate to<br/>/dashboard/admin]
    
    M --> W[Stay on Login Page]
    N --> W
    D --> W
    
    style A fill:#e3f2fd,stroke:#1565c0
    style O fill:#c8e6c9,stroke:#2e7d32
    style M fill:#ffcdd2,stroke:#c62828
    style N fill:#ffcdd2,stroke:#c62828
    style U fill:#e8f5e9,stroke:#2e7d32
    style V fill:#e8f5e9,stroke:#2e7d32
```

---

## 2️⃣ REGISTER EXECUTION FLOW

```mermaid
flowchart TD
    A[👤 User Selects Tab<br/>Student or Admin] --> B[Fill Registration Form]
    B --> C[Click Register]
    C --> D{Form Valid?}
    
    D -->|No| E[Show Validation Errors<br/>Mark fields touched]
    D -->|Yes| F[🅰️ Register Component<br/>onSubmit()]
    
    F --> G{Active Tab?}
    G -->|Student| H[authService.registerStudent()]
    G -->|Admin| I[authService.registerAdmin()]
    
    H --> J[🌱 POST /api/students/]
    I --> K[🌱 POST /api/admins/register]
    
    J --> L{Email Exists?}
    K --> M{Email Exists?}
    
    L -->|Yes| N[❌ Error<br/>Email already in use]
    M -->|Yes| N
    
    L -->|No| O[✅ Save to Database]
    M -->|No| P[✅ Save to Database<br/>Status: PENDING]
    
    O --> Q[📧 Send Verification Email]
    P --> R[📧 Notify Super Admin]
    
    Q --> S{Which Flow?}
    S -->|Student| T[✅ Registration Success]
    S -->|Admin| U[⏳ Pending Approval]
    
    T --> V[Navigate to /auth/login<br/>?registered=true]
    U --> W[Navigate to /auth/pending-approval]
    
    N --> X[Stay on Register Page]
    E --> X
    
    style O fill:#c8e6c9,stroke:#2e7d32
    style P fill:#fff3e0,stroke:#ef6c00
    style T fill:#c8e6c9,stroke:#2e7d32
    style U fill:#fff3e0,stroke:#ef6c00
    style N fill:#ffcdd2,stroke:#c62828
```

---

## 3️⃣ COMPLETE USER FLOW: Login + Dashboard + Logout

```mermaid
sequenceDiagram
    actor User
    participant Browser as "🌐 Browser"
    participant Angular as "🅰️ Angular App"
    participant Interceptor as "🔒 HTTP Interceptor"
    participant AuthService as "⚙️ Auth Service"
    participant Backend as "🌱 Spring Boot"
    participant LocalStorage as "💾 localStorage"

    Note over User, LocalStorage: 🔐 PHASE 1: LOGIN
    
    User->>Angular: Enter /auth/login URL
    Angular->>Angular: Load AuthModule
    Angular->>Angular: Create LoginComponent
    Angular-->>User: Show Login Form
    
    User->>Angular: Fill Email + Password
    User->>Angular: Click Submit
    
    Angular->>AuthService: loginStudent(credentials)
    AuthService->>Backend: POST /api/students/login
    Backend-->>AuthService: {token: JWT, role: STUDENT}
    
    AuthService->>LocalStorage: setItem('token', JWT)
    AuthService->>LocalStorage: setItem('userRole', 'STUDENT')
    AuthService-->>Angular: Success
    
    Angular-->>User: Navigate to /dashboard/student
    
    Note over User, LocalStorage: 📊 PHASE 2: USING APP
    
    User->>Angular: Click "View Internships"
    Angular->>Interceptor: HTTP GET /api/internships
    Interceptor->>LocalStorage: getItem('token')
    LocalStorage-->>Interceptor: Bearer TOKEN
    Interceptor->>Backend: Request + Authorization Header
    Backend-->>Interceptor: 200 OK + Data
    Interceptor-->>Angular: Return Data
    Angular-->>User: Show Internship List
    
    Note over User, LocalStorage: 🚪 PHASE 3: LOGOUT
    
    User->>Angular: Click Logout
    Angular->>LocalStorage: removeItem('token')
    Angular->>LocalStorage: removeItem('userRole')
    Angular-->>User: Navigate to /auth/login
```

---

## 4️⃣ FRONTEND FILE STRUCTURE (Auth Module)

```mermaid
graph TB
    subgraph FRONTEND["🅰️ FRONTEND - Angular Auth Module"]
        direction TB
        
        A[📁 auth/] --> B[📄 auth.module.ts]
        A --> C[📄 auth-routing.module.ts]
        A --> D[📁 components/]
        A --> E[📁 services/]
        A --> F[📁 models/]
        
        B --> B1["Declares:<br/>• LoginComponent<br/>• RegisterComponent<br/>• PendingApprovalComponent"]
        
        C --> C1["Routes:<br/>/login → Login<br/>/register → Register<br/>/pending-approval → Pending"]
        
        D --> D1[📁 login/]
        D --> D2[📁 register/]
        D --> D3[📁 pending-approval/]
        
        D1 --> D1A[📄 login.component.ts]
        D1 --> D1B[📄 login.component.html]
        D1 --> D1C[📄 login.component.css]
        
        D2 --> D2A[📄 register.component.ts]
        D2 --> D2B[📄 register.component.html]
        D2 --> D2C[📄 register.component.css]
        
        E --> E1[📄 auth.service.ts]
        E1 --> E1A["Methods:<br/>• loginStudent()<br/>• loginAdmin()<br/>• registerStudent()<br/>• registerAdmin()<br/>• logout()<br/>• isLoggedIn()"]
        
        F --> F1[📄 ilogin.ts]
        F --> F2[📄 iregister.ts]
    end
    
    style FRONTEND fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style A fill:#bbdefb,stroke:#1565c0
```

---

## 5️⃣ BACKEND FILE STRUCTURE (Auth Controllers)

```mermaid
graph TB
    subgraph BACKEND["🌱 BACKEND - Spring Boot Auth Layer"]
        direction TB
        
        A[📁 com.fsd_CSE.TnP_Connect/] --> B[📁 controllers/]
        A --> C[📁 services/]
        A --> D[📁 entities/]
        A --> E[📁 repositories/]
        A --> F[📁 util/]
        
        B --> B1[📄 StudentController.java]
        B --> B2[📄 TnPAdminController.java]
        
        B1 --> B1A["Endpoints:<br/>POST /api/students/<br/>POST /api/students/login<br/>PATCH /api/students/{id}<br/>GET /api/students/{id}/full-details"]
        
        B2 --> B2A["Endpoints:<br/>POST /api/admins/register<br/>POST /api/admins/login<br/>PATCH /api/admins/{id}/approve<br/>GET /api/admins/pending-requests"]
        
        C --> C1[📄 EmailService.java]
        
        D --> D1[📄 Student.java
        @Entity
        Table: students]
        D --> D2[📄 TnPAdmin.java
        @Entity
        Table: tnp_admins]
        
        E --> E1[📄 StudentRepository.java]
        E --> E2[📄 TnPAdminRepository.java]
        
        F --> F1[📄 JwtUtil.java
        • generateToken()<br/>• validateToken()<br/>• extractClaims()]
    end
    
    style BACKEND fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style A fill:#c8e6c9,stroke:#2e7d32
```

---

## 6️⃣ COMPLETE ARCHITECTURE: Frontend ↔ Backend

```mermaid
graph LR
    subgraph CLIENT["🅰️ CLIENT SIDE - Browser"]
        direction TB
        
        A1[📄 login.component.ts] --> A2[📄 auth.service.ts]
        A2 --> A3[🌐 HTTP Request]
        
        A4[💾 localStorage] --> A5[token + userRole]
        
        A6[🔒 token.interceptor.ts] --> A7[Auto-attach JWT
to every request]
    end
    
    subgraph NETWORK["🌐 NETWORK"]
        N1[HTTP / REST API]
        N2[JSON Format]
        N3[Bearer Token in Header]
    end
    
    subgraph SERVER["🌱 SERVER SIDE - Spring Boot"]
        direction TB
        
        B1[📄 StudentController
@RestController
@RequestMapping/api/students] --> B2
        B3[📄 TnPAdminController
@RestController
@RequestMapping/api/admins] --> B4
        
        B2[📄 Student Service Layer] --> B5[(📊 PostgreSQL
students table)]
        B4[📄 Admin Service Layer] --> B6[(📊 PostgreSQL
tnp_admins table)]
        
        B7[🔐 JwtUtil] --> B1
        B7 --> B3
        
        B8[📧 EmailService] --> B9[(📬 Send Emails)]
    end
    
    CLIENT -->|"HTTP + Bearer JWT"| NETWORK
    NETWORK -->|"Validate + Process"| SERVER
    SERVER -->|"JSON Response"| NETWORK
    NETWORK -->|"Data + Token"| CLIENT
    
    style CLIENT fill:#e3f2fd,stroke:#1565c0,stroke-width:2px
    style SERVER fill:#e8f5e9,stroke:#2e7d32,stroke-width:2px
    style NETWORK fill:#fff3e0,stroke:#ef6c00
```

---

## 7️⃣ JWT TOKEN LIFECYCLE

```mermaid
stateDiagram-v2
    [*] --> LoginPage: User visits /auth/login
    
    LoginPage --> Validating: Submit Credentials
    Validating --> ErrorState: Invalid Credentials
    Validating --> TokenGenerated: Login Success
    
    ErrorState --> LoginPage: Show Error Message
    
    TokenGenerated --> Storage: Save to localStorage
    
    Storage --> Authenticated: Every API Call
    
    Authenticated --> ValidatingToken: Interceptor attaches token
    
    ValidatingToken --> APIAllowed: Token Valid
    ValidatingToken --> Expired: Token Expired
    
    APIAllowed --> Dashboard: Access Granted
    
    Expired --> LoginPage: Clear Storage
    Expired --> Redirect: Redirect to Login
    
    Dashboard --> Logout: User Clicks Logout
    
    Logout --> StorageCleared: Remove token
    StorageCleared --> LoginPage: Navigate to /auth/login
    
    TokenGenerated: 🎫 JWT Generated
    • Contains: id, role, email
    • Signed with HS256
    • Expires in 24 hours
    
    Storage: 💾 localStorage
    • token: eyJhbG...
    • userRole: STUDENT/ADMIN
    
    Authenticated: 🔓 Authenticated State
    • Can access protected routes
    • Auto-token attachment
    • Can logout anytime
```

---

## 8️⃣ COMPLETE USER JOURNEY MAP

```mermaid
journey
    title 👤 Complete User Journey: From Visitor to Placed
    section Discovery
      Visit Landing Page: 5: User
      Click Login: 5: User
    section Authentication
      Fill Login Form: 4: User
      Submit Credentials: 4: System
      Validate & Generate JWT: 5: System
      Redirect to Dashboard: 5: System
    section Dashboard Usage
      View Internships: 5: User
      Apply to Job: 5: User
      Track Application: 4: User
      Attend Session: 5: User
    section AI Features
      Use Resume Builder: 5: User
      Practice Mock Interview: 5: User
      Get Career Roadmap: 4: User
    section Success
      Get Shortlisted: 5: User, System
      Get Selected: 5: User, System
      Logout: 3: User
```

---

## 🎯 QUICK REFERENCE: Which Diagram for Which Slide

| Use Case | Diagram | Lines |
|----------|---------|-------|
| Explain Login Flow | **#1 Login Execution Flow** | 1-50 |
| Explain Register Flow | **#2 Register Execution Flow** | 52-100 |
| Show Full User Session | **#3 Complete User Flow** | 102-150 |
| Frontend Architecture | **#4 Frontend File Structure** | 152-200 |
| Backend Architecture | **#5 Backend File Structure** | 202-250 |
| Full System Overview | **#6 Complete Architecture** | 252-300 |
| Security Explanation | **#7 JWT Token Lifecycle** | 302-350 |
| User Experience | **#8 User Journey Map** | 352-380 |

---

## 💡 PPT SLIDE LAYOUT SUGGESTION

### Single Comprehensive Auth Slide:

```
┌─────────────────────────────────────────────────────────────┐
│              🔐 AUTHENTICATION SYSTEM COMPLETE              │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────────────┐    ┌─────────────────────────────┐│
│  │   LOGIN FLOW        │    │   REGISTER FLOW             ││
│  │                     │    │                             ││
│  │ User → Form → API   │    │ User → Form → API → DB      ││
│  │ → JWT → Storage →   │    │ → Email → Success           ││
│  │ Dashboard           │    │ (Admin waits approval)    ││
│  └─────────────────────┘    └─────────────────────────────┘│
│                                                             │
│  ┌─────────────────────────────────────────────────────────┐│
│  │              FILE STRUCTURE                             ││
│  │  Frontend: auth/ → components/ → login/ → .ts/.html   ││
│  │  Backend: controllers/ → StudentController.java         ││
│  └─────────────────────────────────────────────────────────┘│
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

---

**All diagrams are Mermaid-renderable. Copy any diagram and paste into:**
- GitHub README (auto-renders)
- Notion (paste as code block, select Mermaid)
- Mermaid Live Editor (mermaid.live)
- VS Code with Mermaid extension

