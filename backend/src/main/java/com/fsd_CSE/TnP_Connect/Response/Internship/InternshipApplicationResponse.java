package com.fsd_CSE.TnP_Connect.Response.Internship;

import java.time.OffsetDateTime;




public class InternshipApplicationResponse {
    private Integer applicationId;
    private String status;
    private OffsetDateTime appliedAt;
    private String studentName;
    private String internshipRole;
    private String internshipCompany;


    public Integer getApplicationId() { return applicationId; }
    public void setApplicationId(Integer applicationId) { this.applicationId = applicationId; }
    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }
    public OffsetDateTime getAppliedAt() { return appliedAt; }
    public void setAppliedAt(OffsetDateTime appliedAt) { this.appliedAt = appliedAt; }
    public String getStudentName() { return studentName; }
    public void setStudentName(String studentName) { this.studentName = studentName; }
    public String getInternshipRole() { return internshipRole; }
    public void setInternshipRole(String internshipRole) { this.internshipRole = internshipRole; }
    public String getInternshipCompany() { return internshipCompany; }
    public void setInternshipCompany(String internshipCompany) { this.internshipCompany = internshipCompany; }
}
