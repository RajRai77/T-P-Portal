package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.Response.NoteResponse;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fsd_CSE.TnP_Connect.Enitities.Notes;
import com.fsd_CSE.TnP_Connect.Enitities.TnPAdmin;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;

import com.fsd_CSE.TnP_Connect.Repository.notesRepository;
import com.fsd_CSE.TnP_Connect.Repository.TnPAdminRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/notes")
public class NoteController {

    @Autowired private notesRepository noteRepository;
    @Autowired private TnPAdminRepository tnpAdminRepository;
    
    private static final Logger log = LoggerFactory.getLogger(NoteController.class);

    //   1: Create Note
    @PostMapping("/")
    public ResponseEntity<NoteResponse> createNote(@RequestBody Notes requestNotes) {

        Integer adminId;
        if (requestNotes.getUploadedByAdmin() != null && requestNotes.getUploadedByAdmin().getId() != null) {
            adminId = requestNotes.getUploadedByAdmin().getId();
        } else {
            adminId = null;
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "uploadedByAdmin object with id is required.");
        }
        log.info("Admin ID {} uploading new note", adminId);

        TnPAdmin admin = tnpAdminRepository.findById(adminId)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with ID: " + adminId));

        Notes notes = new Notes();
        notes.setTitle(requestNotes.getTitle());
        notes.setDescription(requestNotes.getDescription());
        notes.setFileUrl(requestNotes.getFileUrl());
        notes.setTargetBranch(requestNotes.getTargetBranch());
        notes.setTargetYear(requestNotes.getTargetYear());
        notes.setUploadedByAdmin(admin);

        Notes savedNotes = noteRepository.save(notes);
        log.info("Successfully uploaded note with ID {}", savedNotes.getId());

        return new ResponseEntity<>(convertToResponse(savedNotes), HttpStatus.CREATED);
    }

    //   2: Get All Notes - Branch and Year Filter
    @GetMapping("/")
    public ResponseEntity<List<NoteResponse>> getAllNotes(
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) Integer year) {
        log.info("Fetching notes. Filter by branch: {}, year: {}", branch, year);


        List<Notes> allNotes = noteRepository.findAll();

        List<NoteResponse> responses = allNotes.stream()
                .filter(n -> branch == null || "ALL".equalsIgnoreCase(n.getTargetBranch()) || branch.equalsIgnoreCase(n.getTargetBranch()))
                .filter(n -> year == null || n.getTargetYear() == null || n.getTargetYear() == 0 || year.equals(n.getTargetYear()))
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    //   3: Get Note by ID
    @GetMapping("/{id}")
    public ResponseEntity<NoteResponse> getNoteById(@PathVariable Integer id) {
        log.info("Fetching note with ID: {}", id);
        Notes notes = noteRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Note not found with ID: " + id));
        return ResponseEntity.ok(convertToResponse(notes));
    }

    //   4: Delete Note 
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNote(@PathVariable Integer id) {
        log.warn("Attempting to delete note with ID: {}", id);


        if (!noteRepository.existsById(id)) {
            throw new ResourceNotFoundException("Note not found with ID: " + id);
        }
        noteRepository.deleteById(id);
        log.info("Successfully deleted note with ID: {}", id);

        return ResponseEntity.noContent().build();
    }


    private NoteResponse convertToResponse(Notes notes) {
        NoteResponse response = new NoteResponse();
        response.setId(notes.getId());
        response.setTitle(notes.getTitle());
        response.setDescription(notes.getDescription());
        response.setFileUrl(notes.getFileUrl());
        response.setTargetBranch(notes.getTargetBranch());
        response.setTargetYear(notes.getTargetYear());
        response.setUploadedAt(notes.getUploadedAt());
        if (notes.getUploadedByAdmin() != null) {
            response.setUploadedByAdminName(notes.getUploadedByAdmin().getName());
        }
        return response;
    }
}
