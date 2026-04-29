package com.fsd_CSE.TnP_Connect.util;

import com.fsd_CSE.TnP_Connect.Enitities.TnPAdmin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.*;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;
import java.util.Map;

/**
 * Email service backed by Brevo SMTP relay.
 * All sends are fire-and-forget — failures are logged, never crash the request.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    // Brevo HTTP API — more reliable than SMTP relay
    private static final String BREVO_API_URL = "https://api.brevo.com/v3/smtp/email";

    @Value("${brevo.api.key}")
    private String brevoApiKey;

    @Value("${brevo.sender.email}")
    private String senderEmail;

    @Value("${brevo.sender.name}")
    private String senderName;

    private static final String SUPER_ADMIN_EMAIL = "engineeringmind1209@gmail.com";

    private final RestTemplate restTemplate = new RestTemplate();

    // ============================================================
    // ADMIN emails
    // ============================================================

    /** Notify Super Admin that a new admin registration request has arrived. */
    public void sendNewAdminRequestEmail(TnPAdmin newAdmin) {
        String subject = "URGENT: New Admin Registration Request – TnP Connect Portal";
        String html = """
            <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#F8FAFC;border-radius:12px;">
              <h2 style="color:#0F172A;margin-bottom:8px;">🔔 New Admin Registration Request</h2>
              <p style="color:#475569;">A new user has requested Administrator access to the <strong>TnP Connect Portal</strong>.</p>
              <table style="width:100%;border-collapse:collapse;margin:24px 0;background:#fff;border-radius:8px;overflow:hidden;">
                <tr style="background:#F1F5F9;"><td style="padding:12px 16px;font-weight:600;color:#64748B;width:40%%;">Name</td><td style="padding:12px 16px;color:#0F172A;">%s</td></tr>
                <tr><td style="padding:12px 16px;font-weight:600;color:#64748B;">Email</td><td style="padding:12px 16px;color:#0F172A;">%s</td></tr>
                <tr style="background:#F1F5F9;"><td style="padding:12px 16px;font-weight:600;color:#64748B;">Role</td><td style="padding:12px 16px;color:#0F172A;">%s</td></tr>
                <tr><td style="padding:12px 16px;font-weight:600;color:#64748B;">Designation</td><td style="padding:12px 16px;color:#0F172A;">%s</td></tr>
              </table>
              <p style="color:#475569;">To approve or reject this request, visit the Swagger API:</p>
              <a href="http://localhost:8080/swagger-ui/index.html#/tn-p-admin-controller"
                 style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
                Open Swagger Dashboard →
              </a>
              <p style="margin-top:32px;font-size:0.85rem;color:#94A3B8;">© 2026 TnP Connect · Academic Placement Cell</p>
            </div>
            """.formatted(newAdmin.getName(), newAdmin.getEmail(), newAdmin.getRole(), newAdmin.getDesignation());

        sendHtmlEmail(SUPER_ADMIN_EMAIL, subject, html);
    }

    /** Notify the admin that their account has been approved. */
    public void sendApprovalEmail(TnPAdmin admin) {
        String subject = "✅ TnP Portal: Your Admin Access Has Been Approved";
        String html = """
            <div style="font-family:Inter,sans-serif;max-width:600px;margin:0 auto;padding:32px;background:#F8FAFC;border-radius:12px;">
              <h2 style="color:#15803D;">✅ Access Approved</h2>
              <p style="color:#475569;">Dear <strong>%s</strong>,</p>
              <p style="color:#475569;">
                Your request for Administrator access to the <strong>TnP Connect Portal</strong> has been
                <span style="color:#15803D;font-weight:700;">APPROVED</span> by the Super Admin.
              </p>
              <p style="color:#475569;">You may now log in with your registered email and password.</p>
              <a href="http://localhost:4200/auth/login?role=admin"
                 style="display:inline-block;padding:12px 24px;background:#2563EB;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
                Login to Portal →
              </a>
              <p style="margin-top:32px;font-size:0.85rem;color:#94A3B8;">© 2026 TnP Connect · Academic Placement Cell</p>
            </div>
            """.formatted(admin.getName());

        sendHtmlEmail(admin.getEmail(), subject, html);
    }

    // ============================================================
    // OTP emails — used for Student registration & password reset
    // ============================================================

    /** Send a 6-digit OTP for Student email verification during registration. */
    public void sendStudentRegistrationOtp(String toEmail, String otp) {
        String subject = "TnP Portal: Your Email Verification OTP";
        String html = buildOtpEmail(
            "Email Verification OTP",
            "Use the OTP below to verify your college email address and complete registration on the TnP Connect Portal.",
            otp,
            "This OTP is valid for <strong>10 minutes</strong>. Do not share it with anyone."
        );
        sendHtmlEmail(toEmail, subject, html);
    }

    /** Send a 6-digit OTP for password reset (student). */
    public void sendPasswordResetOtp(String toEmail, String name, String otp) {
        String subject = "TnP Portal: Password Reset OTP";
        String html = buildOtpEmail(
            "Password Reset OTP",
            "Hi <strong>" + name + "</strong>, we received a request to reset your TnP Portal password.",
            otp,
            "This OTP is valid for <strong>10 minutes</strong>. If you did not request a password reset, please ignore this email."
        );
        sendHtmlEmail(toEmail, subject, html);
    }

    /** Send a 6-digit OTP for admin password reset. */
    public void sendAdminPasswordResetOtp(String toEmail, String name, String otp) {
        String subject = "TnP Portal (Admin): Password Reset OTP";
        String html = buildOtpEmail(
            "Admin Password Reset OTP",
            "Hi <strong>" + name + "</strong>, we received a request to reset your TnP Admin Portal password.",
            otp,
            "This OTP is valid for <strong>10 minutes</strong>. If you did not request a reset, please ignore this email."
        );
        sendHtmlEmail(toEmail, subject, html);
    }

    // ============================================================
    // Private helpers
    // ============================================================

    private String buildOtpEmail(String heading, String body, String otp, String footer) {
        return """
            <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px;background:#F8FAFC;border-radius:12px;">
              <h2 style="color:#0F172A;margin-bottom:8px;">🔐 %s</h2>
              <p style="color:#475569;">%s</p>
              <div style="background:#fff;border:2px dashed #2563EB;border-radius:12px;padding:28px;text-align:center;margin:24px 0;">
                <p style="color:#64748B;font-size:0.85rem;margin:0 0 8px;text-transform:uppercase;letter-spacing:2px;">Your One-Time Password</p>
                <p style="font-size:2.8rem;font-weight:800;letter-spacing:10px;color:#0F172A;margin:0;">%s</p>
              </div>
              <p style="color:#94A3B8;font-size:0.9rem;">%s</p>
              <p style="margin-top:32px;font-size:0.85rem;color:#94A3B8;">© 2026 TnP Connect · Academic Placement Cell</p>
            </div>
            """.formatted(heading, body, otp, footer);
    }

    private void sendHtmlEmail(String to, String subject, String htmlBody) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_JSON);
            headers.set("api-key", brevoApiKey);

            // Brevo REST API payload
            String body = String.format(
                "{\"sender\":{\"name\":\"%s\",\"email\":\"%s\"}," +
                "\"to\":[{\"email\":\"%s\"}]," +
                "\"subject\":\"%s\"," +
                "\"htmlContent\":\"%s\"}",
                senderName,
                senderEmail,
                to,
                subject,
                htmlBody.replace("\"", "\\\"").replace("\n", "").replace("\r", "")
            );

            HttpEntity<String> request = new HttpEntity<>(body, headers);
            ResponseEntity<String> response = restTemplate.postForEntity(BREVO_API_URL, request, String.class);

            if (response.getStatusCode().is2xxSuccessful()) {
                log.info("Email sent successfully to {} via Brevo API", to);
            } else {
                log.error("Brevo API returned non-2xx for {}: {}", to, response.getStatusCode());
            }
        } catch (Exception e) {
            log.error("Failed to send email to {}. Reason: {}", to, e.getMessage());
            // Non-fatal — we never crash the request on email failure
        }
    }
}