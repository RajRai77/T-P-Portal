package com.fsd_CSE.TnP_Connect.Response;

import java.time.OffsetDateTime;


public class ResourceResponse {
    private Integer id;
    private String title;
    private String type;
    private String fileUrl;
    private String description;
    private OffsetDateTime createdAt;
    private String createdByAdminName;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getType() { return type; }
    public void setType(String type) { this.type = type; }
    public String getFileUrl() { return fileUrl; }
    public void setFileUrl(String fileUrl) { this.fileUrl = fileUrl; }
    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getCreatedByAdminName() { return createdByAdminName; }
    public void setCreatedByAdminName(String createdByAdminName) { this.createdByAdminName = createdByAdminName; }
}