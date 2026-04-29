# 📚 Resource & Notes Module - Complete Presentation Script

> Detailed technical explanation with code snippets for evaluators

---

## 🎯 MODULE OVERVIEW (30 seconds)

### Concept Difference:

```
┌─────────────────────────────────────────────────────────────┐
│              📚 RESOURCES vs 📄 NOTES                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  GLOBAL RESOURCES              BRANCH-SPECIFIC NOTES       │
│  ─────────────────             ───────────────────         │
│                                                             │
│  • For ALL students            • For SPECIFIC branch/year  │
│  • Placement guides            • Subject notes (DBMS, OS)    │
│  • Company papers              • Lab manuals               │
│  • General tutorials           • Branch-specific content   │
│                                                             │
│  Example:                      Example:                    │
│  "How to crack Amazon"         "COMP 3rd Year:            │
│  "Resume Templates"             Database Management"       │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

**Your Opening:**
> "Sir, our platform has two distinct material-sharing systems. **Resources** are global — visible to everyone. Think placement guides, resume templates. **Notes** are targeted — only specific branches and years see them. This ensures a 3rd year COMP student doesn't see 1st year Electronics content."

---

## 🎬 SCENARIO 1: Admin Uploads a Resource (2 minutes)

### Visual Demo Script:

**You:** "Sir, imagine I'm Prof. Sharma, logged into the Admin Dashboard. I click 'Resources & Notes' in the sidebar."

**Show Admin Dashboard:**
- Click "Resources & Notes" in sidebar
- Page shows two buttons: "+ Add Resource" and "+ Upload Note"

**You:** "I want to share a 'Google Interview Preparation Guide' for all students. I click '+ Add Resource'."

### Step 1: Form Appears (Frontend)

```html
<!-- From admin-dashboard.component.html -->
<div class="form-panel" *ngIf="showResourceForm">
  <h3>Add Global Resource</h3>
  <form [formGroup]="resourceForm" (ngSubmit)="submitResource()">
    <div class="form-grid">
      <!-- Resource Title -->
      <div class="form-group">
        <label>Resource Title</label>
        <input type="text" formControlName="title">
      </div>
      
      <!-- Type Selection -->
      <div class="form-group">
        <label>Type</label>
        <select formControlName="type">
          <option value="Link">Web Link</option>
          <option value="Drive">Google Drive Folder</option>
          <option value="PDF">PDF Document (File Upload)</option>
          <option value="Video">Video Lecture</option>
        </select>
      </div>
      
      <!-- Dynamic Fields -->
      <!-- If Type = Link/Drive/Video: Show URL input -->
      <div class="form-group full-width" 
           *ngIf="resourceForm.get('type')?.value !== 'PDF'">
        <label>Access URL</label>
        <input type="url" formControlName="fileUrl">
      </div>
      
      <!-- If Type = PDF: Show File Upload -->
      <div class="form-group full-width" 
           *ngIf="resourceForm.get('type')?.value === 'PDF'">
        <label>Upload PDF Document</label>
        <input type="file" 
               (change)="onResourceFileSelected($event)" 
               accept=".pdf">
      </div>
      
      <!-- Description -->
      <div class="form-group full-width">
        <label>Short Description</label>
        <textarea formControlName="description" rows="2"></textarea>
      </div>
    </div>
    
    <button type="submit" [disabled]="isPostingMaterial">
      {{ isPostingMaterial ? 'Saving...' : 'Save Resource' }}
    </button>
  </form>
</div>
```

**You:** "Sir, notice the smart form — if I select 'PDF', a file upload box appears. If I select 'Link', a URL box appears. This is Angular's reactive forms with conditional rendering."

### Step 2: File Selected (Frontend TypeScript)

```typescript
// In admin-dashboard.component.ts

// Variable to hold selected file
selectedResourceFile: File | null = null;

// Called when user selects file
onResourceFileSelected(event: Event): void {
  const input = event.target as HTMLInputElement;
  if (input.files && input.files.length > 0) {
    this.selectedResourceFile = input.files[0];
    console.log('Selected file:', this.selectedResourceFile.name);
  }
}
```

**You:** "When I select a PDF, this method captures the file object. Now I click 'Save Resource'."

### Step 3: Submit Handler (Component Logic)

```typescript
// In admin-dashboard.component.ts

