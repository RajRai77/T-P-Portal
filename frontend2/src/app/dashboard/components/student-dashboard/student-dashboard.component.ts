import { ToastService } from '../../../shared/services/toast.service';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { CSS2DRenderer, CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js';
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
  private threeCSSRenderer: CSS2DRenderer | null = null;
  private threeComposer: EffectComposer | null = null;
  private threeScene: THREE.Scene | null = null;
  private threeCamera: THREE.PerspectiveCamera | null = null;
  private threeAnimFrameId: number | null = null;
  private threeOrbitalNodes: { mesh: THREE.Mesh, angle: number, radius: number, speed: number, floatOffset: number }[] = [];
  private threeGalaxy: THREE.Points | null = null;
  private threeInitialized = false;
  constellationSkillInput: string = '';
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
  // THREE.JS CINEMATIC CONSTELLATION ENGINE
  // ==========================================

  getProfileCompletion(): number {
    if (!this.studentData) return 0;
    const fields = ['name', 'email', 'phone', 'bio', 'branch', 'year', 'skills', 'projects', 'experiences'];
    const filled = fields.filter(f => this.studentData[f] && String(this.studentData[f]).trim().length > 0).length;
    return Math.round((filled / fields.length) * 100);
  }

  initThreeJS(): void {
    const container = document.getElementById('three-canvas-container');
    if (!container || this.threeInitialized) return;
    this.threeInitialized = true;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || 600;

    // --- SCENE ---
    this.threeScene = new THREE.Scene();
    this.threeScene.fog = new THREE.FogExp2(0x020d1a, 0.0012);

    // --- CAMERA ---
    this.threeCamera = new THREE.PerspectiveCamera(50, w / h, 0.1, 3000);
    this.threeCamera.position.set(0, 140, 320);
    this.threeCamera.lookAt(0, -10, 0);

    // --- WEBGL RENDERER ---
    this.threeRenderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    this.threeRenderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.threeRenderer.setSize(w, h);
    this.threeRenderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.threeRenderer.toneMappingExposure = 1.2;
    container.appendChild(this.threeRenderer.domElement);

    // --- CSS2D RENDERER (for crisp HTML labels) ---
    this.threeCSSRenderer = new CSS2DRenderer();
    this.threeCSSRenderer.setSize(w, h);
    this.threeCSSRenderer.domElement.style.position = 'absolute';
    this.threeCSSRenderer.domElement.style.top = '0';
    this.threeCSSRenderer.domElement.style.pointerEvents = 'none';
    container.appendChild(this.threeCSSRenderer.domElement);

    // --- BLOOM POST-PROCESSING ---
    const renderPass = new RenderPass(this.threeScene, this.threeCamera);
    const bloomPass = new UnrealBloomPass(new THREE.Vector2(w, h), 1.4, 0.4, 0.15);
    this.threeComposer = new EffectComposer(this.threeRenderer);
    this.threeComposer.addPass(renderPass);
    this.threeComposer.addPass(bloomPass);

    // --- LIGHTING ---
    this.threeScene.add(new THREE.AmbientLight(0x080820, 3));
    const coreGlow = new THREE.PointLight(0xff6600, 15, 180);
    this.threeScene.add(coreGlow);
    const cyanFill = new THREE.PointLight(0x00e5ff, 6, 350);
    cyanFill.position.set(-120, 60, -80);
    this.threeScene.add(cyanFill);
    const purpleFill = new THREE.PointLight(0xb300ff, 4, 300);
    purpleFill.position.set(120, -40, -100);
    this.threeScene.add(purpleFill);

    // --- BUILD SCENE OBJECTS ---
    this.buildSpiralGalaxy();
    this.buildCinematicCore();
    this.buildOrbitTracks();
    this.buildHolographicGrid();
    this.buildAllDataNodes();

    // Start loop
    this.animateThreeJS();
  }

  private buildSpiralGalaxy(): void {
    const count = 12000;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const arms = 3;
    const spread = 0.45;
    const cInner = new THREE.Color(0xffffff);
    const cMid   = new THREE.Color(0x00a0d0);
    const cOuter = new THREE.Color(0x003366);

    for (let i = 0; i < count; i++) {
      const armIdx = i % arms;
      const t = Math.random();
      const r = 180 + t * 600;
      const spinAngle = t * Math.PI * 5;
      const armAngle = (armIdx / arms) * Math.PI * 2;
      const angle = armAngle + spinAngle;
      const randomX = (Math.random() - 0.5) * r * spread * (1 - t * 0.6);
      const randomZ = (Math.random() - 0.5) * r * spread * (1 - t * 0.6);
      const randomY = (Math.random() - 0.5) * 30;
      positions[i * 3]     = Math.cos(angle) * r + randomX;
      positions[i * 3 + 1] = randomY;
      positions[i * 3 + 2] = Math.sin(angle) * r + randomZ;
      const c = t < 0.3 ? cInner.clone().lerp(cMid, t / 0.3)
              : t < 0.7 ? cMid.clone().lerp(cOuter, (t - 0.3) / 0.4)
              : cOuter;
      colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    const mat = new THREE.PointsMaterial({ size: 1.5, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.85 });
    this.threeGalaxy = new THREE.Points(geo, mat);
    this.threeScene!.add(this.threeGalaxy);

    // Dense core glow cloud
    const coreCount = 800;
    const corePos = new Float32Array(coreCount * 3);
    const coreCols = new Float32Array(coreCount * 3);
    for (let i = 0; i < coreCount; i++) {
      const r = Math.random() * 40;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      corePos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      corePos[i*3+1] = r * Math.sin(ph) * Math.sin(th) * 0.4;
      corePos[i*3+2] = r * Math.cos(ph);
      const cc = new THREE.Color().setHSL(0.08 + Math.random() * 0.06, 1, 0.7);
      coreCols[i*3] = cc.r; coreCols[i*3+1] = cc.g; coreCols[i*3+2] = cc.b;
    }
    const coreGeo = new THREE.BufferGeometry();
    coreGeo.setAttribute('position', new THREE.BufferAttribute(corePos, 3));
    coreGeo.setAttribute('color', new THREE.BufferAttribute(coreCols, 3));
    const coreMat = new THREE.PointsMaterial({ size: 2.5, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.9 });
    this.threeScene!.add(new THREE.Points(coreGeo, coreMat));
  }

  private buildCinematicCore(): void {
    // TODO: Load GLTF wireframe face here later (e.g. using GLTFLoader)

    // Outer translucent shell
    const shellMat = new THREE.MeshPhongMaterial({ color: 0xff6600, emissive: 0xff4400, emissiveIntensity: 0.8, transparent: true, opacity: 0.08, side: THREE.FrontSide });
    this.threeScene!.add(new THREE.Mesh(new THREE.SphereGeometry(28, 32, 32), shellMat));

    // Wireframe icosahedrons (layered)
    [20, 25, 30].forEach((r, idx) => {
      const geo = new THREE.IcosahedronGeometry(r, idx === 2 ? 1 : 0);
      const wire = new THREE.LineSegments(new THREE.WireframeGeometry(geo),
        new THREE.LineBasicMaterial({ color: idx === 0 ? 0x00e5ff : idx === 1 ? 0xffa500 : 0xb300ff, transparent: true, opacity: 0.3 - idx * 0.06 }));
      wire.rotation.x = idx * 0.5;
      wire.rotation.y = idx * 0.3;
      wire.userData['rotSpeed'] = [0.003, -0.002, 0.0015][idx];
      this.threeScene!.add(wire);
    });

    // Dense pulsing particle halo around core
    const haloCount = 600;
    const haloPos = new Float32Array(haloCount * 3);
    const haloCols = new Float32Array(haloCount * 3);
    for (let i = 0; i < haloCount; i++) {
      const r = 32 + Math.random() * 18;
      const th = Math.random() * Math.PI * 2;
      const ph = Math.acos(2 * Math.random() - 1);
      haloPos[i*3]   = r * Math.sin(ph) * Math.cos(th);
      haloPos[i*3+1] = r * Math.sin(ph) * Math.sin(th);
      haloPos[i*3+2] = r * Math.cos(ph);
      const hc = new THREE.Color().setHSL(0.55 + Math.random() * 0.15, 1, 0.8);
      haloCols[i*3] = hc.r; haloCols[i*3+1] = hc.g; haloCols[i*3+2] = hc.b;
    }
    const haloGeo = new THREE.BufferGeometry();
    haloGeo.setAttribute('position', new THREE.BufferAttribute(haloPos, 3));
    haloGeo.setAttribute('color', new THREE.BufferAttribute(haloCols, 3));
    const haloPts = new THREE.Points(haloGeo, new THREE.PointsMaterial({ size: 1.8, vertexColors: true, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.7 }));
    haloPts.userData['isHalo'] = true;
    this.threeScene!.add(haloPts);

    // Core solid hot dot
    const hotMat = new THREE.MeshBasicMaterial({ color: 0xffddaa });
    this.threeScene!.add(new THREE.Mesh(new THREE.SphereGeometry(4, 16, 16), hotMat));
  }

  private buildOrbitTracks(): void {
    const tracks = [
      { r: 60,  color: 0x00e5ff, opacity: 0.25 },
      { r: 100, color: 0xb300ff, opacity: 0.20 },
      { r: 145, color: 0xffd700, opacity: 0.18 },
    ];
    tracks.forEach(t => {
      const ring = new THREE.Mesh(
        new THREE.RingGeometry(t.r - 0.5, t.r + 0.5, 180),
        new THREE.MeshBasicMaterial({ color: t.color, side: THREE.DoubleSide, transparent: true, opacity: t.opacity })
      );
      ring.rotation.x = -Math.PI / 2.2;
      this.threeScene!.add(ring);
    });
  }

  private buildHolographicGrid(): void {
    const grid = new THREE.GridHelper(800, 40, 0x001a4d, 0x001020);
    grid.position.y = -55;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.3;
    this.threeScene!.add(grid);
  }

  private makeCSSLabel(text: string, cssClass: string, color: string, subtext?: string): CSS2DObject {
    const div = document.createElement('div');
    div.style.cssText =
      'background:rgba(2,4,20,0.75);backdrop-filter:blur(10px);border:1px solid ' + color +
      ';border-radius:12px;padding:5px 12px;color:' + color +
      ';font-family:monospace;font-size:10px;font-weight:700;white-space:nowrap;pointer-events:none;letter-spacing:0.5px;box-shadow:0 0 12px ' + color + '40;';
    div.textContent = text;
    if (subtext) {
      const sub = document.createElement('div');
      sub.style.cssText = 'color:rgba(255,255,255,0.5);font-size:9px;font-weight:400;margin-top:2px;';
      sub.textContent = subtext;
      div.appendChild(sub);
    }
    return new CSS2DObject(div);
  }

  private buildAllDataNodes(): void {
    const skills = this.newSkills.length > 0
      ? this.newSkills
      : (this.studentData?.skills || '').split(',').map((s: string) => s.trim()).filter((s: string) => s);

    const projects = Array.isArray(this.editProjects) ? this.editProjects : [];

    let expArr: any[] = [];
    try { expArr = this.editExperiences && this.editExperiences.length ? this.editExperiences : (this.studentData?.experiences ? JSON.parse(this.studentData.experiences) : []); } catch(e) {}

    const skillColors   = [0x00e5ff, 0x00ff99, 0x40bfff, 0x80ffcc, 0x00cfff, 0x44ffbb];
    const projectColors = [0xff6600, 0x8b5cf6, 0x10b981, 0xf59e0b, 0xef4444];
    const expColors     = [0xffd700, 0xffaa00, 0xff8c00, 0xffcc33];

    // --- SKILLS: Inner orbit r=60 ---
    skills.forEach((skill: string, i: number) => {
      const angle = (i / Math.max(skills.length, 1)) * Math.PI * 2;
      const col = skillColors[i % skillColors.length];
      const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.6, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(new THREE.OctahedronGeometry(5, 0), mat);
      mesh.position.set(Math.cos(angle) * 60, 0, Math.sin(angle) * 60);
      const label = this.makeCSSLabel(skill, 'skill-label', '#' + col.toString(16).padStart(6, '0'));
      mesh.add(label);
      this.threeScene!.add(mesh);
      this.threeOrbitalNodes.push({ mesh, angle, radius: 60, speed: 0.005 + i * 0.0003, floatOffset: i * 0.7 });
    });

    // --- PROJECTS: Middle orbit r=100 ---
    projects.forEach((proj: any, i: number) => {
      const angle = (i / Math.max(projects.length, 1)) * Math.PI * 2;
      const col = projectColors[i % projectColors.length];
      const size = 9 + Math.random() * 4;
      const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.4, shininess: 60 });
      const mesh = new THREE.Mesh(new THREE.SphereGeometry(size, 20, 20), mat);
      mesh.position.set(Math.cos(angle) * 100, 0, Math.sin(angle) * 100);
      // Planet ring
      const ringMesh = new THREE.Mesh(
        new THREE.TorusGeometry(size * 1.6, 0.7, 6, 40),
        new THREE.MeshBasicMaterial({ color: col, transparent: true, opacity: 0.35 })
      );
      ringMesh.rotation.x = Math.PI / 3;
      mesh.add(ringMesh);
      // Clickable
      mesh.userData['proj'] = proj;
      mesh.userData['clickable'] = true;
      const label = this.makeCSSLabel(proj.title || 'Project', 'proj-label', '#ff9944', proj.techStack);
      mesh.add(label);
      this.threeScene!.add(mesh);
      this.threeOrbitalNodes.push({ mesh, angle, radius: 100, speed: 0.0025 + i * 0.0004, floatOffset: i * 1.2 + 10 });
    });

    // --- EXPERIENCES: Outer orbit r=145 (Tetrahedrons, golden) ---
    expArr.forEach((exp: any, i: number) => {
      const angle = (i / Math.max(expArr.length, 1)) * Math.PI * 2;
      const col = expColors[i % expColors.length];
      const mat = new THREE.MeshPhongMaterial({ color: col, emissive: col, emissiveIntensity: 0.5, transparent: true, opacity: 0.95 });
      const mesh = new THREE.Mesh(new THREE.TetrahedronGeometry(10, 0), mat);
      mesh.position.set(Math.cos(angle) * 145, 0, Math.sin(angle) * 145);
      mesh.userData['proj'] = exp;
      mesh.userData['clickable'] = true;
      const label = this.makeCSSLabel(exp.role || exp.company || 'Experience', 'exp-label', '#' + col.toString(16).padStart(6, '0'), exp.company || exp.duration);
      mesh.add(label);
      this.threeScene!.add(mesh);
      this.threeOrbitalNodes.push({ mesh, angle, radius: 145, speed: 0.0015 + i * 0.0003, floatOffset: i * 1.5 + 5 });
    });
  }

  private animateThreeJS(): void {
    this.threeAnimFrameId = requestAnimationFrame(() => this.animateThreeJS());
    const t = Date.now() * 0.001;

    // Rotate galaxy
    if (this.threeGalaxy) this.threeGalaxy.rotation.y = t * 0.015;

    // Pulse wireframe icosahedrons
    this.threeScene!.children.forEach((obj: any) => {
      if (obj instanceof THREE.LineSegments && obj.userData['rotSpeed']) {
        obj.rotation.y += obj.userData['rotSpeed'];
        obj.rotation.x += obj.userData['rotSpeed'] * 0.5;
      }
      if (obj instanceof THREE.Points && obj.userData['isHalo']) {
        obj.rotation.y = t * 0.03;
        const scale = 1 + Math.sin(t * 2) * 0.04;
        obj.scale.set(scale, scale, scale);
      }
    });

    // Orbit all nodes
    this.threeOrbitalNodes.forEach(node => {
      node.angle += node.speed;
      node.mesh.position.x = Math.cos(node.angle) * node.radius;
      node.mesh.position.z = Math.sin(node.angle) * node.radius;
      node.mesh.position.y = Math.sin(t * 0.9 + node.floatOffset) * 14;
      node.mesh.rotation.y += 0.015;
      node.mesh.rotation.x += 0.008;
    });

    // Slow camera drift for parallax feel
    if (this.threeCamera) {
      this.threeCamera.position.x = Math.sin(t * 0.08) * 20;
      this.threeCamera.lookAt(0, -10, 0);
    }

    if (this.threeComposer) this.threeComposer.render();
    if (this.threeCSSRenderer && this.threeScene && this.threeCamera) {
      this.threeCSSRenderer.render(this.threeScene, this.threeCamera);
    }
  }

  destroyThreeJS(): void {
    if (this.threeAnimFrameId !== null) { cancelAnimationFrame(this.threeAnimFrameId); this.threeAnimFrameId = null; }
    if (this.threeComposer) { this.threeComposer.dispose(); this.threeComposer = null; }
    if (this.threeRenderer) {
      this.threeRenderer.dispose();
      const c = document.getElementById('three-canvas-container');
      if (c) { while (c.firstChild) c.removeChild(c.firstChild); }
      this.threeRenderer = null;
    }
    this.threeCSSRenderer = null;
    this.threeScene = null; this.threeCamera = null; this.threeGalaxy = null;
    this.threeOrbitalNodes = []; this.threeInitialized = false;
  }

    logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    this.router.navigate(['/auth/login']);
  }
}