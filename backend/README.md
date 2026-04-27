# 🎓 TnP Connect - Backend API

A robust, centralized Training and Placement (TnP) Management System built with Spring Boot. This RESTful API serves as the backbone for managing student profiles, internship drives, campus sessions, study materials, and coding contests.

## 🚀 Overview
Currently, many campus placement cells rely on fragmented communication channels (like WhatsApp groups) to share opportunities. **TnP Connect** solves this by providing a unified platform where administrators can seamlessly post opportunities and track applications, while students can discover, apply, and prepare for their careers in one place.

## 🛠️ Tech Stack
* **Framework:** Java / Spring Boot
* **Database:** PostgreSQL (via Spring Data JPA)
* **API Documentation:** Swagger / OpenAPI (`springdoc-openapi`)
* **Build Tool:** Maven

## 🏗️ Architecture & Design
This project strictly follows a clean **4-File Feature Structure** to ensure separation of concerns and maintainability without over-engineering. For every domain entity, the architecture consists of:
1. **Entity:** The JPA data model mapping to the database table.
2. **Controller:** Handles incoming HTTP requests, core business logic, and security validations.
3. **Repository:** Spring Data JPA interfaces for database operations (including custom `@Query` methods).
4. **Response/Request DTOs:** Data Transfer Objects to prevent infinite JSON loops, secure password hashes from leaking, and provide clean API contracts.

### Exception Handling
* Implements a `@ControllerAdvice` **GlobalExceptionHandler**.
* Centralized handling for `ResourceNotFoundException` (404 Not Found), `DataIntegrityViolationException` (400 Bad Request / 409 Conflict), ensuring clients always receive clean, predictable JSON error responses instead of stack traces.

## ✨ Core Modules & Features

### 👨‍🎓 1. Student Module (`/api/students`)
* Account creation and secure login.
* Full profile management (Branch, Year, CGPA, Top Skills).
* Retrieve a comprehensive dashboard view combining personal details, internship applications, and session registrations.

### 👨‍💼 2. TnP Admin Module (`/api/admins`)
* Dedicated admin registration and authentication.
* Master dashboard endpoint retrieving all admin-created content (Internships, Sessions, Resources) in a single optimized call.

### 💼 3. Internship Management (`/api/internships` & `/api/applications`)
* Admins can post job roles, stipends, and deadlines.
* Students can apply to open positions with a single click.
* Admins can view applicant lists and update application statuses (e.g., Shortlisted, Rejected).

### 📅 4. Session & Workshop Management (`/api/sessions` & `/api/registrations`)
* Schedule campus events, guest lectures, and Zoom workshops.
* Real-time tracking of registration counts.
* Students can register and withdraw; admins can mark attendance.

### 📚 5. Resource & Notes Management (`/api/resources` & `/api/notes`)
* **Resources:** Evergreen, general-purpose links and files for all students (e.g., Aptitude prep).
* **Notes:** Targeted study materials filtered dynamically by a student's `branch` and `year` (e.g., "4th Year CSE OS Notes").

### 🏆 6. Contest Tracker (`/api/contests` & `/api/contest-subscriptions`)
* Broadcast live coding challenges (HackerRank, LeetCode).
* Dynamic status calculation (`UPCOMING`, `LIVE`, `COMPLETED`) based on server time.
* "Notify Me" subscription system for students.

## ⚙️ Local Setup & Installation

### Prerequisites
* Java 17 or higher
* Maven
* PostgreSQL installed and running

### Environment Variables
Configure the following properties in your `src/main/resources/application.properties` file:

```properties
# Database Configuration
spring.datasource.url=jdbc:postgresql://localhost:5432/tnp_connect_db
spring.datasource.username=your_db_username
spring.datasource.password=your_db_password

# Hibernate / JPA
spring.jpa.hibernate.ddl-auto=update
spring.jpa.show-sql=true

# File Upload Directory
file.upload-dir=./uploads
