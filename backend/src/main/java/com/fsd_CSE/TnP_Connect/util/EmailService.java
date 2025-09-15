package com.fsd_CSE.TnP_Connect.util;

import com.fsd_CSE.TnP_Connect.Enitities.TnPAdmin;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Autowired
    private JavaMailSender mailSender;

    private final String SUPER_ADMIN_EMAIL = "engineerindmind1209@gmail.com";

    public void sendNewAdminRequestEmail(TnPAdmin newAdmin) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setTo(SUPER_ADMIN_EMAIL);
            message.setSubject("URGENT: New Admin Registration Request");
            message.setText("Hello Super Admin,\n\n" +
                    "A new user has requested Admin access for the TnP Portal.\n\n" +
                    "Details:\n" +
                    "Name: " + newAdmin.getName() + "\n" +
                    "Email: " + newAdmin.getEmail() + "\n" +
                    "Role: " + newAdmin.getRole() + "\n" +
                    "Designation: " + newAdmin.getDesignation() + "\n\n" +
                    "To Approve or Reject this request, please check your Swagger API at:\n" +
                    "http://localhost:8080/swagger-ui/index.html#/tn-p-admin-controller");

            mailSender.send(message);
            log.info("Admin request email sent successfully to Super Admin.");

        } catch (Exception e) {
            log.error("Failed to send Admin request email. Error: {}", e.getMessage());
            // The error is logged, but the app won't crash!
        }
    }

    public void sendApprovalEmail(TnPAdmin admin) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();

            message.setTo(admin.getEmail());
            message.setSubject("TnP Portal: Admin Access Approved");
            message.setText("Dear " + admin.getName() + ",\n\n" +
                    "Your request for Admin access has been APPROVED by the Super Admin.\n" +
                    "You may now login to the portal using your registered email and password.\n\n" +
                    "Welcome to the Academic TnP Command Center.");

            mailSender.send(message);
            log.info("Approval email sent successfully to {}", admin.getEmail());

        } catch (Exception e) {
            log.error("Failed to send approval email to {}. Error: {}", admin.getEmail(), e.getMessage());
        }
    }
}