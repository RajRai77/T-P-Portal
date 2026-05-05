package com.fsd_CSE.TnP_Connect.controllers;

import com.fsd_CSE.TnP_Connect.Response.session.SessionRequest;
import com.fsd_CSE.TnP_Connect.Response.session.SessionResponse;
import com.fsd_CSE.TnP_Connect.Response.student.StudentRegistrationSummary;

import jakarta.persistence.EntityManager;
import jakarta.transaction.Transactional;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fsd_CSE.TnP_Connect.Enitities.*; // Importing all entities
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;
import com.fsd_CSE.TnP_Connect.Repository.SessionRepository;
import com.fsd_CSE.TnP_Connect.Repository.TnPAdminRepository; // Needed for create logic

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import java.util.List;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/sessions")
public class SessionController {

    @Autowired
    private SessionRepository sessionRepository;
    @Autowired
    private TnPAdminRepository tnpAdminRepository;

    @Autowired
    private EntityManager entityManager;

    private static final Logger log = LoggerFactory.getLogger(SessionController.class);

    // 1: Create Session
    @PostMapping("/")
    public ResponseEntity<SessionResponse> createSession(@RequestBody SessionRequest request) {
        log.info("Attempting to create session by admin ID: {}", request.getCreatedByAdminId());

        TnPAdmin admin = tnpAdminRepository.findById(request.getCreatedByAdminId())
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Admin not found with ID: " + request.getCreatedByAdminId()));

        Session session = new Session();
        session.setTitle(request.getTitle());
        session.setDescription(request.getDescription());
        session.setSpeaker(request.getSpeaker());
        session.setTargetBranch(request.getTargetBranch());
        session.setTargetYear(request.getTargetYear());
        session.setSessionDatetime(request.getSessionDatetime());
        session.setMode(request.getMode());
        if ("ONLINE".equalsIgnoreCase(request.getMode())) {
            session.setJoinUrl(request.getJoinUrl());
            session.setVenue(null);
        } else {
            session.setVenue(request.getVenue());
            session.setJoinUrl(null);
        }
        session.setStatus("SCHEDULED");
        session.setCreatedByAdmin(admin);

        Session savedSession = sessionRepository.save(session);
        log.info("Successfully created session with ID: {}", savedSession.getId());

        return new ResponseEntity<>(convertToResponse(savedSession), HttpStatus.CREATED);
    }

