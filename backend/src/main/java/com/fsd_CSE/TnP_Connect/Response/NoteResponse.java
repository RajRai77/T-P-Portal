package com.fsd_CSE.TnP_Connect.Response;

import java.time.OffsetDateTime;

public class NoteResponse {

    private Integer id;
    private String title;
    private String description;
    private String fileUrl;
    private String targetBranch;
    private Integer targetYear;
    private OffsetDateTime uploadedAt;
    private String uploadedByAdminName;


    public Integer getId() {
        return id;
    }

    public void setId(Integer id) {
        this.id = id;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getFileUrl() {
        return fileUrl;
    }

    public void setFileUrl(String fileUrl) {
        this.fileUrl = fileUrl;
    }

    public String getTargetBranch() {
        return targetBranch;
    }

    public void setTargetBranch(String targetBranch) {
        this.targetBranch = targetBranch;
    }

    public Integer getTargetYear() {
        return targetYear;
    }

    public void setTargetYear(Integer targetYear) {
        this.targetYear = targetYear;
    }

    public OffsetDateTime getUploadedAt() {
        return uploadedAt;
    }

    public void setUploadedAt(OffsetDateTime uploadedAt) {
        this.uploadedAt = uploadedAt;
    }

    public String getUploadedByAdminName() {
        return uploadedByAdminName;
    }

    public void setUploadedByAdminName(String uploadedByAdminName) {
        this.uploadedByAdminName = uploadedByAdminName;
    }


}