submitResource() {
  if (this.resourceForm.valid) {
    const type = this.resourceForm.get('type')?.value;
    
    // CASE 1: PDF Type - Need to upload file first
    if (type === 'PDF') {
      if (!this.selectedResourceFile) { 
        alert("Please select a PDF file to upload."); 
        return; 
      }
      
      this.isPostingMaterial = true;
      
      // STEP 1: Upload file to server
      this.dashboardService.uploadFile(this.selectedResourceFile, 'resources')
        .subscribe({
          next: (uploadResponse) => {
            // STEP 2: File uploaded, now create resource record
            const payload = { 
              ...this.resourceForm.value,           // title, type, description
              fileUrl: uploadResponse.url,           // URL returned from file upload
              createdByAdmin: { id: this.adminId }   // Who created this
            };
            
            this.finalizeResourceSubmit(payload);
          },
          error: (err) => { 
            this.isPostingMaterial = false; 
            alert("Failed to upload PDF resource."); 
          }
        });
    } 
    
    // CASE 2: Link/Drive/Video - No file upload needed
    else {
      const fileUrl = this.resourceForm.get('fileUrl')?.value;
      if (!fileUrl) { 
        alert("Please provide the Access URL for this resource."); 
        return; 
      }
      
      this.isPostingMaterial = true;
      
      const payload = { 
        ...this.resourceForm.value,
        createdByAdmin: { id: this.adminId }
      };
      
      this.finalizeResourceSubmit(payload);
    }
  }
}

// Final step: Call backend API
finalizeResourceSubmit(payload: any) {
  this.dashboardService.createResource(payload).subscribe({
    next: () => { 
      this.isPostingMaterial = false; 
      this.toggleResourceForm();  // Hide form
      this.loadDashboardData();    // Refresh list
      alert("Resource added successfully!"); 
    },
    error: () => { 
      this.isPostingMaterial = false; 
      alert("Failed to add resource."); 
    }
  });
}
```

**You:** "Sir, notice the two-path logic:
- **PDF path:** Upload file first → Get URL → Create resource record
- **Link path:** Directly create resource with provided URL

This ensures files are stored on server, while links just save the reference."

---

## 🔧 Step 4: File Upload Service (Frontend)

```typescript
// In admin-dashboard.service.ts

uploadFile(file: File, subDirectory: string): Observable<{url: string}> {
  // Create FormData object for multipart/form-data upload
  const formData = new FormData();
  formData.append('file', file);
  
  // POST to /api/upload/{subDirectory}
  // subDirectory can be: 'resources', 'notes', 'resumes', 'profilePic'
  return this.http.post<{url: string}>(
    `${this.apiUrl}/upload/${subDirectory}`, 
    formData
  );
}

createResource(payload: any): Observable<any> {
  // POST resource metadata to backend
  return this.http.post(`${this.apiUrl}/resources/`, payload);
}
```

**You:** "The uploadFile method uses FormData — standard for file uploads. The file goes to /api/upload/resources, and the backend returns a URL like 'http://localhost:8080/api/files/resources/uuid_filename.pdf'"

---

## 🌱 Step 5: Backend File Controller (Spring Boot)

```java
// FileController.java - Handles file storage

@RestController
@RequestMapping("/api")
public class FileController {

    private final Path rootLocation;  // ./uploads directory

    @Autowired
    public FileController(FileStorageProperties properties) {
        // Initialize storage location from application.properties
        this.rootLocation = Paths.get(properties.getUploadDir())
                                .toAbsolutePath().normalize();
    }

    // Runs on startup - creates directories
    @PostConstruct
    public void init() {
        try {
            Files.createDirectories(rootLocation);
            // Create subdirectories for organization
            Files.createDirectories(rootLocation.resolve("profilePic"));
            Files.createDirectories(rootLocation.resolve("notes"));
            Files.createDirectories(rootLocation.resolve("resources"));
            Files.createDirectories(rootLocation.resolve("resumes"));
        } catch (IOException e) {
            throw new FileStorageException("Could not initialize storage", e);
        }
    }

