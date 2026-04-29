import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  standalone: false
})
export class LoginComponent implements OnInit {
  loginForm!: FormGroup;
  activeTab: 'student' | 'admin' = 'student';
  isLoading = false;
  errorMessage = '';
  successMessage = '';

  // ── Forgot Password modal state ────────────────────────────────────────────
  showForgotModal = false;
  forgotStep: 'email' | 'otp' | 'done' = 'email';
  forgotEmail = '';
  forgotOtp = '';
  forgotNewPassword = '';
  forgotConfirmPassword = '';
  forgotLoading = false;
  forgotError = '';
  forgotSuccess = '';
  resendCooldown = 0;
  private cooldownInterval: any;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit(): void {
    this.loginForm = this.fb.group({
      email:    ['', [Validators.required, Validators.email]],
      password: ['', Validators.required]
    });

    this.route.queryParams.subscribe(params => {
      if (params['role']) {
        this.activeTab = params['role'] === 'admin' ? 'admin' : 'student';
      }
      if (params['registered']) {
        this.successMessage = 'Account created successfully! Please sign in.';
      }
    });
  }

  switchTab(tab: 'student' | 'admin') {
    this.activeTab = tab;
    this.errorMessage = '';
    this.successMessage = '';
    this.loginForm.reset();
  }

  onSubmit() {
    this.errorMessage = '';
    this.successMessage = '';

    if (this.loginForm.valid) {
      this.isLoading = true;

      const loginRequest = this.activeTab === 'student'
        ? this.authService.loginStudent(this.loginForm.value)
        : this.authService.loginAdmin(this.loginForm.value);

      loginRequest.subscribe({
        next: () => {
          this.isLoading = false;
          const targetRoute = this.activeTab === 'student' ? '/dashboard/student' : '/dashboard/admin';
          this.router.navigate([targetRoute]);
        },
        error: (err) => {
          this.isLoading = false;
          this.errorMessage = err.error?.message || 'Invalid credentials or account access denied.';
        }
      });
    } else {
      this.loginForm.markAllAsTouched();
    }
  }

  // ── FORGOT PASSWORD MODAL ───────────────────────────────────────────────────

  openForgotModal() {
    this.showForgotModal = true;
    this.forgotStep = 'email';
    this.forgotEmail = '';
    this.forgotOtp = '';
    this.forgotNewPassword = '';
    this.forgotConfirmPassword = '';
    this.forgotError = '';
    this.forgotSuccess = '';
    this.forgotLoading = false;
    clearInterval(this.cooldownInterval);
    this.resendCooldown = 0;
  }

  closeForgotModal() {
    this.showForgotModal = false;
  }

  forgotSendOtp() {
    if (!this.forgotEmail) {
      this.forgotError = 'Please enter your registered email.';
      return;
    }
    this.forgotError = '';
    this.forgotLoading = true;

    const req = this.activeTab === 'student'
      ? this.authService.studentForgotPasswordSendOtp(this.forgotEmail)
      : this.authService.adminForgotPasswordSendOtp(this.forgotEmail);

    req.subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotStep = 'otp';
        this.forgotSuccess = `OTP sent to ${this.forgotEmail}. Check your inbox (valid 10 min).`;
        this.startResendCooldown();
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotError = err.error?.message || 'No account found with this email.';
      }
    });
  }

  forgotResetPassword() {
    this.forgotError = '';
    if (!this.forgotOtp || this.forgotOtp.length !== 6) {
      this.forgotError = 'Please enter the 6-digit OTP.';
      return;
    }
    if (!this.forgotNewPassword || this.forgotNewPassword.length < 6) {
      this.forgotError = 'Password must be at least 6 characters.';
      return;
    }
    if (this.forgotNewPassword !== this.forgotConfirmPassword) {
      this.forgotError = 'Passwords do not match.';
      return;
    }

    this.forgotLoading = true;

    const req = this.activeTab === 'student'
      ? this.authService.studentForgotPasswordReset(this.forgotEmail, this.forgotOtp, this.forgotNewPassword)
      : this.authService.adminForgotPasswordReset(this.forgotEmail, this.forgotOtp, this.forgotNewPassword);

    req.subscribe({
      next: () => {
        this.forgotLoading = false;
        this.forgotStep = 'done';
        this.forgotSuccess = '✅ Password reset successfully! You can now sign in with your new password.';
        clearInterval(this.cooldownInterval);
      },
      error: (err) => {
        this.forgotLoading = false;
        this.forgotError = err.error?.message || 'Invalid or expired OTP. Please try again.';
      }
    });
  }

  forgotResendOtp() {
    if (this.resendCooldown > 0) return;
    this.forgotSuccess = '';
    this.forgotSendOtp();
  }

  private startResendCooldown(seconds = 60) {
    this.resendCooldown = seconds;
    clearInterval(this.cooldownInterval);
    this.cooldownInterval = setInterval(() => {
      this.resendCooldown--;
      if (this.resendCooldown <= 0) clearInterval(this.cooldownInterval);
    }, 1000);
  }
}