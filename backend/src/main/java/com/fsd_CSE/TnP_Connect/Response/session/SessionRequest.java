package com.fsd_CSE.TnP_Connect.Response.session;


import java.time.OffsetDateTime;

public class SessionRequest {

        private String title;
        private String description;
        private String speaker;
        private String targetBranch;
        private Integer targetYear;
        private OffsetDateTime sessionDatetime;
        private String joinUrl;
        private Integer createdByAdminId;

        public String getTitle() { return title; }
        public void setTitle(String title) { this.title = title; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public String getSpeaker() { return speaker; }
        public void setSpeaker(String speaker) { this.speaker = speaker; }
        public String getTargetBranch() { return targetBranch; }
        public void setTargetBranch(String targetBranch) { this.targetBranch = targetBranch; }
        public Integer getTargetYear() { return targetYear; }
        public void setTargetYear(Integer targetYear) { this.targetYear = targetYear; }
        public OffsetDateTime getSessionDatetime() { return sessionDatetime; }
        public void setSessionDatetime(OffsetDateTime sessionDatetime) { this.sessionDatetime = sessionDatetime; }
        public String getJoinUrl() { return joinUrl; }
        public void setJoinUrl(String joinUrl) { this.joinUrl = joinUrl; }
        public Integer getCreatedByAdminId() { return createdByAdminId; }
        public void setCreatedByAdminId(Integer createdByAdminId) { this.createdByAdminId = createdByAdminId; }


}
