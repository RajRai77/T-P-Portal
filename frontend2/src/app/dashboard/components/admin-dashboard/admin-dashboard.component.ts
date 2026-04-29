import { Component, OnInit } from '@angular/core';
import { AdminDashboardService } from '../../services/admin-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  standalone: false
})
export class AdminDashboardComponent implements OnInit {
  isLoading = true;
  adminData: any = null;
  adminId!: number;

  currentView: 'overview' | 'internships' | 'resources' | 'students' | 'sessions' | 'contests' | 'notifications' | 'profile' = 'overview';
  isSuperAdmin = false;
  readonly SUPER_ADMIN_EMAIL = 'engineerindmind1209@gmail.com';

  // Metrics & Data Collections
  totalStudents = 0; activeInternshipsCount = 0; pendingApprovalsCount = 0; totalSessions = 0; totalContests = 0;
  pendingAdmins: any[] = []; allInternships: any[] = []; allResources: any[] = []; allNotes: any[] = [];
  allSessions: any[] = []; allContests: any[] = []; allNotifications: any[] = [];

  // Student Management
  allStudents: any[] = []; filteredStudents: any[] = []; selectedStudentId: number | null = null;
  selectedStudent: any = null; isFetchingStudentProfile = false;
  avgCgpa: string = '0.00'; branchStats: any[] = []; searchQuery = ''; filterBranch = ''; filterYear = '';

  // Internship View
  currentInternshipName = ''; selectedInternshipId: number | null = null; applicantsList: any[] = []; isFetchingApplicants = false;

  // Session View
  currentSessionName = ''; selectedSessionId: number | null = null; sessionRegistrations: any[] = [];
  sessionBranchStats: {branch: string, count: number}[] = []; isFetchingSessionRegistrations = false;

  // Forms correctly typed!
  internshipForm!: FormGroup; resourceForm!: FormGroup; noteForm!: FormGroup;
  sessionForm!: FormGroup; contestForm!: FormGroup; notificationForm!: FormGroup;

  selectedNoteFile: File | null = null; selectedResourceFile: File | null = null;

  // Form Toggles
  showInternshipForm = false; showResourceForm = false; showNoteForm = false;
  showSessionForm = false; showContestForm = false; showNotificationForm = false;

  isPostingJob = false; isPostingMaterial = false; isPostingSession = false;
  isPostingContest = false; isPostingNotification = false;
  // Admin Edit Profile
  editAdminName = ''; editAdminPhone = ''; editAdminLinkedin = ''; editAdminAboutMe = ''; editAdminProfilePicUrl = '';
  isSavingAdminProfile = false;

