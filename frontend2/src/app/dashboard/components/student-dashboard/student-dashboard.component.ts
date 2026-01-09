import { Component, OnInit, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { StudentDashboardService } from '../../services/student-dashboard.service';
import { forkJoin } from 'rxjs';
import { Router } from '@angular/router';
import { Chart, registerables } from 'chart.js';
Chart.register(...registerables);

type View = 'overview' | 'internships' | 'applications' | 'sessions' | 'resources' |
  'contests' | 'notifications' | 'ai-assistant' | 'edit-profile' | 'constellation';

interface AiInsight {
  overview: string;
  whyGoodForYou: string;
  skillsRequired: string[];
  prepRoadmap: string[];
  chances: string;
}

@Component({
  selector: 'app-student-dashboard',
  templateUrl: './student-dashboard.component.html',
  styleUrls: ['./student-dashboard.component.css'],
  standalone: false
})
export class StudentDashboardComponent implements OnInit, AfterViewChecked {
  isLoading = true;
  studentId!: number;
  currentView: View = 'overview';

  // UI STATE
  isDarkMode = false;
  showModal = false;
  modalTitle = '';
  modalMessage = '';
  pendingAction: (() => void) | null = null;
  showToast = false;
  toastMessage = '';
  toastType: 'success' | 'error' | 'info' = 'info';
  activeProject: any = null;

  // Data Variables
  studentData: any = null;
  allInternships: any[] = [];
  activeInternships: any[] = [];
  closedInternships: any[] = [];
  appliedInternships: any[] = [];
  recentInternships: any[] = [];
  myApplications: any[] = [];
  appliedJobIds: Set<number> = new Set();

  // Session Variables
  allSessions: any[] = [];
  activeSessions: any[] = [];
  closedSessions: any[] = [];
  registeredSessions: any[] = [];
  myRegistrations: any[] = [];
  registeredSessionIds: Set<number> = new Set();

  // Contests & Notifications
  allContests: any[] = [];
  activeContests: any[] = [];
  closedContests: any[] = [];
  myNotifications: any[] = [];

  // Resource & Notes Variables
  allResources: any[] = [];
  allNotes: any[] = [];
  myBranchNotes: any[] = [];

  // Calculated Metrics
  activeInternshipsCount = 0;
  applicationsCount = 0;
  upcomingSessionsCount = 0;
  activeContestsCount = 0;

  isApplying = false;
  isRegistering = false;

  // --- EXPANDABLE CARD STATE ---
  expanded = false;
  selectedCard: any = null;
  selectedType = '';
  aiInsight: AiInsight | null = null;
  aiLoading = false;
  showGuidanceAction = true;

  // ==========================================
  // --- AI ASSISTANT STATE (UPDATED) ---
  // ==========================================
  activeAiFeature: 'resume' | 'interview' | 'roadmap' = 'resume';

  // Resume Builder
  resumeFirstName = '';
  resumeLastName = '';
  resumeEmail = '';
  resumeRole = '';
  resumeQualification = '';
  resumeSkills = '';
  resumeHobbies = '';
  resumeExperiences: any[] = [{ title: '', company: '', date: '', description: '' }];
  resumeEducations: any[] = [{ degree: '', institution: '', date: '', description: '' }];
  customSections: { title: string, content: string }[] = []; // NEW Custom Sections
  resumeLoading = false;
  resumeResult = '';
  resumeTips: string[] = [];

  // Career Roadmap
  prepLoading = false;
  prepRole = '';
  prepRoadmap: Array<{ month: string; topics: string[]; projects: string[] }> = [];

  // Mock Interview (NEW STATE)
  jd = '';
  interviewDifficulty = 'intro';
  interviewScript = '';
  evaluationLoading = false;

  // Charts
  appChartInstance: any;

  // --- EDIT PROFILE STATE ---
  editPhone = '';
  editLinkedin = '';
  editGithub = '';
  editAboutMe = '';
  newSkills: string[] = [];
  editProjects: any[] = [];
  editExperiences: any[] = [];
  isSavingProfile = false;
  resumeUploading = false;
  resumeUploadSuccess = false;

  // Profile Drawer Panel
  isProfilePanelOpen = false;
  toggleProfilePanel() { this.isProfilePanelOpen = !this.isProfilePanelOpen; }
  closeProfilePanel() { this.isProfilePanelOpen = false; }

  // Admin Profile Modal
  selectedAdminProfile: any = null;
  isAdminModalOpen = false;

  // --- CHATBOT STATE ---
  isChatOpen = false;
  chatInput = '';
  chatLoading = false;
  chatMessages: Array<{ role: 'user' | 'bot'; text: string }> = [
    { role: 'bot', text: 'Hi! I am your TnP AI Assistant. Ask me anything about internships, sessions, or career advice!' }
  ];

  @ViewChild('chatMessagesEl') chatMessagesEl!: ElementRef<HTMLElement>;

  constructor(
    private dashboardService: StudentDashboardService,
    private router: Router
  ) { }

  ngOnInit(): void {
    const token = localStorage.getItem('token');
    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    try {
      const tokenPayload = JSON.parse(atob(token.split('.')[1]));
      this.studentId = tokenPayload.id;
      this.loadDashboardData();
    } catch (e) {
      console.error('Token error', e);
      this.logout();
    }
  }

  // --- THEME ---
  toggleTheme() {
    this.isDarkMode = !this.isDarkMode;
    document.documentElement.classList.toggle('dark-theme', this.isDarkMode);
  }

  // --- AfterViewChecked: auto-scroll chatbot ---
  ngAfterViewChecked() {
    this.scrollChatToBottom();
  }

  private scrollChatToBottom() {
    try {
      if (this.chatMessagesEl?.nativeElement) {
        const el = this.chatMessagesEl.nativeElement;
        el.scrollTop = el.scrollHeight;
      }
    } catch { /* ignore */ }
  }

  // --- TOAST ---
  showToastNotification(message: string, type: 'success' | 'error' | 'info' = 'info') {
    this.toastMessage = message;
    this.toastType = type;
    this.showToast = true;
    setTimeout(() => { this.showToast = false; }, 4000);
  }

  // --- CONFIRM MODAL ---
  openConfirmModal(title: string, message: string, action: () => void) {
    this.modalTitle = title;
    this.modalMessage = message;
    this.pendingAction = action;
    this.showModal = true;
  }

  closeModal() {
    this.showModal = false;
    this.pendingAction = null;
  }

  confirmModalAction() {
    if (this.pendingAction) { this.pendingAction(); }
    this.closeModal();
  }

  // --- DATA LOADING ---
  loadDashboardData(): void {
    this.isLoading = true;
    forkJoin({
      student: this.dashboardService.getStudentFullDetails(this.studentId),
      internships: this.dashboardService.getAllInternships(),
      sessions: this.dashboardService.getAllSessions(),
      contests: this.dashboardService.getAllContests(),
      resources: this.dashboardService.getAllResources(),
      notes: this.dashboardService.getAllNotes(),
      notifications: this.dashboardService.getAllNotifications()
    }).subscribe({
      next: (result) => {
        this.studentData = result.student;
        this.myApplications = result.student.internshipApplications || [];
        this.applicationsCount = this.myApplications.length;
        this.myRegistrations = result.student.sessionRegistrations || [];

        this.allInternships = result.internships;
        this.allSessions = result.sessions;
        this.allResources = result.resources;
        this.allNotes = result.notes;

        this.myBranchNotes = this.allNotes.filter((note: any) =>
          (note.targetBranch === 'ALL' || note.targetBranch === this.studentData.branch) &&
          (note.targetYear === 0 || note.targetYear === this.studentData.year)
        );

        this.allContests = result.contests;
        this.myNotifications = result.notifications.filter((n: any) =>
          (n.targetBranch === 'ALL' || n.targetBranch === this.studentData.branch) &&
          (n.targetYear === 0 || n.targetYear === this.studentData.year)
        ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

        this.categorizeData();
        this.isLoading = false;
        if (this.currentView === 'overview') { this.renderCharts(); }
      },
      error: (err) => {
        console.error('Failed to load dashboard data', err);
        this.isLoading = false;
        if (err.status === 404 || err.status === 401) {
          this.showToastNotification('Session expired. Please log in again.', 'error');
          setTimeout(() => this.logout(), 2500);
        } else {
          this.showToastNotification('Failed to load dashboard data.', 'error');
        }
      }
    });
  }

  mapAppliedJobs() {
    this.appliedJobIds.clear();
    for (const app of this.myApplications) {
      const matchingJob = this.allInternships.find(
        (job) => job.company === app.internshipCompany && job.role === app.internshipRole
      );
      if (matchingJob) { this.appliedJobIds.add(matchingJob.id); }
    }
  }

  mapRegisteredSessions() {
    this.registeredSessionIds.clear();
    for (const reg of this.myRegistrations) {
      const matchingSession = this.allSessions.find((s) => s.title === reg.sessionTitle);
      if (matchingSession) { this.registeredSessionIds.add(matchingSession.id); }
    }
  }

  categorizeData() {
    // Internships
    this.appliedInternships = this.allInternships.filter(job => this.isJobApplied(job));
    this.activeInternships = this.allInternships.filter(job => !this.isJobApplied(job) && !this.isJobMissed(job));
    this.closedInternships = this.allInternships.filter(job => !this.isJobApplied(job) && this.isJobMissed(job));
    this.activeInternshipsCount = this.activeInternships.length;
    this.recentInternships = this.activeInternships.slice(0, 5);

    // Sessions
    this.registeredSessions = this.allSessions.filter(session => this.isSessionRegistered(session));
    this.activeSessions = this.allSessions.filter(session => !this.isSessionRegistered(session) && !this.isJobMissed(session));
    this.closedSessions = this.allSessions.filter(session => !this.isSessionRegistered(session) && this.isJobMissed(session));
    this.upcomingSessionsCount = this.activeSessions.length;

    // Contests
    this.activeContests = this.allContests.filter(c => !this.isContestEnded(c));
    this.closedContests = this.allContests.filter(c => this.isContestEnded(c));
    this.activeContestsCount = this.activeContests.length;
  }

  // --- VIEW NAVIGATION ---
  switchView(view: View) {
    this.currentView = view;
    if (view === 'overview') {
      setTimeout(() => this.renderCharts(), 100);
    }
  }


  // --- CHARTS ---
  renderCharts(): void {
    setTimeout(() => {
      if (this.currentView !== 'overview') return;
      const appCtx = document.getElementById('appChart') as HTMLCanvasElement;
      if (appCtx) {
        if (this.appChartInstance) { this.appChartInstance.destroy(); }
        let pending = 0, shortlisted = 0, rejected = 0, applied = 0;
        this.myApplications.forEach((a) => {
          const s = a.status?.toUpperCase() || '';
          if (s === 'PENDING') pending++;
          else if (s === 'SHORTLISTED' || s === 'SELECTED') shortlisted++;
          else if (s === 'REJECTED') rejected++;
          else applied++;
        });
        this.appChartInstance = new Chart(appCtx, {
          type: 'doughnut',
          data: {
            labels: ['Applied', 'Pending', 'Shortlisted', 'Rejected'],
            datasets: [{
              data: [applied, pending, shortlisted, rejected],
              backgroundColor: ['#004080', '#ef7a20', '#16a34a', '#dc2626'],
              borderWidth: 0
            }]
          },
          options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { position: 'bottom' } }
          }
        });
      }
    }, 150);
  }

  // --- INTERNSHIP ACTIONS ---
  applyForJob(job: any) {
    if (this.isJobApplied(job)) return;
    this.openConfirmModal(
      'Confirm Application',
      `Are you sure you want to apply for ${job.role} at ${job.company}?`,
      () => {
        this.isApplying = true;
        this.dashboardService.applyForInternship(this.studentId, job.id).subscribe({
          next: () => {
            this.isApplying = false;
            this.showToastNotification('Application submitted successfully!', 'success');
            this.loadDashboardData();
          },
          error: (err) => {
            this.isApplying = false;
            this.showToastNotification(err.error?.message || 'Failed to apply.', 'error');
          }
        });
      }
    );
  }

  isJobApplied(job: any): boolean {
    return this.myApplications.some(
      (app) => app.internshipRole === job.role && app.internshipCompany === job.company
    );
  }

  isJobMissed(job: any): boolean {
    const deadline = new Date(job.deadline || job.sessionDatetime);
    return job.status === 'CLOSED' || deadline.getTime() < new Date().getTime();
  }

  isContestEnded(contest: any): boolean {
    if (!contest.endDatetime) return false;
    return new Date(contest.endDatetime) < new Date();
  }

  getRemainingTime(deadline: string): string {
    if (!deadline) return '';
    const diff = new Date(deadline).getTime() - new Date().getTime();
    if (diff <= 0) return '';
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    return days > 0 ? `${days}d ${hours}h remaining` : `${hours}h remaining`;
  }

  isDeadlineNear(deadline: string): boolean {
    if (!deadline) return false;
    const daysLeft = (new Date(deadline).getTime() - new Date().getTime()) / (1000 * 3600 * 24);
    return daysLeft > 0 && daysLeft <= 3;
  }

  // --- SESSION ACTIONS ---
  isSessionRegistered(session: any): boolean {
    return this.myRegistrations.some(
      (reg) => reg.sessionTitle === session.title
    );
  }

  registerForSession(session: any) {
    if (this.isSessionRegistered(session)) return;
    this.openConfirmModal(
      'Confirm Registration',
      `Confirm registration for: ${session.title}?`,
      () => {
        this.isRegistering = true;
        this.dashboardService.registerForSession(this.studentId, session.id).subscribe({
          next: () => {
            this.isRegistering = false;
            this.showToastNotification('Successfully registered for the session!', 'success');
            this.loadDashboardData();
          },
          error: () => {
            this.isRegistering = false;
            this.showToastNotification('Failed to register.', 'error');
          }
        });
      }
    );
  }

  // --- EXPANDABLE CARDS ---
  openCard(type: string, card: any): void {
    this.selectedType = type;
    this.selectedCard = card;
    this.expanded = true;
    this.showGuidanceAction = true;
    this.aiInsight = null;
    this.aiLoading = false;
  }

  closeExpanded(): void {
    this.expanded = false;
    this.selectedCard = null;
    this.aiInsight = null;
    this.aiLoading = false;
  }

  askGuidanceForExpandedCard(): void {
    if (!this.selectedCard) return;
    this.showGuidanceAction = false;
    this.loadAiInsights(this.selectedCard);
  }

  loadAiInsights(card: any): void {
    this.aiLoading = true;
    const prompt = `
You are an expert TnP AI guidance assistant.
Return STRICT JSON only:
{
  "overview":"string",
  "whyGoodForYou":"string",
  "skillsRequired":["string"],
  "prepRoadmap":["string"],
  "chances":"string"
}
Card Data:
title=${card?.role || card?.title || card?.internshipRole || ''}
companyOrPlatform=${card?.company || card?.platform || card?.internshipCompany || ''}
description=${card?.description || card?.content || ''}
requirements=${card?.eligibility || card?.requirements || ''}
studentBranch=${this.studentData?.branch || ''}
studentYear=${this.studentData?.year || ''}
studentSkills=${this.studentData?.skills || ''}
`;
    this.dashboardService.askAiAssistant(prompt).subscribe({
      next: (res) => {
        this.aiLoading = false;
        this.aiInsight = this.parseInsight(res.answer);
      },
      error: () => { this.aiLoading = false; }
    });
  }

  private parseInsight(answer: string): AiInsight {
    try {
      const s = answer.indexOf('{');
      const e = answer.lastIndexOf('}');
      const obj = JSON.parse(answer.slice(s, e + 1));
      return {
        overview: obj.overview || '',
        whyGoodForYou: obj.whyGoodForYou || '',
        skillsRequired: Array.isArray(obj.skillsRequired) ? obj.skillsRequired : [],
        prepRoadmap: Array.isArray(obj.prepRoadmap) ? obj.prepRoadmap : [],
        chances: obj.chances || ''
      };
    } catch {
      return { overview: 'Failed to parse AI response.', whyGoodForYou: '', skillsRequired: [], prepRoadmap: [], chances: '' };
    }
  }

  getApplicationStatusClass(status: string): string {
    switch (status?.toLowerCase()) {
      case 'selected': case 'shortlisted': return 'badge-success';
      case 'applied': case 'pending': return 'badge-open';
      case 'rejected': return 'badge-closed';
      default: return 'badge-open';
    }
  }

  getContestGradient(platform: string): string {
    const p = (platform || '').toLowerCase();
    if (p.includes('hackerrank')) return 'linear-gradient(135deg, #2EC866, #1A8A42)';
    if (p.includes('leetcode')) return 'linear-gradient(135deg, #FFA116, #B36B00)';
    if (p.includes('codechef')) return 'linear-gradient(135deg, #5B4638, #30241A)';
    return 'linear-gradient(135deg, #004080, #0059b3)';
  }

  // ==========================================
  // --- AI ASSISTANT METHODS (UPDATED) ---
  // ==========================================
  switchAiFeature(feature: 'resume' | 'interview' | 'roadmap'): void {
    this.activeAiFeature = feature;
  }

  addExperience() { this.resumeExperiences.push({ title: '', company: '', date: '', description: '' }); }
  removeExperience(i: number) { this.resumeExperiences.splice(i, 1); }

  addEducation() { this.resumeEducations.push({ degree: '', institution: '', date: '', description: '' }); }
  removeEducation(i: number) { this.resumeEducations.splice(i, 1); }

  // Custom Section Array Logic
  addCustomSection() { this.customSections.push({ title: '', content: '' }); }
  removeCustomSection(index: number) { this.customSections.splice(index, 1); }

  generateResume(): void {
    if (!this.resumeRole) return;
    this.resumeLoading = true;

    // Include custom sections inside the payload going to AI
    const builtContent = `
      Name: ${this.resumeFirstName} ${this.resumeLastName}
      Email: ${this.resumeEmail}
      Headline: ${this.resumeRole}
      Skills: ${this.resumeSkills}
      Experience: ${JSON.stringify(this.resumeExperiences)}
      Education: ${JSON.stringify(this.resumeEducations)}
      Hobbies: ${this.resumeHobbies}
      Custom Sections: ${JSON.stringify(this.customSections)}
    `;

    this.dashboardService.buildResumeWithAi(this.resumeRole, this.resumeQualification || 'Student', builtContent).subscribe({
      next: (res) => {
        this.resumeLoading = false;
        this.resumeResult = res.optimizedResume;
        this.resumeTips = res.suggestions || [];
      },
      error: () => { this.resumeLoading = false; }
    });
  }

  generatePrepPlan(): void {
    if (!this.prepRole) return;
    this.prepLoading = true;
    this.dashboardService.generateRoadmap(this.prepRole, this.studentData?.skills || '').subscribe({
      next: (res) => { this.prepLoading = false; this.prepRoadmap = res; },
      error: () => { this.prepLoading = false; }
    });
  }

  // Generate Full Transcript Mock Interview directly using ChatBot API
  generateFullInterviewScript(): void {
    if (!this.jd) return;
    this.evaluationLoading = true;

    let diffText = '';
    if (this.interviewDifficulty === 'intro') diffText = 'Basic Introduction and Fundamentals';
    else if (this.interviewDifficulty === 'medium') diffText = 'Medium Technical & Scenario Based';
    else if (this.interviewDifficulty === 'hard') diffText = 'Highly Technical Deep-Dive';
    else if (this.interviewDifficulty === 'hr') diffText = 'Behavioral & HR Round';
    else if (this.interviewDifficulty === 'stress') diffText = 'Stress Interview (Rapid Fire)';

    const prompt = `Act as an expert technical interviewer. Generate a full, comprehensive 3-4 page mock interview transcript for the role of: ${this.jd}. 
    The difficulty mode is: ${diffText}. 
    Format the output cleanly using 'Interviewer:' and 'Candidate:' dialogues. Cover technical questions, scenarios, and answers. Do NOT use markdown code blocks.`;

    this.dashboardService.askAiAssistant(prompt).subscribe({
      next: (res) => {
        this.evaluationLoading = false;
        this.interviewScript = res.answer;
      },
      error: () => {
        this.evaluationLoading = false;
        this.interviewScript = "Failed to generate interview script due to API limits. Please try again in a few minutes.";
      }
    });
  }

  async exportItem(item: string) {
    const { jsPDF } = await import('jspdf');
    const html2canvas = (await import('html2canvas')).default;
    let elementId = 'resume-preview';
    if (item === 'Roadmap') elementId = 'roadmap-preview';
    if (item === 'Interview') elementId = 'interview-preview';

    const element = document.getElementById(elementId);
    if (!element) { alert('Preview not found. Generate content first.'); return; }

    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF('p', 'mm', 'a4');
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`TnP_Connect_${item}_${new Date().toLocaleDateString()}.pdf`);
  }

  // --- EDIT PROFILE ---
  openEditProfile() {
    if (this.studentData) {
      this.editPhone = this.studentData.phone || '';
      this.editLinkedin = this.studentData.linkedinUrl || '';
      this.editGithub = this.studentData.githubUrl || '';
      this.editAboutMe = this.studentData.aboutMe || '';
      try {
        this.editProjects = this.studentData.projects ? JSON.parse(this.studentData.projects) : [];
      } catch (e) { this.editProjects = []; }
      try {
        this.editExperiences = this.studentData.experiences ? JSON.parse(this.studentData.experiences) : [];
      } catch (e) { this.editExperiences = []; }

      if (this.newSkills.length === 0 && this.studentData.skills) {
        this.newSkills = this.studentData.skills.split(',').map((s: string) => s.trim()).filter((s: string) => s);
      }
    }
    this.currentView = 'edit-profile';
  }

  saveProfileChanges() {
    if (!this.studentData?.id) return;
    this.isSavingProfile = true;
    const payload: any = {
      skills: this.newSkills.join(', '),
      phone: this.editPhone,
      linkedinUrl: this.editLinkedin,
      githubUrl: this.editGithub,
      aboutMe: this.editAboutMe,
      projects: JSON.stringify(this.editProjects),
      experiences: JSON.stringify(this.editExperiences)
    };
    this.dashboardService.patchStudent(this.studentData.id, payload).subscribe({
      next: (res: any) => {
        this.isSavingProfile = false;
        if (this.studentData) {
          this.studentData.skills = res.skills;
          this.studentData.phone = res.phone;
          this.studentData.linkedinUrl = res.linkedinUrl;
          this.studentData.githubUrl = res.githubUrl;
          this.studentData.aboutMe = res.aboutMe;
          this.studentData.projects = res.projects;
          this.studentData.experiences = res.experiences;
        }
        this.currentView = 'overview';
        this.showToastNotification('Profile saved successfully!', 'success');
      },
      error: () => {
        this.isSavingProfile = false;
        this.showToastNotification('Failed to save profile. Please try again.', 'error');
      }
    });
  }

  addSkill(event: any) {
    const val = event.target.value.trim();
    if (val) { this.newSkills.push(val); event.target.value = ''; }
  }

  removeSkillAt(index: number) { this.newSkills.splice(index, 1); }

  addProject() { this.editProjects.push({ title: '', techStack: '', link: '', description: '' }); }
  removeProject(index: number) { this.editProjects.splice(index, 1); }

  addEditExperience() { this.editExperiences.push({ role: '', company: '', duration: '', description: '' }); }
  removeEditExperience(index: number) { this.editExperiences.splice(index, 1); }

  private readonly skillIconMap: Record<string, string> = {
    'react': 'react', 'angular': 'angularjs', 'vue': 'vuejs', 'node': 'nodejs',
    'nodejs': 'nodejs', 'javascript': 'javascript', 'js': 'javascript',
    'typescript': 'typescript', 'ts': 'typescript', 'python': 'python',
    'java': 'java', 'spring': 'spring', 'springboot': 'spring',
    'mysql': 'mysql', 'postgresql': 'postgresql', 'postgres': 'postgresql',
    'docker': 'docker', 'aws': 'amazonwebservices', 'git': 'git',
    'figma': 'figma', 'mongodb': 'mongodb', 'html': 'html5', 'css': 'css3',
    'kotlin': 'kotlin', 'swift': 'swift', 'flutter': 'flutter', 'dart': 'dart'
  };

  getSkillIcon(skill: string): string {
    const key = skill.toLowerCase();
    const iconName = this.skillIconMap[key] || key;
    return `https://raw.githubusercontent.com/devicons/devicon/master/icons/${iconName}/${iconName}-original.svg`;
  }

  onResumeFileSelect(event: any) {
    const file: File = event.target.files[0];
    if (!file || !this.studentData?.id) return;
    this.resumeUploading = true;
    this.resumeUploadSuccess = false;
    this.dashboardService.uploadResume(this.studentData.id, file).subscribe({
      next: (res: any) => {
        this.resumeUploading = false;
        this.resumeUploadSuccess = true;
        if (this.studentData) { this.studentData.resumeUrl = res.resumeUrl; }
      },
      error: () => {
        this.resumeUploading = false;
        this.showToastNotification('Resume upload failed.', 'error');
      }
    });
  }

  // --- ADMIN PROFILE MODAL ---
  openAdminProfile(adminId: number) {
    if (!adminId) return;
    this.dashboardService.getAdminFullDetails(adminId).subscribe({
      next: (res: any) => {
        this.selectedAdminProfile = res;
        this.isAdminModalOpen = true;
      },
      error: () => {
        this.showToastNotification('Could not load admin profile.', 'error');
      }
    });
  }

  closeAdminModal() {
    this.isAdminModalOpen = false;
    this.selectedAdminProfile = null;
  }

  // --- CHATBOT ---
  toggleChat() {
    this.isChatOpen = !this.isChatOpen;
  }

  sendChatMessage() {
    const query = this.chatInput.trim();
    if (!query || this.chatLoading) return;
    this.chatMessages.push({ role: 'user', text: query });
    this.chatInput = '';
    this.chatLoading = true;
    this.dashboardService.askAiAssistant(query).subscribe({
      next: (res) => {
        this.chatLoading = false;
        this.chatMessages.push({ role: 'bot', text: res.answer || 'Sorry, I could not get a response.' });
      },
      error: () => {
        this.chatLoading = false;
        this.chatMessages.push({ role: 'bot', text: 'Sorry, the AI service is currently unavailable. Please try again later.' });
      }
    });
  }

  // --- DRAG-DROP for resume sections ---
  dragIndex = -1;
  dragoverIndex = -1;

  onSectionDragStart(index: number) { this.dragIndex = index; }
  onSectionDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    this.dragoverIndex = index;
  }
  onSectionDrop(list: any[], event: DragEvent) {
    event.preventDefault();
    if (this.dragIndex >= 0 && this.dragoverIndex >= 0 && this.dragIndex !== this.dragoverIndex) {
      const moved = list.splice(this.dragIndex, 1)[0];
      list.splice(this.dragoverIndex, 0, moved);
    }
    this.dragIndex = -1;
    this.dragoverIndex = -1;
  }

  // --- UTILS ---
  getInitials(name: string): string {
    if (!name) return 'S';
    return name.split(' ').map((n) => n[0]).join('').substring(0, 2).toUpperCase();
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/auth/login']);
  }
}