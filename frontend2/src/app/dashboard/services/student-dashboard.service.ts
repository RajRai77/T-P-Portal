import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class StudentDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getStudentFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/students/${id}/full-details`);
  }

  patchStudent(id: number, payload: any): Observable<any> {
    return this.http.patch(`${this.apiUrl}/students/${id}`, payload);
  }

  uploadResume(id: number, file: File): Observable<any> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post(`${this.apiUrl}/students/${id}/upload-resume`, form);
  }

  getStudentById(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/students/${id}`);
  }

  getAdminFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins/${id}/full-details`);
  }

  // --- INTERNSHIPS ---
  getAllInternships(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/internships/`);
  }

  applyForInternship(studentId: number, internshipId: number): Observable<any> {
    const payload = { studentId, internshipId };
    return this.http.post(`${this.apiUrl}/applications/`, payload);
  }

  // --- SESSIONS ---
  getAllSessions(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/sessions/`);
  }

  registerForSession(studentId: number, sessionId: number): Observable<any> {
    const payload = { studentId, sessionId };
    return this.http.post(`${this.apiUrl}/registrations/`, payload);
  }

  // --- RESOURCES & NOTES ---
  getAllResources(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/resources/`);
  }

  getAllNotes(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notes/`);
  }

  // --- CONTESTS ---
  getAllContests(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/contests/`);
  }

  getAllNotifications(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/notifications/`);
  }

  // --- AI FEATURES ---
  askAiAssistant(query: string): Observable<{ answer: string }> {
    return this.http.post<{ answer: string }>(`${this.apiUrl}/ai/chat`, { query });
  }

  buildResumeWithAi(role: string, qualification: string, existingContent: string): Observable<{ optimizedResume: string; suggestions: string[] }> {
    return this.http.post<{ optimizedResume: string; suggestions: string[] }>(`${this.apiUrl}/ai/resume/build`, {
      role,
      qualification,
      existingContent
    });
  }

  generateRoadmap(targetRole: string, currentSkills: string): Observable<Array<{ month: string; topics: string[]; projects: string[] }>> {
    return this.http.post<Array<{ month: string; topics: string[]; projects: string[] }>>(`${this.apiUrl}/ai/roadmap`, {
      targetRole,
      currentSkills
    });
  }

  generateInterviewQuestions(jd: string): Observable<string[]> {
    return this.http.post<string[]>(`${this.apiUrl}/ai/interview/questions`, { jd });
  }

  evaluateInterviewAnswer(question: string, transcript: string): Observable<{ score: number; improvements: string[] }> {
    return this.http.post<{ score: number; improvements: string[] }>(`${this.apiUrl}/ai/interview/evaluate`, { question, transcript });
  }
}