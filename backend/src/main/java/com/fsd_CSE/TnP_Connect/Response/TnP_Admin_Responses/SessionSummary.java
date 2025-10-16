package com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses;


import lombok.Data;

import java.time.OffsetDateTime;

@Data
public class SessionSummary {

    private Integer id;
    private String title;
    private String speaker;
    private OffsetDateTime sessionDatetime;

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

    public String getSpeaker() {
        return speaker;
    }

    public void setSpeaker(String speaker) {
        this.speaker = speaker;
    }

    public OffsetDateTime getSessionDatetime() {
        return sessionDatetime;
    }

    public void setSessionDatetime(OffsetDateTime sessionDatetime) {
        this.sessionDatetime = sessionDatetime;
    }
}