    // 2: Get All Sessions
    @GetMapping("/")
    public ResponseEntity<List<SessionResponse>> getAllSessions() {
        log.info("Fetching all sessions");

        List<Session> sessions = sessionRepository.findAll();

        List<SessionResponse> responses = sessions.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // 3: Get Session by ID
    @GetMapping("/{id}")
    public ResponseEntity<SessionResponse> getSessionById(@PathVariable Integer id) {
        log.info("Fetching session with ID: {}", id);
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + id));
        return ResponseEntity.ok(convertToResponse(session));
    }

    // 4: Delete Session
    @DeleteMapping("/{id}")
    @Transactional
    public ResponseEntity<Void> deleteSession(@PathVariable Integer id) {
        log.warn("Attempting to delete session with ID: {}", id);

        // Delete all child registrations directly from the Database bypassing Hibernate
        // state logic
        entityManager.createQuery("DELETE FROM SessionRegistration sr WHERE sr.session.id = :sessionId")
                .setParameter("sessionId", id)
                .executeUpdate();

        // STEP 2: Fetch the session now that it has no registrations holding it back
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + id));

        // STEP 3: Detach from Admin safely
        session.setCreatedByAdmin(null);

        // STEP 4: Delete the session peacefully
        sessionRepository.delete(session);

        log.info("Successfully deleted session with ID: {}", id);
        return ResponseEntity.noContent().build();
    }

    // 4.1: Update Session
    @PutMapping("/{id}")
    public ResponseEntity<SessionResponse> updateSession(@PathVariable Integer id,
            @RequestBody SessionRequest request) {
        log.info("Attempting to update session with ID: {}", id);
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + id));

        if (request.getTitle() != null)
            session.setTitle(request.getTitle());
        if (request.getDescription() != null)
            session.setDescription(request.getDescription());
        if (request.getSpeaker() != null)
            session.setSpeaker(request.getSpeaker());
        if (request.getTargetBranch() != null)
            session.setTargetBranch(request.getTargetBranch());
        if (request.getTargetYear() != null)
            session.setTargetYear(request.getTargetYear());
        if (request.getSessionDatetime() != null)
            session.setSessionDatetime(request.getSessionDatetime());

        if (request.getMode() != null) {
            session.setMode(request.getMode());
            if ("ONLINE".equalsIgnoreCase(request.getMode())) {
                session.setJoinUrl(request.getJoinUrl());
                session.setVenue(null);
            } else {
                session.setVenue(request.getVenue());
                session.setJoinUrl(null);
            }
        }

        Session updatedSession = sessionRepository.save(session);
        return ResponseEntity.ok(convertToResponse(updatedSession));
    }

    // 4.2: Cancel Session
    @PatchMapping("/{id}/cancel")
    public ResponseEntity<SessionResponse> cancelSession(@PathVariable Integer id,
            @RequestBody java.util.Map<String, String> body) {
        log.info("Attempting to cancel session with ID: {}", id);
        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + id));

        session.setStatus("CANCELLED");
        session.setCancellationReason(body.get("reason"));

        Session updatedSession = sessionRepository.save(session);
        return ResponseEntity.ok(convertToResponse(updatedSession));
    }

    // 5: Get all registrations for a specific session
    @GetMapping("/{id}/registrations")
    public ResponseEntity<List<StudentRegistrationSummary>> getSessionRegistrations(@PathVariable Integer id) {
        log.info("Fetching registrations for session ID: {}", id);

        Session session = sessionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Session not found with ID: " + id));

        List<SessionRegistration> registrations = session.getRegistrations();

        List<StudentRegistrationSummary> summaries = registrations.stream()
                .map(this::convertRegToStudentSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    private SessionResponse convertToResponse(Session session) {
        SessionResponse response = new SessionResponse();
        response.setId(session.getId());
        response.setTitle(session.getTitle());
        response.setDescription(session.getDescription());
        response.setSpeaker(session.getSpeaker());
        response.setTargetBranch(session.getTargetBranch());
        response.setTargetYear(session.getTargetYear());
        response.setSessionDatetime(session.getSessionDatetime());
        response.setJoinUrl(session.getJoinUrl());
        response.setMode(session.getMode());
        response.setVenue(session.getVenue());
        response.setStatus(session.getStatus());
        response.setCancellationReason(session.getCancellationReason());
        if (session.getCreatedByAdmin() != null) {
            response.setCreatedByAdminName(session.getCreatedByAdmin().getName());
            response.setCreatedByAdminId(session.getCreatedByAdmin().getId());
        }

        if (session.getRegistrations() != null) {
            response.setRegistrationCount(session.getRegistrations().size());
        } else {
            response.setRegistrationCount(0);
        }
        return response;
    }

    private StudentRegistrationSummary convertRegToStudentSummary(SessionRegistration reg) {
        StudentRegistrationSummary summary = new StudentRegistrationSummary();
        summary.setRegistrationId(reg.getId());
        summary.setRegistrationStatus(reg.getStatus());
        summary.setRegisteredAt(reg.getRegisteredAt());
        if (reg.getStudent() != null) {
            summary.setStudentId(reg.getStudent().getId());
            summary.setStudentName(reg.getStudent().getName());
            summary.setStudentEmail(reg.getStudent().getEmail());
            summary.setStudentBranch(reg.getStudent().getBranch());
        }
        return summary;
    }
}