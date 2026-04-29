package com.fsd_CSE.TnP_Connect.controllers;
import com.fsd_CSE.TnP_Connect.Response.Internship.InternshipApplicationSummary;
import com.fsd_CSE.TnP_Connect.Response.LoginRequest;
import com.fsd_CSE.TnP_Connect.Response.session.SessionRegistrationSummary;
import com.fsd_CSE.TnP_Connect.Response.student.StudentFullDetailsResponse;
import com.fsd_CSE.TnP_Connect.Response.student.StudentRequest;
import com.fsd_CSE.TnP_Connect.Response.student.StudentResponse;
import com.fsd_CSE.TnP_Connect.Enitities.InternshipApplication;
import com.fsd_CSE.TnP_Connect.Enitities.SessionRegistration;
import com.fsd_CSE.TnP_Connect.Enitities.Student;
import com.fsd_CSE.TnP_Connect.ExceptionHandling.ResourceNotFoundException;
import com.fsd_CSE.TnP_Connect.Repository.StudentRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.stream.Collectors;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.util.StringUtils;
import java.io.IOException;
import java.io.InputStream;
import java.nio.file.*;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;




@RestController
@RequestMapping("/api/students")
public class StudentController {


    @Autowired
    private com.fsd_CSE.TnP_Connect.util.JwtUtil jwtUtil;
    @Autowired
    private StudentRepository studentRepository;
    @Autowired
    private com.fsd_CSE.TnP_Connect.util.EmailService emailService;
    @Autowired
    private com.fsd_CSE.TnP_Connect.util.OtpStore otpStore;

    // Tracks emails that have been OTP-verified during the current registration flow
    private final Set<String> verifiedEmails = ConcurrentHashMap.newKeySet();

    @Value("${file.upload-dir:./uploads}")
    private String uploadDir;

    private static final Logger log = LoggerFactory.getLogger(StudentController.class);

