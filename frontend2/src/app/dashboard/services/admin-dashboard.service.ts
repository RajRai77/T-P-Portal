import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AdminDashboardService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  getAdminFullDetails(id: number): Observable<any> {
    return this.http.get(`${this.apiUrl}/admins/${id}/full-details`);
  }

  // --- FILE UPLOADS ---
  uploadFile(file: File, subDirectory: string): Observable<{ url: string }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ url: string }>(`${this.apiUrl}/upload/${subDirectory}`, formData);
  }

  // --- STUDENTS ---
  getAllStudents(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/students/`); }
  getStudentFullDetails(id: number): Observable<any> { return this.http.get(`${this.apiUrl}/students/${id}/full-details`); }
  deleteStudent(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/students/${id}`); }

  // --- INTERNSHIPS ---
  getAllInternships(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/internships/`); }
  getInternshipApplicants(internshipId: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/internships/${internshipId}/applicants`); }

  // --- SESSIONS ---
  getAllSessions(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/sessions/`); }
  createSession(payload: any): Observable<any> { return this.http.post(`${this.apiUrl}/sessions/`, payload); }
  deleteSession(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/sessions/${id}`); }
  getSessionRegistrations(sessionId: number): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/sessions/${sessionId}/registrations`); }

  // --- APPROVALS ---
  getPendingAdmins(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/admins/pending-requests`); }
  approveAdmin(id: number): Observable<any> { return this.http.patch(`${this.apiUrl}/admins/${id}/approve`, {}, { responseType: 'text' }); }

  // --- RESOURCES (Global) ---
  getAllResources(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/resources/`); }
  createResource(payload: any): Observable<any> { return this.http.post(`${this.apiUrl}/resources/`, payload); }
  deleteResource(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/resources/${id}`); }

  // --- NOTES (Branch Specific) ---
  getAllNotes(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/notes/`); }
  createNote(payload: any): Observable<any> { return this.http.post(`${this.apiUrl}/notes/`, payload); }
  deleteNote(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/notes/${id}`); }

  // --- NEW: CONTESTS ---
  getAllContests(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/contests/`); }
  createContest(payload: any): Observable<any> { return this.http.post(`${this.apiUrl}/contests/`, payload); }
  deleteContest(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/contests/${id}`); }

  // --- NEW: NOTIFICATIONS ---
  getAllNotifications(): Observable<any[]> { return this.http.get<any[]>(`${this.apiUrl}/notifications/`); }
  createNotification(payload: any): Observable<any> { return this.http.post(`${this.apiUrl}/notifications/`, payload); }
  deleteNotification(id: number): Observable<any> { return this.http.delete(`${this.apiUrl}/notifications/${id}`); }
}