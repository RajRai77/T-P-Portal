package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.Response.Internship.InternshipApplicationRequest;
import com.fsd_CSE.TnP_Connect.Response.Internship.InternshipApplicationResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import com.fsd_CSE.TnP_Connect.Enitities.*;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;
import com.fsd_CSE.TnP_Connect.Repository.InternshipApplicationRepository;
import com.fsd_CSE.TnP_Connect.Repository.InternshipRepository;
import com.fsd_CSE.TnP_Connect.Repository.StudentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/applications")
public class InternshipApplicationController {

    @Autowired private InternshipApplicationRepository applicationRepository;
    @Autowired private StudentRepository studentRepository;
    @Autowired private InternshipRepository internshipRepository;
    
    private static final Logger log = LoggerFactory.getLogger(InternshipApplicationController.class);

    //   1: Apply for Internship 
    @PostMapping("/")
    public ResponseEntity<InternshipApplicationResponse> applyForInternship(@RequestBody InternshipApplicationRequest request) {
        log.info("Student ID: {} is applying for Internship ID: {}", request.getStudentId(), request.getInternshipId());


        applicationRepository.findByStudentIdAndInternshipId(request.getStudentId(), request.getInternshipId())
                .ifPresent(app -> {
                    throw new ResponseStatusException(HttpStatus.CONFLICT, "Student has already applied for this internship.");
                });

        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with ID: " + request.getStudentId()));

        Internship internship = internshipRepository.findById(request.getInternshipId())
                .orElseThrow(() -> new ResourceNotFoundException("Internship not found with ID: " + request.getInternshipId()));

        InternshipApplication application = new InternshipApplication();
        application.setStudent(student);
        application.setInternship(internship);
        application.setStatus("APPLIED");

        InternshipApplication savedApplication = applicationRepository.save(application);
        log.info("Successfully created application with ID: {}", savedApplication.getId());


        return new ResponseEntity<>(convertToResponse(savedApplication), HttpStatus.CREATED);
    }

    //  2: Get All Applications (Admin View)
    @GetMapping("/")
    public ResponseEntity<List<InternshipApplicationResponse>> getAllApplications() {
        log.info("Fetching all internship applications");
        List<InternshipApplication> applications = applicationRepository.findAll();
        List<InternshipApplicationResponse> responses = applications.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(responses);
    }

    //  3: Get Application by ID
    @GetMapping("/{id}")
    public ResponseEntity<InternshipApplicationResponse> getApplicationById(@PathVariable Integer id) {
        log.info("Fetching application with ID: {}", id);
        InternshipApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + id));
        return ResponseEntity.ok(convertToResponse(application));
    }

    //  4: Update Application Status (Admin Task)
    @PatchMapping("/{id}/status")
    public ResponseEntity<InternshipApplicationResponse> updateApplicationStatus(
            @PathVariable Integer id,
            @RequestBody Map<String, String> statusUpdate) {

        String newStatus = statusUpdate.get("status");
        if (newStatus == null || newStatus.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Status field is required.");
        }

        log.info("Updating status for application ID: {} to {}", id, newStatus);

        InternshipApplication application = applicationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Application not found with ID: " + id));


        application.setStatus(newStatus.toUpperCase());

        InternshipApplication updatedApplication = applicationRepository.save(application);
        log.info("Successfully updated status for application ID: {}", id);

        return ResponseEntity.ok(convertToResponse(updatedApplication));
    }

    //  5: Delete Application (Withdraw / Admin Cleanup)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteApplication(@PathVariable Integer id) {
        log.warn("Attempting to delete application with ID: {}", id);
        if (!applicationRepository.existsById(id)) {
            throw new ResourceNotFoundException("Application not found with ID: " + id);
        }
        applicationRepository.deleteById(id);
        log.info("Successfully deleted application with ID: {}", id);
        return ResponseEntity.noContent().build();
    }

    private InternshipApplicationResponse convertToResponse(InternshipApplication application) {
        InternshipApplicationResponse response = new InternshipApplicationResponse();
        response.setApplicationId(application.getId());
        response.setStatus(application.getStatus());
        response.setAppliedAt(application.getAppliedAt());

        if (application.getStudent() != null) {
            response.setStudentName(application.getStudent().getName());
        }
        if (application.getInternship() != null) {
            response.setInternshipRole(application.getInternship().getRole());
            response.setInternshipCompany(application.getInternship().getCompany());
        }
        return response;
    }
}
