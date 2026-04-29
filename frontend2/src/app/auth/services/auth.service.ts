import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';
import { ILogin } from '../models/ilogin';
import { IRegister } from '../models/iregister';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) { }

  // ==========================================
  // STUDENT APIS
  // ==========================================

  registerStudent(userData: IRegister): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/`, userData);
  }

  loginStudent(credentials: ILogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userRole', 'STUDENT');
          if (res.id) localStorage.setItem('userId', res.id.toString());
        }
      })
    );
  }

  /** Step 1 of student registration: send OTP to college email */
  sendStudentRegistrationOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/send-otp`, { email });
  }

  /** Step 2 of student registration: verify the OTP */
  verifyStudentRegistrationOtp(email: string, otp: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/verify-otp`, { email, otp });
  }

  /** Student forgot password: step 1 — send OTP */
  studentForgotPasswordSendOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/forgot-password/send-otp`, { email });
  }

  /** Student forgot password: step 2 — verify OTP and reset password */
  studentForgotPasswordReset(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/students/forgot-password/reset`, { email, otp, newPassword });
  }

  // ==========================================
  // ADMIN APIS
  // ==========================================

  registerAdmin(adminData: any): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/register`, adminData);
  }

  loginAdmin(credentials: ILogin): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/login`, credentials).pipe(
      tap((res: any) => {
        if (res && res.token) {
          localStorage.setItem('token', res.token);
          localStorage.setItem('userRole', 'ADMIN');
          if (res.id) localStorage.setItem('userId', res.id.toString());
        }
      })
    );
  }

  /** Admin forgot password: step 1 — send OTP */
  adminForgotPasswordSendOtp(email: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/forgot-password/send-otp`, { email });
  }

  /** Admin forgot password: step 2 — verify OTP and reset password */
  adminForgotPasswordReset(email: string, otp: string, newPassword: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/admins/forgot-password/reset`, { email, otp, newPassword });
  }

  // ==========================================
  // UTILITY METHODS
  // ==========================================

  logout(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userRole');
    localStorage.removeItem('userId');
  }

  isLoggedIn(): boolean {
    return !!localStorage.getItem('token');
  }

  getUserRole(): string | null {
    return localStorage.getItem('userRole');
  }

  getToken(): string | null {
    return localStorage.getItem('token');
  }

  getUserId(): string | null {
    return localStorage.getItem('userId');
  }
}