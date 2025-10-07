package com.fsd_CSE.TnP_Connect.Response.TnP_Admin_Responses;

import lombok.Data;

@Data
public class InternshipSummary {
        private Integer id;
        private String role;
        private String company;

        public Integer getId() {
                return id;
        }

        public void setId(Integer id) {
                this.id = id;
        }

        public String getRole() {
                return role;
        }

        public void setRole(String role) {
                this.role = role;
        }

        public String getCompany() {
                return company;
        }

        public void setCompany(String company) {
                this.company = company;
        }
}