    // API 1: Upload File
    @PostMapping(value = "/upload/{subDirectory}", 
                 consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadFile(
            @RequestPart("file") MultipartFile file,
            @PathVariable String subDirectory) {

        String fileUrl = storeFile(file, subDirectory);
        return ResponseEntity.ok(Map.of("url", fileUrl));
    }

    // Core storage logic
    private String storeFile(MultipartFile file, String subDirectory) {
        try {
            if (file.isEmpty()) {
                throw new FileStorageException("Failed to store empty file.");
            }

            // Sanitize filename (remove special characters)
            String originalFilename = StringUtils.cleanPath(
                Objects.requireNonNull(file.getOriginalFilename())
            );
            String sanitizedFilename = originalFilename.replaceAll(
                "[^a-zA-Z0-9\\._-]", "_"
            );

            // Add UUID to prevent overwrites
            String uniqueFilename = UUID.randomUUID().toString() + "_" + sanitizedFilename;

            // Save to ./uploads/{subDirectory}/
            Path subDirPath = rootLocation.resolve(subDirectory).normalize();
            Path targetLocation = subDirPath.resolve(uniqueFilename);

            try (InputStream inputStream = file.getInputStream()) {
                Files.copy(inputStream, targetLocation, 
                          StandardCopyOption.REPLACE_EXISTING);
            }

            // Return accessible URL
            return ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/files/")
                    .path(subDirectory)
                    .path("/")
                    .path(uniqueFilename)
                    .toUriString();
                    
            // Result: http://localhost:8080/api/files/resources/uuid_file.pdf

        } catch (IOException e) {
            throw new FileStorageException("Failed to store file.", e);
        }
    }

    // API 2: Serve File (Download/View)
    @GetMapping("/files/{subDirectory}/{filename:.+}")
    public ResponseEntity<Resource> serveFile(
            @PathVariable String subDirectory,
            @PathVariable String filename) {

        Resource file = loadFileAsResource(filename, subDirectory);
        
        // Detect content type (PDF, image, etc.)
        String contentType = Files.probeContentType(file.getFile().toPath());
        if(contentType == null) {
            contentType = "application/octet-stream";
        }

        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(contentType))
                .header(HttpHeaders.CONTENT_DISPOSITION, 
                        "inline; filename=\"" + file.getFilename() + "\"")
                .body(file);
    }
}
```

**You:** "Sir, the backend FileController:
1. **On startup:** Creates ./uploads directory with subfolders
2. **On upload:** Sanitizes filename, adds UUID, saves to disk
3. **On access:** Serves file with proper content-type for browser viewing

Files are stored on disk, not database — this keeps database light and fast."

---

## 🗄️ Step 6: Resource Entity & Database

```java
// Resource.java - JPA Entity

@Entity
@Table(name = "resources")
public class Resource {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "resource_id")
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false)
    private String type;  // PDF, Link, Drive, Video

    @Column(name = "file_url", nullable = false)
    private String fileUrl;  // URL to access the resource

    @Column(columnDefinition = "TEXT")
    private String description;

    @CreationTimestamp
    @Column(name = "created_at", updatable = false)
    private OffsetDateTime createdAt;

    // Many Resources → One Admin (who created it)
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by", referencedColumnName = "admin_id")
    private TnPAdmin createdByAdmin;

    // Getters and Setters...
}
```

**You:** "The Resource entity stores metadata in database, file stays on disk. The createdByAdmin field tracks who uploaded it — accountability."

---

## 🎬 SCENARIO 2: Admin Uploads Branch-Specific Notes (1 minute)

### Visual Demo:

**You:** "Now sir, I want to upload 'Database Management System' notes, but ONLY for 3rd year COMP students. I click '+ Upload Note'."

### The Form:

```html
<div class="form-panel" *ngIf="showNoteForm">
  <h3>Upload Branch Study Note</h3>
  <form [formGroup]="noteForm" (ngSubmit)="submitNote()">
    <div class="form-grid">
      <!-- Note Title -->
      <div class="form-group full-width">
        <label>Note Title</label>
        <input type="text" formControlName="title">
      </div>
      
      <!-- TARGET BRANCH - Key difference from Resources -->
      <div class="form-group">
        <label>Target Branch</label>
        <select formControlName="targetBranch">
          <option value="ALL">All Branches</option>
          <option value="COMP">COMP</option>
          <option value="IT">IT</option>
          <option value="AI_DS">AI & DS</option>
        </select>
      </div>
      
      <!-- TARGET YEAR - Key difference from Resources -->
      <div class="form-group">
        <label>Target Year</label>
        <select formControlName="targetYear">
          <option [ngValue]="1">First Year (FE)</option>
          <option [ngValue]="2">Second Year (SE)</option>
          <option [ngValue]="3">Third Year (TE)</option>
          <option [ngValue]="4">Fourth Year (BE)</option>
        </select>
      </div>
      
      <!-- File Upload (Notes are always files) -->
      <div class="form-group full-width">
        <label>Upload Document</label>
        <input type="file" 
               (change)="onNoteFileSelected($event)" 
               accept=".pdf,.doc,.docx">
      </div>
      
      <div class="form-group full-width">
        <label>Description</label>
        <textarea formControlName="description" rows="2"></textarea>
      </div>
    </div>
    
    <button type="submit" [disabled]="isPostingMaterial">
      {{ isPostingMaterial ? 'Uploading...' : 'Publish Note' }}
    </button>
  </form>
