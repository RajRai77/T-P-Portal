import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ToastService, ToastMessage } from '../../services/toast.service';

@Component({
  selector: 'app-toast',
  template: `
    <div class="toast-container" *ngIf="show">
      <div class="toast" [ngClass]="message?.type">
        {{ message?.text }}
      </div>
    </div>
  `,
  styles: [`
    .toast-container {
      position: fixed;
      bottom: 20px;
      right: 20px;
      z-index: 9999;
      animation: slideIn 0.3s ease-out;
    }
    .toast {
      padding: 1rem 1.5rem;
      border-radius: 8px;
      color: white;
      font-weight: 600;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 350px;
      word-wrap: break-word;
    }
    .toast.success { background: #10B981; }
    .toast.error { background: #EF4444; }
    .toast.info { background: #3B82F6; }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `],
  standalone: false
})
export class ToastComponent implements OnInit, OnDestroy {
  show = false;
  message: ToastMessage | null = null;
  private sub!: Subscription;
  private timer: any;

  constructor(private toastService: ToastService) {}

  ngOnInit() {
    this.sub = this.toastService.toast$.subscribe(msg => {
      this.message = msg;
      this.show = true;
      if (this.timer) clearTimeout(this.timer);
      this.timer = setTimeout(() => {
        this.show = false;
      }, 3000);
    });
  }

  ngOnDestroy() {
    if (this.sub) this.sub.unsubscribe();
  }
}