    // 0: Upload Resume for Student
    @PostMapping(value = "/{id}/upload-resume", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Map<String, String>> uploadResume(
            @PathVariable Integer id,
            @RequestPart("file") MultipartFile file) {
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
        try {
            Path resumeDir = Paths.get(uploadDir, "resumes").toAbsolutePath().normalize();
            Files.createDirectories(resumeDir);
            String uniqueName = id + "_" + UUID.randomUUID() + "_" + StringUtils.cleanPath(Objects.requireNonNull(file.getOriginalFilename()));
            Path dest = resumeDir.resolve(uniqueName);
            try (InputStream in = file.getInputStream()) {
                Files.copy(in, dest, StandardCopyOption.REPLACE_EXISTING);
            }
            String fileUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/files/resumes/").path(uniqueName).toUriString();
            student.setResumeUrl(fileUrl);
            studentRepository.save(student);
            return ResponseEntity.ok(Map.of("resumeUrl", fileUrl));
        } catch (IOException e) {
            throw new RuntimeException("Could not upload resume: " + e.getMessage(), e);
        }
    }



    //  1: Create Student 
    @PostMapping("/")
    public ResponseEntity<StudentResponse> createStudent(@org.springframework.web.bind.annotation.RequestBody StudentRequest request) {

        log.info("Creating new student with email: {}", request.getEmail());

        if (studentRepository.findByEmail(request.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Email is already in use.");
        }
        
        Student newStudent = new Student();
        newStudent.setName(request.getName());
        newStudent.setEmail(request.getEmail());
        newStudent.setBranch(request.getBranch());
        newStudent.setYear(request.getYear());
        newStudent.setCgpa(request.getCgpa());
        newStudent.setSkills(request.getSkills());
        newStudent.setProfilePicUrl(request.getProfilePicUrl());
        newStudent.setTnprollNo(request.getTnprollNo());
        newStudent.setPasswordHash(simpleHash(request.getPassword()));
        
        Student savedStudent = studentRepository.save(newStudent);
        log.info("Created new student with ID: {}", savedStudent.getId());

     
        return new ResponseEntity<>(convertToResponse(savedStudent), HttpStatus.CREATED);
    }




    // 2 Get Student By ID  
    @GetMapping("/{id}")
    public ResponseEntity<StudentResponse> getStudentById(@PathVariable Integer id) {
        log.info("Fetching student with ID: {}", id);
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
        return ResponseEntity.ok(convertToResponse(student));
    }


    // 3. Get All Students 
    @GetMapping("/")
    public ResponseEntity<List<StudentResponse>> getAllStudents() {
        log.info("Fetching all students");
        List<Student> students = studentRepository.findAll();
        List<StudentResponse> studentResponses = students.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
        return ResponseEntity.ok(studentResponses);
    }

    //  4. Update Student  
    @PutMapping("/{id}")
    public ResponseEntity<StudentResponse> updateStudent(@PathVariable Integer id, @org.springframework.web.bind.annotation.RequestBody StudentRequest request) { // <-- CHANGED
        log.info("Updating (PUT) student with ID: {}", id);

        Student studentToUpdate = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
        
        //PUT hence replacing all fields
        studentToUpdate.setName(request.getName());
        studentToUpdate.setEmail(request.getEmail());
        studentToUpdate.setBranch(request.getBranch());
        studentToUpdate.setYear(request.getYear());
        studentToUpdate.setCgpa(request.getCgpa());
        studentToUpdate.setSkills(request.getSkills());
        studentToUpdate.setProfilePicUrl(request.getProfilePicUrl());
        studentToUpdate.setTnprollNo(request.getTnprollNo());
        // For backwards compatibility and full updates, we might need these in StudentRequest but let's just save for now
        // if request doesn't have them, they might be null. For now just updating what was there + new fields if we add them to request.

        Student updatedStudent = studentRepository.save(studentToUpdate);
        log.info("Successfully updated (PUT) student with ID: {}", id);
        return ResponseEntity.ok(convertToResponse(updatedStudent));
    }

    //  5: Patch Student
    @PatchMapping("/{id}")
    public ResponseEntity<StudentResponse> patchStudent(
            @PathVariable Integer id,
            @org.springframework.web.bind.annotation.RequestBody Map<String, Object> updates) {

        Student studentToPatch = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        log.info("Partially updating (PATCH) student with ID: {}", id);
        if (updates.containsKey("id")) {
            throw new IllegalArgumentException("Updating 'id' is not allowed.");
        }
        if (updates.containsKey("tnprollNo")) {
            throw new IllegalArgumentException("Updating tnproll no is not allowed.");
        }
        if (updates.containsKey("email")) {
            throw new IllegalArgumentException("Updating email is not allowed.");
        }
        updates.forEach((key, value) -> {
            switch (key) {
                case "name": studentToPatch.setName((String) value); break;
                case "branch": studentToPatch.setBranch((String) value); break;
                case "year": studentToPatch.setYear((Integer) value); break;
                case "cgpa": studentToPatch.setCgpa(BigDecimal.valueOf(((Number) value).doubleValue())); break;
                case "skills": studentToPatch.setSkills((String) value); break;
                case "profilePicUrl": studentToPatch.setProfilePicUrl((String) value); break;
                case "phone": studentToPatch.setPhone((String) value); break;
                case "linkedinUrl": studentToPatch.setLinkedinUrl((String) value); break;
                case "githubUrl": studentToPatch.setGithubUrl((String) value); break;
                case "aboutMe": studentToPatch.setAboutMe((String) value); break;
                case "resumeUrl": studentToPatch.setResumeUrl((String) value); break;
                case "projects": studentToPatch.setProjects((String) value); break;
                case "experiences": studentToPatch.setExperiences((String) value); break;
            }
        });
        Student updatedStudent = studentRepository.save(studentToPatch);
        log.info("Successfully patched student with ID: {}", id);
        return ResponseEntity.ok(convertToResponse(updatedStudent));
    }

    //  6: Delete Student
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteStudent(@PathVariable Integer id) {
        log.warn("Attempting to delete student with ID: {}", id);
        if (!studentRepository.existsById(id)) {
            throw new ResourceNotFoundException("Student not found with ID: " + id);
        }
        studentRepository.deleteById(id);
        log.info("Successfully deleted student with ID: {}", id);
        return ResponseEntity.noContent().build();
    }

    //  7: Get Student Skills
    @GetMapping("/{id}/skills")
    public ResponseEntity<Map<String, String>> getStudentSkills(@PathVariable Integer id) {
        log.info("Fetching skills for student with ID: {}", id);
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));
        return ResponseEntity.ok(Map.of("skills", student.getSkills()));
    }

    //  8: Search Students
    @GetMapping("/search")
    public ResponseEntity<List<StudentResponse>> searchStudents(
            @RequestParam(required = false) String branch,
            @RequestParam(required = false) BigDecimal cgpa) {
        log.info("Searching students with branch: {} and minimum CGPA: {}", branch, cgpa);
        List<Student> allStudents = studentRepository.findAll();
        return ResponseEntity.ok(allStudents.stream()
                .filter(student -> branch == null || student.getBranch().equalsIgnoreCase(branch))
                .filter(student -> cgpa == null || student.getCgpa().compareTo(cgpa) >= 0)
                .map(this::convertToResponse)
                .collect(Collectors.toList()));
    }


