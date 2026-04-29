import { Component, OnInit } from '@angular/core';
import { AbstractControl, FormBuilder, FormGroup, ValidationErrors, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

/** Custom validator: only @tcetmumbai.in emails */
function tcetEmailValidator(control: AbstractControl): ValidationErrors | null {
  const val: string = control.value || '';
  if (!val) return null; // Let 'required' handle empty
  return val.toLowerCase().endsWith('@tcetmumbai.in')
    ? null
    : { tcetEmail: true };
}

@Component({
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css'],
  standalone: false
})
export class RegisterComponent implements OnInit {
  activeTab: 'student' | 'admin' = 'student';
  studentForm!: FormGroup;
  adminForm!: FormGroup;
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // ── Student OTP flow state ──────────────────────────────────────────────────
  /** Which step we're on: 'email' | 'otp' | 'details' */
  studentStep: 'email' | 'otp' | 'details' = 'email';
  verifiedEmail = '';
  pendingEmail = '';   // stores email between steps so DOM doesn't need to exist
  otpValue = '';
  otpSending = false;
  otpVerifying = false;
  resendCooldown = 0;
  private cooldownInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // 1. Student Form — email field separate so it can be locked after verification
    this.studentForm = this.fb.group({
      tnprollNo: ['', Validators.required],
      name:      ['', Validators.required],
      password:  ['', [Validators.required, Validators.minLength(6)]],
      branch:    ['', Validators.required],
      year:      ['', Validators.required],
      cgpa:      ['', [Validators.required, Validators.min(0), Validators.max(10)]],
      skills:    ['']
    });

    // 2. Admin Form
    this.adminForm = this.fb.group({
      name:         ['', Validators.required],
      email:        ['', [Validators.required, Validators.email]],
      passwordHash: ['', [Validators.required, Validators.minLength(6)]],
      role:         ['', Validators.required],
      designation:  ['', Validators.required]
    });
  }

  switchTab(tab: 'student' | 'admin') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.studentStep = 'email';
    this.verifiedEmail = '';
    this.pendingEmail = '';
    this.otpValue = '';
    clearInterval(this.cooldownInterval);
    this.resendCooldown = 0;
  }

  // ── STUDENT EMAIL & OTP SECTION ─────────────────────────────────────────────

  get emailInputValue(): string {
    return (document.getElementById('studentEmail') as HTMLInputElement)?.value || '';
  }

  isTcetEmail(email: string): boolean {
    return email.toLowerCase().endsWith('@tcetmumbai.in');
  }

  sendOtp(email: string) {
    if (!email || !this.isTcetEmail(email)) {
      this.errorMessage = 'Please enter a valid @tcetmumbai.in email address.';
      return;
    }
    this.pendingEmail = email;   // ← save before DOM element is destroyed
    this.errorMessage = '';
    this.successMessage = '';
    this.otpSending = true;

    this.authService.sendStudentRegistrationOtp(email).subscribe({
      next: () => {
        this.otpSending = false;
        this.studentStep = 'otp';
        this.successMessage = `OTP sent to ${email}. Check your inbox (valid 10 min).`;
        this.startResendCooldown();
      },
      error: (err) => {
        this.otpSending = false;
        this.errorMessage = err.error?.message || 'Failed to send OTP. Please try again.';
      }
    });
  }

  verifyOtp(email: string) {
    // Use pendingEmail as fallback — the DOM input may be gone due to *ngIf
    const resolvedEmail = email || this.pendingEmail;
    if (!this.otpValue || this.otpValue.length !== 6) {
      this.errorMessage = 'Please enter the 6-digit OTP.';
      return;
    }
    if (!resolvedEmail) {
      this.errorMessage = 'Session expired. Please start again.';
      this.studentStep = 'email';
      return;
    }
    this.errorMessage = '';
    this.otpVerifying = true;

    this.authService.verifyStudentRegistrationOtp(resolvedEmail, this.otpValue).subscribe({
      next: () => {
        this.otpVerifying = false;
        this.verifiedEmail = resolvedEmail;
        this.studentStep = 'details';
        this.successMessage = '✅ Email verified! Fill in the rest of your details to complete registration.';
        clearInterval(this.cooldownInterval);
        this.resendCooldown = 0;
      },
      error: (err) => {
        this.otpVerifying = false;
        this.errorMessage = err.error?.message || 'Invalid or expired OTP. Please try again.';
      }
    });
  }

  resendOtp(email: string) {
    if (this.resendCooldown > 0) return;
    this.sendOtp(email || this.pendingEmail);
  }

  private startResendCooldown(seconds = 60) {
    this.resendCooldown = seconds;
    clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownInterval);
    }, 1000);
  }

  // ── SUBMIT ─────────────────────────────────────────────────────────────────

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    // --- STUDENT ---
    if (this.activeTab === 'student') {
      if (this.studentStep !== 'details') {
        this.errorMessage = 'Please verify your email first.';
        return;
      }
      if (this.studentForm.valid) {
        this.isLoading = true;
        const payload = {
          ...this.studentForm.value,
          email: this.verifiedEmail
        };
        this.authService.registerStudent(payload).subscribe({
          next: () => {
            setTimeout(() => {
              this.isLoading = false;
              this.router.navigate(['/auth/login'], { queryParams: { role: 'student', registered: 'true' } });
            }, 800);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Student registration failed. Is the backend running?';
          }
        });
      } else {
        this.studentForm.markAllAsTouched();
      }
    }

    // --- ADMIN ---
    else if (this.activeTab === 'admin') {
      if (this.adminForm.valid) {
        this.isLoading = true;
        this.authService.registerAdmin(this.adminForm.value).subscribe({
          next: () => {
            setTimeout(() => {
              this.isLoading = false;
              this.router.navigate(['/auth/pending-approval']).catch(e => {
                console.error('Routing failed:', e);
                this.errorMessage = 'Account created, but failed to load the next page.';
              });
            }, 800);
          },
          error: (err) => {
            this.isLoading = false;
            this.errorMessage = err.error?.message || 'Admin registration failed. Email might be in use.';
          }
        });
      } else {
        this.adminForm.markAllAsTouched();
      }
    }
  }
}