</div>
```

**You:** "Sir, notice the two extra fields: **Target Branch** and **Target Year**. This is what makes Notes different from Resources."

### Notes Backend Entity:

```java
// Notes.java - JPA Entity

@Entity
@Table(name = "notes")
public class Notes {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "file_url", nullable = false)
    private String fileUrl;

    // TARGETING FIELDS - Not present in Resource
    @Column(name = "target_branch")
    private String targetBranch;  // COMP, IT, ALL

    @Column(name = "target_year")
    private Integer targetYear;   // 1, 2, 3, 4, 0 (0 = All)

    @CreationTimestamp
    @Column(name = "uploaded_at", updatable = false)
    private OffsetDateTime uploadedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "uploaded_by_admin_id")
    private TnPAdmin uploadedByAdmin;

    // Getters and Setters...
}
```

**You:** "The Notes entity has targetBranch and targetYear. When student requests notes, backend filters: 'Show only notes where targetBranch matches student's branch OR targetBranch is ALL'."

---

## 🎓 SCENARIO 3: Student Views Resources & Notes (1.5 minutes)

### Visual Demo:

**You:** "Now sir, I'm Rahul, a 3rd year COMP student. I login and go to my dashboard."

### Step 1: Student Dashboard Loads Data

```typescript
// In student-dashboard.component.ts

// Variables to hold data
allResources: any[] = [];  // Global resources - visible to all
allNotes: any[] = [];        // All notes from server
myBranchNotes: any[] = [];   // Filtered for my branch/year

ngOnInit(): void {
  this.studentId = Number(localStorage.getItem('userId'));
  this.loadDashboardData();
}

loadDashboardData(): void {
  // Fetch all data in parallel using forkJoin
  forkJoin({
    profile: this.dashboardService.getStudentFullDetails(this.studentId),
    internships: this.dashboardService.getAllInternships(),
    sessions: this.dashboardService.getAllSessions(),
    resources: this.dashboardService.getAllResources(),  // ← Get resources
    notes: this.dashboardService.getAllNotes(),           // ← Get notes
    contests: this.dashboardService.getAllContests(),
    notifications: this.dashboardService.getAllNotifications()
  }).subscribe({
    next: (data) => {
      this.studentData = data.profile;
      this.allResources = data.resources;  // Store all resources
      this.allNotes = data.notes;            // Store all notes
      
      // FILTER notes for this student's branch and year
      this.filterNotesForStudent();
      
      this.isLoading = false;
    },
    error: (err) => {
      console.error('Error loading dashboard:', err);
      this.isLoading = false;
    }
  });
}
```

**You:** "On dashboard load, we fetch resources and notes from backend. Resources show as-is. Notes need filtering."

### Step 2: Filter Notes for Student

```typescript
filterNotesForStudent(): void {
  const myBranch = this.studentData.branch;  // e.g., "COMP"
  const myYear = this.studentData.year;     // e.g., 3

  this.myBranchNotes = this.allNotes.filter(note => {
    // Check if note targets my branch (or ALL)
    const branchMatch = note.targetBranch === 'ALL' || 
                        note.targetBranch === myBranch;
    
    // Check if note targets my year (or 0 = All years)
    const yearMatch = note.targetYear === 0 || 
                      note.targetYear === myYear;
    
    // Only show if BOTH match
    return branchMatch && yearMatch;
  });
}
```

**You:** "Sir, this filter runs in browser. A COMP 3rd year student only sees notes where:
- targetBranch = 'COMP' or 'ALL'
- targetYear = 3 or 0 (0 means all years)

An E&TC 2nd year student won't see these notes at all."

### Step 3: Display in UI

```html
<!-- In student-dashboard.component.html -->