    //  9: Get all applications for a specific student
    @GetMapping("/{id}/internship-applications")
    public ResponseEntity<List<InternshipApplicationSummary>> getStudentApplications(@PathVariable Integer id) { // Renamed
        log.info("Fetching internship applications for student ID: {}", id);
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        List<InternshipApplication> applications = student.getInternshipApplications();

        List<InternshipApplicationSummary> summaries = applications.stream()
                .map(this::convertAppToSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    //  10: Get all session registrations for a specific student
    @GetMapping("/{id}/session-registrations")
    public ResponseEntity<List<SessionRegistrationSummary>> getStudentSessionRegistrations(@PathVariable Integer id) { // Renamed
        log.info("Fetching session registrations for student ID: {}", id);
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        List<SessionRegistration> registrations = student.getSessionRegistrations();

        List<SessionRegistrationSummary> summaries = registrations.stream()
                .map(this::convertRegToSummary)
                .collect(Collectors.toList());

        return ResponseEntity.ok(summaries);
    }

    //  11. Get Full Student Details
    @GetMapping("/{id}/full-details")
    public ResponseEntity<StudentFullDetailsResponse> getStudentFullDetails(@PathVariable Integer id) {
        log.info("Fetching FULL details for student ID: {}", id);
        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        StudentFullDetailsResponse response = new StudentFullDetailsResponse();

        response.setId(student.getId());
        response.setName(student.getName());
        response.setEmail(student.getEmail());
        response.setBranch(student.getBranch());
        response.setYear(student.getYear());
        response.setCgpa(student.getCgpa());
        response.setSkills(student.getSkills());
        response.setProfilePicUrl(student.getProfilePicUrl());
        response.setResumeUrl(student.getResumeUrl());
        response.setPhone(student.getPhone());
        response.setLinkedinUrl(student.getLinkedinUrl());
        response.setGithubUrl(student.getGithubUrl());
        response.setAboutMe(student.getAboutMe());
        response.setProjects(student.getProjects());
        response.setExperiences(student.getExperiences());
        response.setTnprollNo(student.getTnprollNo());


        List<InternshipApplicationSummary> appSummaries = student.getInternshipApplications().stream() // Renamed
                .map(this::convertAppToSummary)
                .collect(Collectors.toList());
        response.setInternshipApplications(appSummaries);


        List<SessionRegistrationSummary> regSummaries = student.getSessionRegistrations().stream() // Renamed
                .map(this::convertRegToSummary)
                .collect(Collectors.toList());
        response.setSessionRegistrations(regSummaries);

        return ResponseEntity.ok(response);
    }

    // Add this new endpoint:
    @PostMapping("/login")
    public ResponseEntity<StudentResponse> loginStudent(@org.springframework.web.bind.annotation.RequestBody LoginRequest request) {
        log.info("Student login attempt for email: {}", request.getEmail());

        Student student = studentRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        String expectedPasswordHash = simpleHash(request.getPassword());
        if (!expectedPasswordHash.equals(student.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }

        // Generate Token
        String token = jwtUtil.generateToken(student.getEmail(), "STUDENT", student.getId());

        // Add to response
        StudentResponse response = convertToResponse(student);
        response.setToken(token);

        log.info("Student successfully logged in. Token generated.");
        return new ResponseEntity<>(response, HttpStatus.OK);
    }


    // ================================================================
    // OTP ENDPOINTS — STUDENT EMAIL VERIFICATION (Registration)
    // ================================================================

    /**
     * Step 1 of registration: send OTP to a @tcetmumbai.in email.
     * Request body: { "email": "student@tcetmumbai.in" }
     */
    @PostMapping("/send-otp")
    public ResponseEntity<Map<String, String>> sendRegistrationOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }
        if (!email.toLowerCase().endsWith("@tcetmumbai.in")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only @tcetmumbai.in email addresses are allowed for student registration.");
        }
        if (studentRepository.findByEmail(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "This email is already registered. Please log in.");
        }

        String otp = otpStore.generateAndStore(email);
        emailService.sendStudentRegistrationOtp(email, otp);
        log.info("Registration OTP sent to {}", email);

        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email + ". Valid for 10 minutes."));
    }

    /**
     * Step 2 of registration: verify the OTP.
     * Request body: { "email": "student@tcetmumbai.in", "otp": "123456" }
     */
    @PostMapping("/verify-otp")
    public ResponseEntity<Map<String, String>> verifyRegistrationOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        String otp   = body.get("otp");

        if (email == null || otp == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "email and otp are required.");
        }
        if (!otpStore.validateAndConsume(email, otp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Invalid or expired OTP. Please request a new one.");
        }

        verifiedEmails.add(email.toLowerCase());
        log.info("Email {} verified successfully for registration.", email);

        return ResponseEntity.ok(Map.of("message", "Email verified. You may now complete registration."));
    }

    // ================================================================
    // FORGOT PASSWORD — STUDENT
    // ================================================================

    /**
     * Step 1: send OTP to registered student email.
     * Request body: { "email": "student@tcetmumbai.in" }
     */
    @PostMapping("/forgot-password/send-otp")
    public ResponseEntity<Map<String, String>> forgotPasswordSendOtp(
            @RequestBody Map<String, String> body) {

        String email = body.get("email");
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required.");
        }

        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "No account found with this email address."));

        String otp = otpStore.generateAndStore(email);
        emailService.sendPasswordResetOtp(email, student.getName() != null ? student.getName() : "Student", otp);
        log.info("Password reset OTP sent to {}", email);

        return ResponseEntity.ok(Map.of("message", "OTP sent to " + email + ". Valid for 10 minutes."));
    }

    /**
     * Step 2: verify OTP and set new password.
     * Request body: { "email": "...", "otp": "123456", "newPassword": "..." }
     */
    @PostMapping("/forgot-password/reset")
    public ResponseEntity<Map<String, String>> forgotPasswordReset(
            @RequestBody Map<String, String> body) {

        String email       = body.get("email");
        String otp         = body.get("otp");
        String newPassword = body.get("newPassword");

        if (email == null || otp == null || newPassword == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "email, otp, and newPassword are required.");
        }
        if (newPassword.length() < 6) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password must be at least 6 characters.");
        }
        if (!otpStore.validateAndConsume(email, otp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED,
                    "Invalid or expired OTP.");
        }

        Student student = studentRepository.findByEmail(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Student not found."));

        student.setPasswordHash(simpleHash(newPassword));
        studentRepository.save(student);

        log.info("Password reset successfully for student email: {}", email);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully. Please log in."));
    }

    // ================================================================
    // Existing Change-Password (kept for backward compatibility)
    // ================================================================

    //  12: Password Patch
    @PatchMapping("/{id}/change-password")
    public ResponseEntity<Map<String, String>> changePassword(
            @PathVariable Integer id,
            @io.swagger.v3.oas.annotations.parameters.RequestBody(
                    description = "Requires new password and OTP.",
                    required = true,
                    content = @Content(
                            mediaType = "application/json",
                            schema = @Schema(type = "object", requiredProperties = {"newPassword", "otp"})
                    )
            )
            @org.springframework.web.bind.annotation.RequestBody Map<String, String> passwordRequest) {

        String newPassword = passwordRequest.get("newPassword");
        String otp = passwordRequest.get("otp");

        if (newPassword == null || otp == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Request body must contain newPassword and otp.");
        }

        Student student = studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found with id: " + id));

        // Use real OTP store now
        if (!otpStore.validateAndConsume(student.getEmail(), otp)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired OTP.");
        }

        log.info("Attempting password reset (via OTP) for student ID: {}", id);

        student.setPasswordHash(simpleHash(newPassword));
        studentRepository.save(student);

        log.info("Password reset successfully for student ID: {}", id);
        return ResponseEntity.ok(Map.of("message", "Password reset successfully."));
    }


    private String simpleHash(String password) {
        if (password == null || password.isEmpty()) {
            return null;
        }
        return new StringBuilder(password).reverse().toString() + ".TnP";
    }


    private StudentResponse convertToResponse(Student student) {
        StudentResponse response = new StudentResponse();
        response.setId(student.getId());
        response.setName(student.getName());
        response.setEmail(student.getEmail());
        response.setBranch(student.getBranch());
        response.setYear(student.getYear());
        response.setCgpa(student.getCgpa());
        response.setSkills(student.getSkills());
        response.setProfilePicUrl(student.getProfilePicUrl());
        response.setResumeUrl(student.getResumeUrl());
        response.setPhone(student.getPhone());
        response.setLinkedinUrl(student.getLinkedinUrl());
        response.setGithubUrl(student.getGithubUrl());
        response.setAboutMe(student.getAboutMe());
        response.setProjects(student.getProjects());
        response.setExperiences(student.getExperiences());
        response.setTnprollNo(student.getTnprollNo());
        return response;
    }

    private InternshipApplicationSummary convertAppToSummary(InternshipApplication app) { // Renamed
        InternshipApplicationSummary summary = new InternshipApplicationSummary(); // Renamed
        summary.setApplicationId(app.getId());
        summary.setStatus(app.getStatus());
        summary.setAppliedAt(app.getAppliedAt());
        if (app.getInternship() != null) {
            summary.setInternshipRole(app.getInternship().getRole());
            summary.setInternshipCompany(app.getInternship().getCompany());
        }
        return summary;
    }

    private SessionRegistrationSummary convertRegToSummary(SessionRegistration reg) {
        SessionRegistrationSummary summary = new SessionRegistrationSummary();
        summary.setRegistrationId(reg.getId());
        summary.setStatus(reg.getStatus());
        summary.setRegisteredAt(reg.getRegisteredAt());
        if (reg.getSession() != null) {
            summary.setSessionTitle(reg.getSession().getTitle());
            summary.setSessionDatetime(reg.getSession().getSessionDatetime());
        }
        return summary;
    }

}