  constructor(private dashboardService: AdminDashboardService, private router: Router, private fb: FormBuilder) {}

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) { this.router.navigate(['/auth/login']); return; }

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      this.adminId = tokenPayload.id;
      const userEmail = tokenPayload.sub;
      this.isSuperAdmin = (userEmail === this.SUPER_ADMIN_EMAIL);

      // FORM INITIALIZATIONS
      this.internshipForm = this.fb.group({
        role: ['', Validators.required], company: ['', Validators.required], stipend: ['', Validators.required],
        eligibility: ['', Validators.required], deadline: ['', Validators.required], description: ['', Validators.required], status: ['OPEN']
      });

      this.resourceForm = this.fb.group({
        title: ['', Validators.required], type: ['Link', Validators.required], description: ['', Validators.required], fileUrl: [''] 
      });

      this.noteForm = this.fb.group({
        title: ['', Validators.required], targetBranch: ['COMP', Validators.required], targetYear: [3, Validators.required], description: ['', Validators.required]
      });

      this.sessionForm = this.fb.group({
        title: ['', Validators.required], speaker: ['', Validators.required], sessionDatetime: ['', Validators.required],
        targetBranch: ['ALL', Validators.required], targetYear: [0, Validators.required], joinUrl: ['', Validators.required], description: ['', Validators.required]
      });

      this.contestForm = this.fb.group({
        title: ['', Validators.required], platform: ['', Validators.required], contestUrl: ['', Validators.required],
        startDatetime: ['', Validators.required], endDatetime: ['', Validators.required], description: ['', Validators.required]
      });

      this.notificationForm = this.fb.group({
        title: ['', Validators.required], targetBranch: ['ALL', Validators.required], targetYear: [0, Validators.required],
        category: ['GENERAL', Validators.required], link: [''], content: ['', Validators.required]
      });

      this.loadDashboardData();
    } catch (error) {
      console.error("Error parsing JWT token", error);
      this.logout();
    }
  }

  loadDashboardData() {
    this.isLoading = true;
    forkJoin({
      admin: this.dashboardService.getAdminFullDetails(this.adminId),
      students: this.dashboardService.getAllStudents(),
      internships: this.dashboardService.getAllInternships(),
      pending: this.dashboardService.getPendingAdmins(),
      resources: this.dashboardService.getAllResources(),
      notes: this.dashboardService.getAllNotes(),
      sessions: this.dashboardService.getAllSessions(),
      contests: this.dashboardService.getAllContests(),       // FIXED: Missing in your code
      notifications: this.dashboardService.getAllNotifications() // FIXED: Missing in your code
    }).subscribe({
      next: (result) => {
        this.adminData = result.admin;
        this.totalSessions = result.sessions.length;
        this.totalStudents = result.students.length;

        this.allInternships = result.internships;
        this.activeInternshipsCount = this.allInternships.filter(i => i.status !== 'CLOSED').length;

        this.pendingAdmins = result.pending;
        this.pendingApprovalsCount = this.pendingAdmins.length;

        this.allResources = result.resources;
        this.allNotes = result.notes;
        this.allSessions = result.sessions;

        this.allContests = result.contests;
        this.totalContests = result.contests.length;
        
        this.allNotifications = result.notifications;

        this.allStudents = result.students;
        this.filteredStudents = [...this.allStudents];
        this.calculateStudentStats();

        this.isLoading = false;

        // Init admin edit profile variables
        this.editAdminName = this.adminData?.name || '';
        this.editAdminPhone = this.adminData?.phone || '';
        this.editAdminLinkedin = this.adminData?.linkedinUrl || '';
        this.editAdminAboutMe = this.adminData?.aboutMe || '';
        this.editAdminProfilePicUrl = this.adminData?.profilePicUrl || '';
      },
      error: (err) => {
        console.error("Failed to load admin dashboard", err);
        this.isLoading = false;
      }
    });
  }

  switchView(view: 'overview' | 'internships' | 'resources' | 'students' | 'sessions' | 'contests' | 'notifications' | 'profile') {
    this.currentView = view;
    this.showInternshipForm = false; this.showResourceForm = false; this.showNoteForm = false;
    this.showSessionForm = false; this.showContestForm = false; this.showNotificationForm = false;
    this.selectedInternshipId = null; this.selectedStudentId = null; this.selectedSessionId = null;
    this.selectedNoteFile = null; this.selectedResourceFile = null;
  }

  // ==========================================
  // CONTEST LOGIC
  // ==========================================
  toggleContestForm() {
    this.showContestForm = !this.showContestForm;
    if (!this.showContestForm) this.contestForm.reset();
  }

  submitContest() {
    if (this.contestForm.valid) {
      this.isPostingContest = true;
      const v = this.contestForm.value;
      const payload = {
        title: v.title,
        platform: v.platform,
        contestUrl: v.contestUrl,
        description: v.description,
        startDatetime: v.startDatetime ? v.startDatetime + ':00+05:30' : null,
        endDatetime: v.endDatetime ? v.endDatetime + ':00+05:30' : null,
        createdByAdmin: { id: this.adminId }
      };
      this.dashboardService.createContest(payload).subscribe({
        next: () => {
          this.isPostingContest = false; this.toggleContestForm(); this.loadDashboardData(); alert('Contest Posted!');
        },
        error: () => { this.isPostingContest = false; alert('Failed to post contest.'); }
      });
    } else this.contestForm.markAllAsTouched();
  }

  deleteContest(id: number) {
    if(confirm("Delete this contest?")) {
      this.dashboardService.deleteContest(id).subscribe({
        next: () => { this.allContests = this.allContests.filter(c => c.id !== id); this.totalContests = this.allContests.length; },
        error: () => alert("Failed to delete.")
      });
    }
  }

  // ==========================================
  // NOTIFICATION LOGIC
  // ==========================================
  toggleNotificationForm() {
    this.showNotificationForm = !this.showNotificationForm;
    if (!this.showNotificationForm) this.notificationForm.reset({ targetBranch: 'ALL', targetYear: 0, category: 'GENERAL' });
  }

  submitNotification() {
    if (this.notificationForm.valid) {
      this.isPostingNotification = true;
      const payload = { ...this.notificationForm.value, postedByAdmin: { id: this.adminId } };
      this.dashboardService.createNotification(payload).subscribe({
        next: () => {
          this.isPostingNotification = false; this.toggleNotificationForm(); this.loadDashboardData(); alert("Notification Sent!");
        },
        error: () => { this.isPostingNotification = false; alert("Failed to send notification."); }
      });
    } else this.notificationForm.markAllAsTouched();
  }

  deleteNotification(id: number) {
    if(confirm("Delete this announcement?")) {
      this.dashboardService.deleteNotification(id).subscribe({
        next: () => { this.allNotifications = this.allNotifications.filter(n => n.id !== id); },
        error: () => alert("Failed to delete.")
      });
    }
  }

  // ==========================================
  // SESSIONS LOGIC
  // ==========================================
  toggleSessionForm() { this.showSessionForm = !this.showSessionForm; if (!this.showSessionForm) { this.sessionForm.reset({ targetBranch: 'ALL', targetYear: 0 }); } }
  submitSession() {
    if (this.sessionForm.valid) {
      this.isPostingSession = true;
      const v = this.sessionForm.value;
      const payload = {
        title: v.title,
        speaker: v.speaker,
        description: v.description,
        joinUrl: v.joinUrl,
        sessionDatetime: v.sessionDatetime ? v.sessionDatetime + ':00+05:30' : null,
        targetBranch: (v.targetBranch === 'ALL' || !v.targetBranch) ? null : v.targetBranch,
        targetYear: (!v.targetYear || v.targetYear === 0) ? null : v.targetYear,
        createdByAdminId: this.adminId
      };
      this.dashboardService.createSession(payload).subscribe({
        next: () => { this.isPostingSession = false; this.toggleSessionForm(); this.loadDashboardData(); alert('Session Scheduled Successfully!'); },
        error: (err) => { this.isPostingSession = false; alert('Failed to schedule session.'); console.error(err); }
      });
    } else { this.sessionForm.markAllAsTouched(); }
  }
  deleteSession(id: number) {
    if(confirm("Are you sure you want to cancel this session?")) {
      this.dashboardService.deleteSession(id).subscribe({
        next: () => { this.allSessions = this.allSessions.filter(s => s.id !== id); this.totalSessions = this.allSessions.length; },
        error: () => alert("Failed to cancel session.")
      });
    }
  }
  viewSessionRegistrations(session: any) {
    this.isFetchingSessionRegistrations = true; this.selectedSessionId = session.id; this.currentSessionName = session.title;
    this.dashboardService.getSessionRegistrations(session.id).subscribe({
      next: (data) => { this.sessionRegistrations = data; this.calculateSessionBranchStats(); this.isFetchingSessionRegistrations = false; },
      error: (err) => { console.error(err); this.isFetchingSessionRegistrations = false; alert("Could not load registrations."); }
    });
  }
  calculateSessionBranchStats() {
    const counts: any = {};
    this.sessionRegistrations.forEach(reg => { counts[reg.studentBranch || 'Unknown'] = (counts[reg.studentBranch || 'Unknown'] || 0) + 1; });
    this.sessionBranchStats = Object.keys(counts).map(b => ({ branch: b, count: counts[b] })).sort((a, b) => b.count - a.count);
  }
  closeSessionRegistrations() { this.selectedSessionId = null; this.sessionRegistrations = []; }

  // ==========================================
  // RESOURCES & NOTES LOGIC
  // ==========================================
  toggleResourceForm() { this.showResourceForm = !this.showResourceForm; this.showNoteForm = false; this.selectedResourceFile = null; if (!this.showResourceForm) this.resourceForm.reset({ type: 'Link' }); }
  toggleNoteForm() { this.showNoteForm = !this.showNoteForm; this.showResourceForm = false; this.selectedNoteFile = null; if (!this.showNoteForm) this.noteForm.reset({ targetBranch: 'COMP', targetYear: 3 }); }
  onNoteFileSelected(event: any) { const file = event.target.files[0]; if (file) this.selectedNoteFile = file; }
  onResourceFileSelected(event: any) { const file = event.target.files[0]; if (file) this.selectedResourceFile = file; }
  
  submitNote() {
    if (this.noteForm.valid) {
      if (!this.selectedNoteFile) { alert("Please select a file to upload for this note."); return; }
      this.isPostingMaterial = true;
      this.dashboardService.uploadFile(this.selectedNoteFile, 'notes').subscribe({
        next: (uploadResponse) => {
          const payload = { ...this.noteForm.value, fileUrl: uploadResponse.url, uploadedByAdmin: { id: this.adminId } };
          this.dashboardService.createNote(payload).subscribe({
            next: () => { this.isPostingMaterial = false; this.toggleNoteForm(); this.loadDashboardData(); alert("Study Note uploaded and published successfully!"); },
            error: () => { this.isPostingMaterial = false; alert("Failed to save note data."); }
          });
        },
        error: (err) => { this.isPostingMaterial = false; alert("Failed to upload the file to the server."); console.error(err); }
      });
    } else { this.noteForm.markAllAsTouched(); }
  }

  submitResource() {
    if (this.resourceForm.valid) {
      const type = this.resourceForm.get('type')?.value;
      if (type === 'PDF') {
        if (!this.selectedResourceFile) { alert("Please select a PDF file to upload."); return; }
        this.isPostingMaterial = true;
        this.dashboardService.uploadFile(this.selectedResourceFile, 'resources').subscribe({
          next: (uploadResponse) => { this.finalizeResourceSubmit({ ...this.resourceForm.value, fileUrl: uploadResponse.url, createdByAdmin: { id: this.adminId } }); },
          error: (err) => { this.isPostingMaterial = false; alert("Failed to upload PDF resource."); console.error(err); }
        });
      } else {
        const fileUrl = this.resourceForm.get('fileUrl')?.value;
        if (!fileUrl) { alert("Please provide the Access URL for this resource."); return; }
        this.isPostingMaterial = true;
        this.finalizeResourceSubmit({ ...this.resourceForm.value, createdByAdmin: { id: this.adminId } });
      }
    } else { this.resourceForm.markAllAsTouched(); }
  }
  
  finalizeResourceSubmit(payload: any) {
    this.dashboardService.createResource(payload).subscribe({
      next: () => { this.isPostingMaterial = false; this.toggleResourceForm(); this.loadDashboardData(); alert("Resource added successfully!"); },
      error: () => { this.isPostingMaterial = false; alert("Failed to add resource."); }
    });
  }
  
  deleteResource(id: number) { if(confirm("Are you sure you want to delete this global resource?")) { this.dashboardService.deleteResource(id).subscribe({ next: () => { this.allResources = this.allResources.filter(r => r.id !== id); }, error: () => alert("Failed to delete resource.") }); } }
  deleteNote(id: number) { if(confirm("Are you sure you want to delete this study note?")) { this.dashboardService.deleteNote(id).subscribe({ next: () => { this.allNotes = this.allNotes.filter(n => n.id !== id); }, error: () => alert("Failed to delete note.") }); } }

  // ==========================================
  // STUDENT MANAGEMENT LOGIC
  // ==========================================
  calculateStudentStats() {
    if (!this.allStudents.length) return;
    const totalCgpa = this.allStudents.reduce((sum, s) => sum + (s.cgpa || 0), 0);
    this.avgCgpa = (totalCgpa / this.allStudents.length).toFixed(2);
    const counts: any = {};
    this.allStudents.forEach(s => { counts[s.branch || 'Unknown'] = (counts[s.branch || 'Unknown'] || 0) + 1; });
    this.branchStats = Object.keys(counts).map(branch => ({ branch, count: counts[branch], percentage: Math.round((counts[branch] / this.allStudents.length) * 100) })).sort((a, b) => b.count - a.count);
  }

  applyStudentFilters(search: string, branch: string, year: string) {
    this.searchQuery = search.toLowerCase(); this.filterBranch = branch; this.filterYear = year;
    this.filteredStudents = this.allStudents.filter(s => {
      const matchName = s.name.toLowerCase().includes(this.searchQuery) || s.email.toLowerCase().includes(this.searchQuery);
      const matchBranch = this.filterBranch ? s.branch === this.filterBranch : true;
      const matchYear = this.filterYear ? s.year?.toString() === this.filterYear : true;
      return matchName && matchBranch && matchYear;
    });
  }

  viewStudentProfile(studentId: number) {
    this.isFetchingStudentProfile = true; this.selectedStudentId = studentId;
    this.dashboardService.getStudentFullDetails(studentId).subscribe({
      next: (data) => { 
        this.selectedStudent = data; 
        try { this.selectedStudent.projectsList = this.selectedStudent.projects ? JSON.parse(this.selectedStudent.projects) : []; } catch(e) { this.selectedStudent.projectsList = []; }
        try { this.selectedStudent.experiencesList = this.selectedStudent.experiences ? JSON.parse(this.selectedStudent.experiences) : []; } catch(e) { this.selectedStudent.experiencesList = []; }
        this.isFetchingStudentProfile = false; 
      },
      error: () => { this.isFetchingStudentProfile = false; alert("Failed to load student profile."); this.closeStudentProfile(); }
    });
  }
  closeStudentProfile() { this.selectedStudentId = null; this.selectedStudent = null; }

  deleteStudent(id: number) {
    if(confirm("Are you sure you want to completely remove this student from the system?")) {
      this.dashboardService.deleteStudent(id).subscribe({
        next: () => { this.allStudents = this.allStudents.filter(s => s.id !== id); this.calculateStudentStats(); this.applyStudentFilters(this.searchQuery, this.filterBranch, this.filterYear); alert("Student deleted successfully."); },
        error: () => alert("Failed to delete student.")
      });
    }
  }

  // ==========================================
  // INTERNSHIPS LOGIC
  // ==========================================
  viewCandidates(job: any) {
    this.isFetchingApplicants = true; this.selectedInternshipId = job.id; this.currentInternshipName = `${job.company} - ${job.role}`;
    this.dashboardService.getInternshipApplicants(job.id).subscribe({
      next: (data) => { this.applicantsList = data; this.isFetchingApplicants = false; },
      error: (err) => { console.error(err); this.isFetchingApplicants = false; alert("Could not load applicants."); }
    });
  }

  updateCandidateStatus(application: any, newStatus: string) {
    const targetAppId = application.applicationId || application.id;
    if (!targetAppId) { alert("Error: Missing Application ID."); return; }
    if(confirm(`Mark ${application.studentName} as ${newStatus}?`)) {
      this.dashboardService['http'].patch(`/api/applications/${targetAppId}/status`, { status: newStatus }).subscribe({
        next: () => { application.applicationStatus = newStatus; alert(`Candidate successfully marked as ${newStatus}`); },
        error: (err) => { console.error(err); alert("Failed to update status."); }
      });
    }
  }

  closeApplicants() { this.selectedInternshipId = null; this.applicantsList = []; }
  toggleInternshipForm() { this.showInternshipForm = !this.showInternshipForm; if (!this.showInternshipForm) { this.internshipForm.reset({ status: 'OPEN' }); } }

  submitInternship() {
    if (this.internshipForm.valid) {
      this.isPostingJob = true;
      const payload = { ...this.internshipForm.value, createdByAdmin: { id: this.adminId } };
      this.dashboardService['http'].post('/api/internships/', payload).subscribe({
        next: () => { this.isPostingJob = false; this.toggleInternshipForm(); this.loadDashboardData(); alert("Internship Posted Successfully!"); },
        error: (err) => { this.isPostingJob = false; alert("Failed to post internship."); }
      });
    } else { this.internshipForm.markAllAsTouched(); }
  }

  // ==========================================
  // PROFILE LOGIC
  // ==========================================
  saveAdminProfile() {
    this.isSavingAdminProfile = true;
    const payload = {
      name: this.editAdminName,
      phone: this.editAdminPhone,
      linkedinUrl: this.editAdminLinkedin,
      aboutMe: this.editAdminAboutMe,
      profilePicUrl: this.editAdminProfilePicUrl
    };
    // Re-using patchAdmin endpoint /api/admins/{id} which we updated
    this.dashboardService['http'].patch(`/api/admins/${this.adminId}`, payload).subscribe({
      next: (res: any) => {
        this.adminData.name = res.name;
        this.adminData.phone = res.phone;
        this.adminData.linkedinUrl = res.linkedinUrl;
        this.adminData.aboutMe = res.aboutMe;
        this.adminData.profilePicUrl = res.profilePicUrl;
        this.isSavingAdminProfile = false;
        alert("Profile updated successfully!");
      },
      error: () => {
        this.isSavingAdminProfile = false;
        alert("Failed to update profile.");
      }
    });
  }

  // ==========================================
  // UTILS
  // ==========================================
  approveUser(id: number) {
    if(confirm("Are you sure you want to approve this admin? They will receive an email immediately.")) {
      this.dashboardService.approveAdmin(id).subscribe({
        next: () => { this.pendingAdmins = this.pendingAdmins.filter(admin => admin.id !== id); this.pendingApprovalsCount = this.pendingAdmins.length; alert("Admin Approved Successfully! Email sent."); },
        error: (err) => alert("Failed to approve admin.")
      });
    }
  }

  getInitials(name: string): string { return name ? name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase() : 'A'; }
  logout(): void { localStorage.removeItem('token'); localStorage.removeItem('userRole'); this.router.navigate(['/auth/login']); }
}