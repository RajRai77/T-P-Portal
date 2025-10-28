package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.Response.ContestResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import com.fsd_CSE.TnP_Connect.Enitities.*; // Importing all entities
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;
import com.fsd_CSE.TnP_Connect.Repository.ContestRepository;
import com.fsd_CSE.TnP_Connect.Repository.TnPAdminRepository; // Needed for create logic

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException; // Keep for now

import java.time.OffsetDateTime;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/contests")
public class ContestController {
    
    @Autowired private ContestRepository contestRepository;
    @Autowired private TnPAdminRepository tnpAdminRepository;
    
    private static final Logger log = LoggerFactory.getLogger(ContestController.class);

    // 1: Create Contest
    @PostMapping("/")
    public ResponseEntity<ContestResponse> createContest(@RequestBody Contest requestContest) {

        Integer adminId;
        if (requestContest.getCreatedByAdmin() != null && requestContest.getCreatedByAdmin().getId() != null) {
            adminId = requestContest.getCreatedByAdmin().getId();
        } else {
            adminId = null;
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "createdByAdmin object with id is required.");
        }

        log.info("Attempting to create contest by admin ID: {}", adminId);

        TnPAdmin admin = tnpAdminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        Contest contest = new Contest();
        contest.setTitle(requestContest.getTitle());
        contest.setPlatform(requestContest.getPlatform());
        contest.setContestUrl(requestContest.getContestUrl());
        contest.setDescription(requestContest.getDescription());
        contest.setStartDatetime(requestContest.getStartDatetime());
        contest.setEndDatetime(requestContest.getEndDatetime());
        contest.setCreatedByAdmin(admin);

        Contest savedContest = contestRepository.save(contest);
        log.info("Admin ID {} created new contest with ID {}", admin.getId(), savedContest.getId());

        return new ResponseEntity<>(convertToResponse(savedContest), HttpStatus.CREATED);
    }

    //  2: Get All Contests
    @GetMapping("/")
    public ResponseEntity<List<ContestResponse>> getAllContests() {
        log.info("Fetching all contests");

        List<Contest> contests = contestRepository.findAll();

        List<ContestResponse> responses = contests.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    //  3: Get Contest by ID
    @GetMapping("/{id}")
    public ResponseEntity<ContestResponse> getContestById(@PathVariable Integer id) {
        log.info("Fetching contest with ID: {}", id);
        Contest contest = contestRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Contest not found with ID: " + id));
        return ResponseEntity.ok(convertToResponse(contest));
    }

    //  ENDPOINT 4: Delete Contest 
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteContest(@PathVariable Integer id) {
        log.warn("Attempting to delete contest with ID: {}", id);
        if (!contestRepository.existsById(id)) {
            throw new ResourceNotFoundException("Contest not found with ID: " + id);
        }
        contestRepository.deleteById(id);
        log.info("Successfully deleted contest with ID: {}", id);
        return ResponseEntity.noContent().build();
    }


    private ContestResponse convertToResponse(Contest contest) {
        ContestResponse response = new ContestResponse();
        response.setId(contest.getId());
        response.setTitle(contest.getTitle());
        response.setPlatform(contest.getPlatform());
        response.setContestUrl(contest.getContestUrl());
        response.setDescription(contest.getDescription());
        response.setStartDatetime(contest.getStartDatetime());
        response.setEndDatetime(contest.getEndDatetime());
        response.setStatus(calculateStatus(contest));
        if (contest.getCreatedByAdmin() != null) {
            response.setCreatedByAdminName(contest.getCreatedByAdmin().getName());
            response.setCreatedByAdminId(contest.getCreatedByAdmin().getId());
        }
        return response;
    }

    private String calculateStatus(Contest contest) {
        OffsetDateTime now = OffsetDateTime.now();
        if (now.isBefore(contest.getStartDatetime())) {
            return "UPCOMING";
        } else if (now.isAfter(contest.getEndDatetime())) {
            return "COMPLETED";
        } else {
            return "LIVE";
        }
    }
}
