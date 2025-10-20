package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.Response.LoginRequest;
import com.fsd_CSE.TnP_Connect.Response.TnPAdminResponse;
import com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses.*;
import com.fsd_CSE.TnP_Connect.Repository.TnPAdminRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import com.fsd_CSE.TnP_Connect.Enitities.*;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;
import org.springframework.web.server.ResponseStatusException;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;


@RestController
@RequestMapping("/api/admins")
public class TnPAdminController {


    @Autowired
    private TnPAdminRepository tnpAdminRepository;

    @Autowired
    private com.fsd_CSE.TnP_Connect.util.EmailService emailService;

    @Autowired
    private com.fsd_CSE.TnP_Connect.util.JwtUtil jwtUtil;
    private static final Logger log = LoggerFactory.getLogger(TnPAdminController.class);

    //Register New Admin
    @PostMapping("/register")
    public ResponseEntity<TnPAdminResponse> registerAdmin(@RequestBody TnPAdmin adminRequest) {
        log.info("Registering new admin with email: {}", adminRequest.getEmail());

        if (tnpAdminRepository.findByEmail(adminRequest.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Admin with this email already exists.");
        }

        TnPAdmin admin = new TnPAdmin();
        admin.setName(adminRequest.getName());
        admin.setEmail(adminRequest.getEmail());
        admin.setRole(adminRequest.getRole());
        admin.setDesignation(adminRequest.getDesignation());
        admin.setPasswordHash(simpleHash(adminRequest.getPasswordHash()));

        TnPAdmin savedAdmin = tnpAdminRepository.save(admin);
        emailService.sendNewAdminRequestEmail(savedAdmin);

        return new ResponseEntity<>(convertToResponse(savedAdmin), HttpStatus.CREATED);
    }

    //Admin Login
    @PostMapping("/login")
    public ResponseEntity<TnPAdminResponse> loginAdmin(@RequestBody LoginRequest request) {
        log.info("Login attempt for email: {}", request.getEmail());

        TnPAdmin admin = tnpAdminRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials"));

        if (!"APPROVED".equals(admin.getApprovalStatus())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your account is pending Super Admin approval.");
        }
        String expectedPasswordHash = simpleHash(request.getPassword());
        if (!expectedPasswordHash.equals(admin.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid credentials");
        }

        // Generate Token
        String token = jwtUtil.generateToken(admin.getEmail(), "ADMIN", admin.getId());

        // Add to response
        TnPAdminResponse response = convertToResponse(admin);
        response.setToken(token);

        log.info("Admin successfully logged in. Token generated.");
        return new ResponseEntity<>(response, HttpStatus.OK);
    }

    //get all pending requests
    @GetMapping("/pending-requests")
    public ResponseEntity<List<TnPAdminResponse>> getPendingAdmins() {
        List<TnPAdminResponse> pending = tnpAdminRepository.findAll().stream()
                .filter(a -> "PENDING".equals(a.getApprovalStatus()))
                .map(this::convertToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(pending);
    }
    // Approve an Admin
    @PatchMapping("/{id}/approve")
    public ResponseEntity<String> approveAdmin(@PathVariable Integer id) {
        TnPAdmin admin = tnpAdminRepository.findById(id).orElseThrow();
        admin.setApprovalStatus("APPROVED");
        tnpAdminRepository.save(admin);

        // Send email to the applicant
        emailService.sendApprovalEmail(admin);

        return ResponseEntity.ok("Admin Approved Successfully. Email sent to applicant.");
    }

    //Get all registered Admin
    @GetMapping("/")
    public ResponseEntity<List<TnPAdminResponse>> getAllAdmins() {
        log.info("Fetching all admins (simple details)");

        List<TnPAdmin> admins = tnpAdminRepository.findAll();

        List<TnPAdminResponse> responses = admins.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());

        return ResponseEntity.ok(responses);
    }

    // PATCH: Update name, role, designation only
    @PatchMapping("/{id}")
    public ResponseEntity<TnPAdminResponse> patchAdmin(
            @PathVariable Integer id,
            @RequestBody Map<String, Object> updates) {

        log.info("Partially updating admin with ID: {}", id);

        TnPAdmin admin = tnpAdminRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with id: " + id));

        if (updates.containsKey("id") || updates.containsKey("email") || updates.containsKey("password")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Updating id, email, or password is not allowed.");
        }

        updates.forEach((key, value) -> {
            switch (key) {
                case "name": admin.setName((String) value); break;
                case "role": admin.setRole((String) value); break;
                case "designation": admin.setDesignation((String) value); break;
                case "phone": admin.setPhone((String) value); break;
                case "linkedinUrl": admin.setLinkedinUrl((String) value); break;
                case "aboutMe": admin.setAboutMe((String) value); break;
                case "profilePicUrl": admin.setProfilePicUrl((String) value); break;
                default:
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Field '" + key + "' cannot be updated.");
            }
        });

        TnPAdmin updatedAdmin = tnpAdminRepository.save(admin);

        log.info("Successfully patched admin with ID: {}", id);
        return ResponseEntity.ok(convertToResponse(updatedAdmin));
    }



    //Get full detaisl of Admin through id
    @GetMapping("/{id}/full-details")
    public ResponseEntity<TnPAdminFullDetailsResponse> getAdminFullDetails(@PathVariable Integer id) {
        log.info("Fetching FULL details for admin ID: {}", id);
        TnPAdmin admin = tnpAdminRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Admin not found with id: " + id));

        TnPAdminFullDetailsResponse response = new TnPAdminFullDetailsResponse();


        response.setId(admin.getId());
        response.setName(admin.getName());
        response.setEmail(admin.getEmail());
        response.setRole(admin.getRole());
        response.setDesignation(admin.getDesignation());
        response.setPhone(admin.getPhone());
        response.setLinkedinUrl(admin.getLinkedinUrl());
        response.setAboutMe(admin.getAboutMe());
        response.setProfilePicUrl(admin.getProfilePicUrl());


        response.setCreatedInternships(
                admin.getCreatedInternships().stream()
                        .map(this::convertInternshipToSummary)
                        .collect(Collectors.toList())
        );
        response.setCreatedNotifications(
                admin.getCreatedNotifications().stream()
                        .map(this::convertNotificationToSummary)
                        .collect(Collectors.toList())
        );
        response.setCreatedResources(
                admin.getCreatedResources().stream()
                        .map(this::convertResourceToSummary)
                        .collect(Collectors.toList())
        );
        response.setCreatedSessions(
                admin.getCreatedSessions().stream()
                        .map(this::convertSessionToSummary)
                        .collect(Collectors.toList())
        );
        response.setUploadedNotes(
                admin.getUploadedNotes().stream()
                        .map(this::convertNoteToSummary)
                        .collect(Collectors.toList())
        );
        response.setCreatedContests(
                admin.getCreatedContests().stream()
                        .map(this::convertContestToSummary)
                        .collect(Collectors.toList())
        );

        return ResponseEntity.ok(response);
    }

    private String simpleHash(String password) {
        if (password == null || password.isEmpty()) {
            return null;
        }
        return new StringBuilder(password).reverse().toString() + ".TnP";
    }


    private TnPAdminResponse convertToResponse(TnPAdmin admin) {
        TnPAdminResponse response = new TnPAdminResponse();
        response.setId(admin.getId());
        response.setName(admin.getName());
        response.setEmail(admin.getEmail());
        response.setRole(admin.getRole());
        response.setDesignation(admin.getDesignation());
        response.setPhone(admin.getPhone());
        response.setLinkedinUrl(admin.getLinkedinUrl());
        response.setAboutMe(admin.getAboutMe());
        response.setProfilePicUrl(admin.getProfilePicUrl());
        return response;
    }

    private InternshipSummary convertInternshipToSummary(Internship internship) {
        InternshipSummary summary = new InternshipSummary();
        summary.setId(internship.getId());
        summary.setRole(internship.getRole());
        summary.setCompany(internship.getCompany());
        return summary;
    }

    private NotificationSummary convertNotificationToSummary(Notification notification) {
        NotificationSummary summary = new NotificationSummary();
        summary.setId(notification.getId());
        summary.setTitle(notification.getTitle());
        summary.setCategory(notification.getCategory());
        return summary;
    }

    private ResourceSummary convertResourceToSummary(Resource resource) {
        ResourceSummary summary = new ResourceSummary();
        summary.setId(resource.getId());
        summary.setTitle(resource.getTitle());
        summary.setType(resource.getType());
        return summary;
    }

    private SessionSummary convertSessionToSummary(Session session) {
        SessionSummary summary = new SessionSummary();
        summary.setId(session.getId());
        summary.setTitle(session.getTitle());
        summary.setSpeaker(session.getSpeaker());
        summary.setSessionDatetime(session.getSessionDatetime());
        return summary;
    }

    private NoteSummary convertNoteToSummary(Notes note) {
        NoteSummary summary = new NoteSummary();
        summary.setId(note.getId());
        summary.setTitle(note.getTitle());
        summary.setTargetBranch(note.getTargetBranch());
        summary.setTargetYear(note.getTargetYear());
        return summary;
    }

    private ContestSummary convertContestToSummary(Contest contest) {
        ContestSummary summary = new ContestSummary();
        summary.setId(contest.getId());
        summary.setTitle(contest.getTitle());
        summary.setPlatform(contest.getPlatform());
        summary.setStartDatetime(contest.getStartDatetime());
        return summary;
    }
}
