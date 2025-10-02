package com.fsd_CSE.TnP_Connect.Response.Internship;

import lombok.Data;

import java.time.OffsetDateTime;
@Data
public class InternshipApplicationSummary {

    private Integer applicationId;
    private String internshipRole;
    private String internshipCompany;
    private String status;
    private OffsetDateTime appliedAt;

    public Integer getApplicationId() {
        return applicationId;
    }

    public void setApplicationId(Integer id) {
        this.applicationId = id;
    }

    public String getInternshipRole() {
        return internshipRole;
    }

    public void setInternshipRole(String role) {
        this.internshipRole = role;
    }

    public String getInternshipCompany() {
        return internshipCompany;
    }

    public void setInternshipCompany(String company) {
        this.internshipCompany = company;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getAppliedAt() {
        return appliedAt;
    }

    public void setAppliedAt(OffsetDateTime appliedAt) {
        this.appliedAt = appliedAt;
    }
}

