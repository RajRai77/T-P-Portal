package com.fsd_CSE.TnP_Connect.Response.session;

import lombok.Data;

import java.time.OffsetDateTime;
@Data
public class SessionRegistrationSummary {


    private Integer registrationId;
    private String sessionTitle;
    private OffsetDateTime sessionDatetime;
    private String status;
    private OffsetDateTime registeredAt;

    public Integer getRegistrationId() {
        return registrationId;
    }

    public void setRegistrationId(Integer id) {
        this.registrationId = id;
    }

    public String getSessionTitle() {
        return sessionTitle;
    }

    public void setSessionTitle(String title) {
        this.sessionTitle = title;
    }

    public OffsetDateTime getSessionDatetime() {
        return sessionDatetime;
    }

    public void setSessionDatetime(OffsetDateTime datetime) {
        this.sessionDatetime = datetime;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public OffsetDateTime getRegisteredAt() {
        return registeredAt;
    }

    public void setRegisteredAt(OffsetDateTime registeredAt) {
        this.registeredAt = registeredAt;
    }


}
