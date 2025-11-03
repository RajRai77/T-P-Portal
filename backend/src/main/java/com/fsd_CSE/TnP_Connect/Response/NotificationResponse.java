package com.fsd_CSE.TnP_Connect.Response;


import java.time.LocalDate;
import java.time.OffsetDateTime;

public class NotificationResponse {
    private Integer id;
    private String title;
    private String content;
    private String targetBranch;
    private Integer targetYear;
    private String link;
    private LocalDate eventDate;
    private String category;
    private OffsetDateTime createdAt;
    private String postedByAdminName;

    public Integer getId() { return id; }
    public void setId(Integer id) { this.id = id; }
    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }
    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }
    public String getTargetBranch() { return targetBranch; }
    public void setTargetBranch(String targetBranch) { this.targetBranch = targetBranch; }
    public Integer getTargetYear() { return targetYear; }
    public void setTargetYear(Integer targetYear) { this.targetYear = targetYear; }
    public String getLink() { return link; }
    public void setLink(String link) { this.link = link; }
    public LocalDate getEventDate() { return eventDate; }
    public void setEventDate(LocalDate eventDate) { this.eventDate = eventDate; }
    public String getCategory() { return category; }
    public void setCategory(String category) { this.category = category; }
    public OffsetDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(OffsetDateTime createdAt) { this.createdAt = createdAt; }
    public String getPostedByAdminName() { return postedByAdminName; }
    public void setPostedByAdminName(String postedByAdminName) { this.postedByAdminName = postedByAdminName; }
}