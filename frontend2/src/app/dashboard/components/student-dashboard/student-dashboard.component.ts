import { ToastService } from '../../../shared/services/toast.service';
import * as THREE from 'three';
import { Component, OnInit, AfterViewInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
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
export class StudentDashboardComponent implements OnInit, AfterViewInit, AfterViewChecked, OnDestroy {
  isLoading = true;

  // Three.js State
  private threeRenderer: THREE.WebGLRenderer | null = null;
  private threeScene: THREE.Scene | null = null;
  private threeCamera: THREE.PerspectiveCamera | null = null;
  private threeAnimFrameId: number | null = null;
  private threeSkillMeshes: { mesh: THREE.Mesh, angle: number, radius: number, speed: number, label: HTMLElement | null }[] = [];
  private threeProjectMeshes: { mesh: THREE.Mesh, angle: number, radius: number, speed: number, label: HTMLElement | null }[] = [];
  private threeNebula: THREE.Points | null = null;
  private threeInitialized = false;
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
  resumeSectionOrder: string[] = ['personal', 'experience', 'projects', 'education', 'skills', 'hobbies', 'custom'];
  selectedTemplate: 'ats' | 'professional' | 'casual' = 'ats';
  resumeFontSize: string = '14px';
  resumeThemeColor: string = '#cf4500';
  resumeProjects: any[] = [];
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

  constructor(private toastService: ToastService, 
    private dashboardService: StudentDashboardService,
    private router: Router
  ) { }

  ngAfterViewInit(): void {}

  ngOnDestroy(): void {
    this.destroyThreeJS();
  }

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
        this.autoPopulateResume();
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
    if (view === 'constellation') {
      this.destroyThreeJS();
      setTimeout(() => this.initThreeJS(), 150);
      if (!this.newSkills || this.newSkills.length === 0) {
        this.newSkills = [...(this.studentData?.skills || [])];
        this.editProjects = JSON.parse(JSON.stringify(this.studentData?.projects || []));
        this.editExperiences = JSON.parse(JSON.stringify(this.studentData?.experiences || []));
      }
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
  addResumeProject() { this.resumeProjects.push({ title: '', techStack: '', link: '', description: '' }); }
  removeExperience(i: number) { this.resumeExperiences.splice(i, 1); }
  removeResumeProject(i: number) { this.resumeProjects.splice(i, 1); }

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
    if (!element) { this.toastService.show('Preview not found. Generate content first.'); return; }

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
    return name.split(' ').map(n => n.charAt(0)).join('').substring(0, 2).toUpperCase();
  }

  getSkillIcon(skill: string): string {
    const s = (skill || '').toLowerCase();
    if (s.includes('react')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/react/react-original.svg';
    if (s.includes('angular')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/angularjs/angularjs-original.svg';
    if (s.includes('vue')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/vuejs/vuejs-original.svg';
    if (s.includes('node')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/nodejs/nodejs-original.svg';
    if (s.includes('python')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/python/python-original.svg';
    if (s.includes('java')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/java/java-original.svg';
    if (s.includes('spring')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/spring/spring-original.svg';
    if (s.includes('sql') || s.includes('database')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mysql/mysql-original.svg';
    if (s.includes('mongo')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/mongodb/mongodb-original.svg';
    if (s.includes('html')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/html5/html5-original.svg';
    if (s.includes('css')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/css3/css3-original.svg';
    if (s.includes('c++') || s.includes('cpp')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/cplusplus/cplusplus-original.svg';
    if (s.includes('js') || s.includes('javascript')) return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg';
    return 'https://cdn.jsdelivr.net/gh/devicons/devicon/icons/javascript/javascript-original.svg'; 
  }

  ensureAbsoluteUrl(url: string): string {
    if (!url) return '#';
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      return 'https://' + url;
    }
    return url;
  }


  // --- MAIN RESUME DRAG-DROP ---
  mainDragIndex = -1;
  mainDragoverIndex = -1;

  onMainDragStart(index: number) { this.mainDragIndex = index; }
  onMainDragOver(event: DragEvent, index: number) {
    event.preventDefault();
    this.mainDragoverIndex = index;
  }
  onMainDrop(event: DragEvent) {
    event.preventDefault();
    if (this.mainDragIndex >= 0 && this.mainDragoverIndex >= 0 && this.mainDragIndex !== this.mainDragoverIndex) {
      const moved = this.resumeSectionOrder.splice(this.mainDragIndex, 1)[0];
      this.resumeSectionOrder.splice(this.mainDragoverIndex, 0, moved);
    }
    this.mainDragIndex = -1;
    this.mainDragoverIndex = -1;
  }

  trackByIndex(index: number, item: any) { return index; }

  // --- AUTO POPULATE RESUME ---
  autoPopulateResume() {
    if (!this.studentData) return;
    const names = (this.studentData.name || '').split(' ');
    this.resumeFirstName = names[0] || '';
    this.resumeLastName = names.slice(1).join(' ') || '';
    this.resumeEmail = this.studentData.email || '';
    this.resumeRole = this.studentData.branch || '';
    this.resumeSkills = this.studentData.skills || '';
    
    try {
      if (this.studentData.experiences) {
        const exps = JSON.parse(this.studentData.experiences);
        this.resumeExperiences = exps.map((e: any) => ({
          title: e.role || '',
          company: e.company || '',
          date: e.duration || '',
          description: e.description || ''
        }));
        if(this.resumeExperiences.length === 0) {
          this.resumeExperiences = [{ title: '', company: '', date: '', description: '' }];
        }
      }
    } catch(e) {}
    try {
      if (this.studentData.projects) {
        const projs = JSON.parse(this.studentData.projects);
        this.resumeProjects = projs;
        if(!Array.isArray(this.resumeProjects) || this.resumeProjects.length === 0) {
          this.resumeProjects = [{ title: '', techStack: '', link: '', description: '' }];
        }
      }
    } catch(e) {}
  }


  // ==========================================
  // THREE.JS CONSTELLATION ENGINE
  // ==========================================

  initThreeJS(): void {
    const container = document.getElementById('three-canvas-container');
    if (!container || this.threeInitialized) return;
    this.threeInitialized = true;
    const w = container.clientWidth || 800;
    const h = container.clientHeight || 600;
    this.threeScene = new THREE.Scene();
    this.threeScene.background = new THREE.Color(0x02040a);
    this.threeCamera = new THREE.PerspectiveCamera(55, w / h, 0.1, 2000);
    this.threeCamera.position.set(0, 180, 260);
    this.threeCamera.lookAt(0, 0, 0);
    this.threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    this.threeRenderer.setPixelRatio(window.devicePixelRatio);
    this.threeRenderer.setSize(w, h);
    container.appendChild(this.threeRenderer.domElement);
    const ambientLight = new THREE.AmbientLight(0x111133, 2);
    this.threeScene.add(ambientLight);
    const coreLight = new THREE.PointLight(0xff6600, 8, 200);
    this.threeScene.add(coreLight);
    const rimLight = new THREE.PointLight(0x00e5ff, 3, 300);
    rimLight.position.set(-100, 80, -50);
    this.threeScene.add(rimLight);
    const purpleLight = new THREE.PointLight(0xb300ff, 2, 250);
    purpleLight.position.set(100, -50, -80);
    this.threeScene.add(purpleLight);
    this.buildNebula();
    this.buildCentralAvatar();
    this.buildOrbitRings();
    this.buildGridFloor();
    this.buildSkillNodes();
    this.buildProjectPlanets();
    this.animateThreeJS();
  }

  private buildNebula(): void {
    const geo = new THREE.BufferGeometry();
    const count = 6000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const cyan = new THREE.Color(0x00e5ff);
    const purple = new THREE.Color(0xb300ff);
    const white = new THREE.Color(0xffffff);
    for (let i = 0; i < count; i++) {
      const r = 300 + Math.random() * 500;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.35;
      positions[i * 3 + 2] = r * Math.cos(phi);
      const mix = Math.random();
      const c = mix < 0.4 ? cyan : mix < 0.7 ? purple : white;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.6, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 });
    this.threeNebula = new THREE.Points(geo, mat);
    this.threeScene!.add(this.threeNebula);
  }

  private buildCentralAvatar(): void {
    const icoGeo = new THREE.IcosahedronGeometry(18, 1);
    const wireGeo = new THREE.WireframeGeometry(icoGeo);
    const wireMat = new THREE.LineBasicMaterial({ color: 0x00e5ff, transparent: true, opacity: 0.4 });
    this.threeScene!.add(new THREE.LineSegments(wireGeo, wireMat));
    const sphereGeo = new THREE.SphereGeometry(22, 32, 32);
    const sphereMat = new THREE.MeshPhongMaterial({ color: 0xff6600, emissive: 0xff3300, emissiveIntensity: 0.6, transparent: true, opacity: 0.15 });
    this.threeScene!.add(new THREE.Mesh(sphereGeo, sphereMat));
    const coreDot = new THREE.Mesh(new THREE.SphereGeometry(5, 16, 16), new THREE.MeshBasicMaterial({ color: 0xffa500 }));
    this.threeScene!.add(coreDot);
  }

  private buildOrbitRings(): void {
    const radii = [55, 95, 140];
    const colors = [0x00e5ff, 0xb300ff, 0x00ff99];
    for (let ri = 0; ri < radii.length; ri++) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(radii[ri] - 0.4, radii[ri] + 0.4, 128), new THREE.MeshBasicMaterial({ color: colors[ri], side: THREE.DoubleSide, transparent: true, opacity: 0.15 }));
      ring.rotation.x = -Math.PI / 2;
      this.threeScene!.add(ring);
    }
  }

  private buildGridFloor(): void {
    const gridHelper = new THREE.GridHelper(600, 30, 0x00e5ff, 0x001133);
    gridHelper.position.y = -40;
    (gridHelper.material as THREE.Material).opacity = 0.2;
    (gridHelper.material as THREE.Material).transparent = true;
    this.threeScene!.add(gridHelper);
  }

  private buildSkillNodes(): void {
    const skills = this.newSkills.length > 0 ? this.newSkills : (this.studentData?.skills || '').split(',').map((s: string) => s.trim()).filter((s: string) => s);
    const labelsContainer = document.getElementById('three-labels');
    const radius = 55;
    const palette = [0x00e5ff, 0xffd700, 0xff6600, 0xb300ff, 0x00ff99, 0xff0066];
    skills.forEach((skill: string, i: number) => {
      const angle = (i / skills.length) * Math.PI * 2;
      const geo = new THREE.OctahedronGeometry(4 + Math.random() * 3, 0);
      const mat = new THREE.MeshPhongMaterial({ color: palette[i % palette.length], emissive: palette[i % palette.length], emissiveIntensity: 0.5, transparent: true, opacity: 0.9 });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(Math.cos(angle) * radius, 5, Math.sin(angle) * radius);
      this.threeScene!.add(mesh);
      let label: HTMLElement | null = null;
      if (labelsContainer) {
        label = document.createElement('div');
        label.textContent = skill;
        label.style.cssText = 'position:absolute;color:#a5d8ff;font-size:10px;font-weight:700;font-family:monospace;background:rgba(0,5,20,0.7);border:1px solid rgba(165,216,255,0.3);border-radius:10px;padding:2px 7px;pointer-events:none;white-space:nowrap;letter-spacing:0.5px;';
        labelsContainer.appendChild(label);
      }
      this.threeSkillMeshes.push({ mesh, angle, radius, speed: 0.004 + i * 0.0005, label });
    });
  }

  private buildProjectPlanets(): void {
    const projects = Array.isArray(this.editProjects) ? this.editProjects : [];
    const labelsContainer = document.getElementById('three-labels');
    const radius = 95;
    const palette = [0xff6600, 0x8b5cf6, 0x10b981, 0xf59e0b];
    projects.forEach((proj: any, i: number) => {
      const angle = (i / Math.max(projects.length, 1)) * Math.PI * 2;
      const size = 8 + Math.random() * 5;
      const mat = new THREE.MeshPhongMaterial({ color: palette[i % palette.length], emissive: palette[i % palette.length], emissiveIntensity: 0.3, shininess: 80 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 20), mat);
      mesh.position.set(Math.cos(angle) * radius, 0, Math.sin(angle) * radius);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(size * 1.5, 0.8, 6, 40), new THREE.MeshBasicMaterial({ color: palette[i % palette.length], transparent: true, opacity: 0.4 }));
      ring.rotation.x = Math.PI / 3;
      mesh.add(ring);
      this.threeScene!.add(mesh);
      let label: HTMLElement | null = null;
      if (labelsContainer) {
        label = document.createElement('div');
        label.textContent = proj.title || 'Project';
        label.style.cssText = 'position:absolute;color:#ffd700;font-size:11px;font-weight:700;font-family:Inter,sans-serif;background:rgba(0,5,20,0.8);border:1px solid rgba(255,215,0,0.3);border-radius:10px;padding:3px 9px;pointer-events:none;white-space:nowrap;';
        labelsContainer.appendChild(label);
      }
      this.threeProjectMeshes.push({ mesh, angle, radius, speed: 0.002 + i * 0.0003, label });
    });
  }

  private animateThreeJS(): void {
    this.threeAnimFrameId = requestAnimationFrame(() => this.animateThreeJS());
    const t = Date.now() * 0.001;
    if (this.threeNebula) this.threeNebula.rotation.y = t * 0.02;
    this.threeSkillMeshes.forEach(item => {
      item.angle += item.speed;
      item.mesh.position.x = Math.cos(item.angle) * item.radius;
      item.mesh.position.z = Math.sin(item.angle) * item.radius;
      item.mesh.position.y = 5 + Math.sin(t * 1.2 + item.angle) * 8;
      item.mesh.rotation.y += 0.02;
      this.updateLabel(item.label, item.mesh.position);
    });
    this.threeProjectMeshes.forEach(item => {
      item.angle += item.speed;
      item.mesh.position.x = Math.cos(item.angle) * item.radius;
      item.mesh.position.z = Math.sin(item.angle) * item.radius;
      item.mesh.position.y = Math.sin(t * 0.8 + item.angle) * 12;
      item.mesh.rotation.y += 0.01;
      this.updateLabel(item.label, item.mesh.position);
    });
    if (this.threeRenderer && this.threeScene && this.threeCamera) {
      this.threeRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  private updateLabel(label: HTMLElement | null, position: THREE.Vector3): void {
    if (!label || !this.threeCamera || !this.threeRenderer) return;
    const vec = position.clone().project(this.threeCamera);
    const canvas = this.threeRenderer.domElement;
    const x = (vec.x * 0.5 + 0.5) * canvas.clientWidth;
    const y = (-vec.y * 0.5 + 0.5) * canvas.clientHeight;
    if (vec.z > 1) { label.style.display = 'none'; return; }
    label.style.display = 'block';
    label.style.left = (x - label.offsetWidth / 2) + 'px';
    label.style.top = (y + 12) + 'px';
  }

  destroyThreeJS(): void {
    if (this.threeAnimFrameId !== null) { cancelAnimationFrame(this.threeAnimFrameId); this.threeAnimFrameId = null; }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      const c = document.getElementById('three-canvas-container');
      if (c && this.threeRenderer.domElement.parentNode === c) c.removeChild(this.threeRenderer.domElement);
      this.threeRenderer = null;
    }
    const lc = document.getElementById('three-labels');
    if (lc) lc.innerHTML = '';
    this.threeScene = null; this.threeCamera = null; this.threeNebula = null;
    this.threeSkillMeshes = []; this.threeProjectMeshes = []; this.threeInitialized = false;
  }

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/auth/login']);
  }
}