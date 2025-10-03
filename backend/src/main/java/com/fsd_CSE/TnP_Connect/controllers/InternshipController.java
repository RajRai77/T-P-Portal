package com.fsd_CSE.TnP_Connect.controllers;

import com.fsd_CSE.TnP_Connect.Response.Internship.InternshipResponse;
import com.fsd_CSE.TnP_Connect.Response.student.StudentApplicantSummary;
import com.fsd_CSE.TnP_Connect.Repository.InternshipRepository;
import com.fsd_CSE.TnP_Connect.Repository.TnPAdminRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fsd_CSE.TnP_Connect.Enitities.*;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/internships")
public class InternshipController {

    @Autowired private InternshipRepository internshipRepository;
    @Autowired private TnPAdminRepository tnpAdminRepository;

    private static final Logger log = LoggerFactory.getLogger(InternshipController.class);

    //   1: Create Internship
    @PostMapping("/")
    public ResponseEntity<InternshipResponse> createInternship(@RequestBody Internship requestInternship) {

        Integer adminId = requestInternship.getCreatedByAdmin() != null ? requestInternship.getCreatedByAdmin().getId() : null; // Get admin ID from nested object
        if (adminId == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdByAdminId is required.");
        }
        log.info("Attempting to create internship posted by admin ID: {}", adminId);

        TnPAdmin admin = tnpAdminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));


        Internship internship = new Internship();
        internship.setRole(requestInternship.getRole());
        internship.setCompany(requestInternship.getCompany());
        internship.setStipend(requestInternship.getStipend());
        internship.setEligibility(requestInternship.getEligibility());
        internship.setDeadline(requestInternship.getDeadline());
        internship.setDescription(requestInternship.getDescription());
        internship.setStatus(requestInternship.getStatus());
        internship.setCreatedByAdmin(admin);

        Internship savedInternship = internshipRepository.save(internship);
        log.info("Successfully created internship with ID: {}", savedInternship.getId());


        return new ResponseEntity<>(convertToResponse(savedInternship), HttpStatus.CREATED);
    }

    //   2: Get All Internships
    @GetMapping("/")
    public ResponseEntity<List<InternshipResponse>> getAllInternships() {
        log.info("Fetching all internships");

        List<Internship> internships = internshipRepository.findAll();

        List<InternshipResponse> responses = internships.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    //   3: Get Internship By ID (Simple Details)
    @GetMapping("/{id}")
    public ResponseEntity<InternshipResponse> getInternshipById(@PathVariable Integer id) {
        log.info("Fetching internship with ID: {}", id);
        Internship internship = internshipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internship not found with ID: " + id));
        return ResponseEntity.ok(convertToResponse(internship));
    }


    //   4: Delete Internship
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInternship(@PathVariable Integer id) {
        log.warn("Attempting to delete internship with ID: {}", id);

        if(!internshipRepository.existsById(id)) {
            throw new ResourceNotFoundException("Internship not found with ID: " + id);
        }
        internshipRepository.deleteById(id);
        log.info("Deleted internship with ID: {}", id);

        return ResponseEntity.noContent().build();
    }

    //   5: Get all applicants for a specific internship
    @GetMapping("/{id}/applicants")
    public ResponseEntity<List<StudentApplicantSummary>> getInternshipApplicants(@PathVariable Integer id) {
        log.info("Fetching applicants for internship ID: {}", id);

        Internship internship = internshipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Internship not found with ID: " + id));

        List<InternshipApplication> applications = internship.getApplications();

        List<StudentApplicantSummary> summaries = applications.stream()
                .map(this::convertAppToApplicantSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }


    private InternshipResponse convertToResponse(Internship internship) {
        InternshipResponse response = new InternshipResponse();
        response.setId(internship.getId());
        response.setRole(internship.getRole());
        response.setCompany(internship.getCompany());
        response.setStipend(internship.getStipend());
        response.setEligibility(internship.getEligibility());
        response.setDeadline(internship.getDeadline());
        response.setDescription(internship.getDescription());
        response.setStatus(internship.getStatus());
        response.setCreatedAt(internship.getCreatedAt());
        if (internship.getCreatedByAdmin() != null) {
            response.setCreatedByAdminName(internship.getCreatedByAdmin().getName());
            response.setCreatedByAdminId(internship.getCreatedByAdmin().getId());
        }
        return response;
    }

    private StudentApplicantSummary convertAppToApplicantSummary(InternshipApplication app) {
        StudentApplicantSummary summary = new StudentApplicantSummary();


        summary.setApplicationId(app.getId());

        summary.setApplicationStatus(app.getStatus());
        summary.setAppliedAt(app.getAppliedAt());
        if (app.getStudent() != null) {
            summary.setStudentId(app.getStudent().getId());
            summary.setStudentName(app.getStudent().getName());
            summary.setStudentEmail(app.getStudent().getEmail());
            summary.setStudentBranch(app.getStudent().getBranch());
        }
        return summary;
    }
}