<div class="content-wrapper">
  
  <!-- GLOBAL RESOURCES SECTION -->
  <div class="section-header">
    <h2>📚 Global TnP Resources</h2>
    <p>Placement guides, templates, and tutorials for everyone</p>
  </div>
  
  <div class="resources-grid">
    <div class="resource-card" *ngFor="let res of allResources">
      <div class="resource-icon">
        <!-- Icon based on type -->
        <span *ngIf="res.type === 'PDF'">📄</span>
        <span *ngIf="res.type === 'Link'">🔗</span>
        <span *ngIf="res.type === 'Video'">🎥</span>
      </div>
      
      <div class="resource-info">
        <h4>{{ res.title }}</h4>
        <p class="description">{{ res.description }}</p>
        <span class="badge">{{ res.type }}</span>
        <span class="date">Added: {{ res.createdAt | date:'mediumDate' }}</span>
      </div>
      
      <div class="resource-action">
        <!-- If PDF: Link to backend file serve endpoint -->
        <a *ngIf="res.type === 'PDF'" 
           [href]="res.fileUrl" 
           target="_blank"
           class="btn btn-primary">
          📥 Download
        </a>
        
        <!-- If Link/Drive/Video: Open external URL -->
        <a *ngIf="res.type !== 'PDF'" 
           [href]="res.fileUrl" 
           target="_blank"
           class="btn btn-outline">
          🔗 Open Link
        </a>
      </div>
    </div>
  </div>

  <!-- MY BRANCH NOTES SECTION -->
  <div class="section-header">
    <h2>📄 Study Notes for {{ studentData.branch }} {{ studentData.year }}rd Year</h2>
    <p>Branch-specific materials curated for your coursework</p>
  </div>
  
  <div class="notes-grid">
    <!-- Show only filtered notes -->
    <div class="note-card" *ngFor="let note of myBranchNotes">
      <div class="note-header">
        <span class="badge badge-branch">{{ note.targetBranch }}</span>
        <span class="badge badge-year">Year {{ note.targetYear }}</span>
      </div>
      
      <h4>{{ note.title }}</h4>
      <p class="description">{{ note.description }}</p>
      <p class="uploader">Uploaded by: {{ note.uploadedByAdminName }}</p>
      
      <a [href]="note.fileUrl" target="_blank" class="btn btn-primary">
        📥 Download Note
      </a>
    </div>
    
    <!-- If no notes for this branch/year -->
    <div *ngIf="myBranchNotes.length === 0" class="empty-state">
      <p>No notes available for your branch and year yet.</p>
    </div>
  </div>

</div>
```

**You:** "Sir, student sees two sections:
1. **Global Resources** — Everyone sees same content
2. **My Branch Notes** — Personalized based on their branch and year

For PDFs, clicking download hits the FileController serve endpoint. For links, it opens external site."

---

## 🎬 Complete Flow Summary (30 seconds)

### Resource Upload Flow:

```
Admin fills form
    ↓
If PDF: File → FileController.storeFile() → ./uploads/resources/
If Link: Direct URL
    ↓
Resource metadata → ResourceController.createResource()
    ↓
Saved to database (resources table)
    ↓
Student fetches GET /api/resources/
    ↓
Sees in Global Resources section
```

### Notes Upload Flow:

```
Admin fills form + selects Target Branch/Year
    ↓
File → FileController.storeFile() → ./uploads/notes/
    ↓
Notes metadata (with targetBranch, targetYear) → NoteController.createNote()
    ↓
Saved to database (notes table)
    ↓
Student fetches GET /api/notes/
    ↓
Frontend filters: student.branch === note.targetBranch
    ↓
Sees in My Branch Notes section (personalized)
```

---

## 📊 Key Differences Table

| Feature | Resources | Notes |
|---------|-----------|-------|
| **Audience** | All students | Specific branch/year |
| **Targeting** | None | targetBranch + targetYear |
| **Types** | PDF, Link, Drive, Video | Only PDF/DOC files |
| **Backend Table** | `resources` | `notes` |
| **Storage Folder** | `./uploads/resources/` | `./uploads/notes/` |
| **API Endpoint** | `GET /api/resources/` | `GET /api/notes/` |
| **Filtering** | None (client shows all) | Client filters by student data |

---

## 🎯 Closing Statement for Evaluators

**You:** "Sir, to summarize:

1. **Resources** are global — placement guides, templates — visible to everyone
2. **Notes** are targeted — subject notes — only relevant branch/year sees them
3. **File storage** is on disk (./uploads/), metadata in database — keeps DB light
4. **Security:** JWT required for all operations, files served via controlled endpoint
5. **Smart filtering:** Student dashboard auto-filters notes, zero spam

This dual-system ensures students get relevant content without information overload."

---

## 💡 Pro Tips for Presentation

1. **Show file upload physically:** If possible, do a live demo uploading a small PDF
2. **Check uploads folder:** Show evaluators the actual ./uploads/ directory
3. **Filter demonstration:** Login as different branch students to show different notes
4. **Database view:** Show resources and notes tables in pgAdmin/DB viewer

---

**Good luck with your presentation! 🚀**
