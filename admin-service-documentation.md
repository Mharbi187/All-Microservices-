# Documentation of `admin-service` (Module 3)

## 1. Introduction
The `admin-service` is the 3rd microservice (MS3) in the Nexus-AID platform. It is primarily responsible for:
- **Administrative Operations & Dashboarding:** Aggregating KPIs from multiple sources.
- **Reporting & Templates:** Managing templates and situational or monthly reports with multi-step workflows.
- **Donation Management:** Handling in-kind and monetary donations, generating PDF receipts with QR codes for validation.
- **Event Audit Logging:** Consuming cross-service events via RabbitMQ and maintaining a robust audit trail.

---

## 2. Technical Stack
- **Language:** Java 21
- **Framework:** Spring Boot 3.4.3
- **Database:** PostgreSQL with Hypersistence Utils for `JSONB` support.
- **Security:** Spring Security & JWT (JSON Web Tokens).
- **Communication & Inter-Service:** 
  - Synchronous: OpenFeign (`CoreServiceFeignClient`) with Eureka Service Discovery. Fault tolerance via Resilience4J.
  - Asynchronous: RabbitMQ (AMQP) for event-driven architecture.
- **Other utilities:** MinIO for file storage, OpenPDF for PDF generation, Google ZXing for QR codes.

---

## 3. Architecture & Inter-Service Communication

### 3.1. Synchronous Communication (Feign Client)
The `admin-service` communicates synchronously with the `core-service` via `CoreServiceFeignClient`:
- `GET /api/v1/management/committees/hierarchy/overview`: Fetches the current user's committee hierarchy.
- `GET /api/v1/profiles/me`: Retrieves the user profile details.
*Circuit breaker and retry mechanisms are implemented using Resilience4J.*

### 3.2. Asynchronous Messaging (RabbitMQ Consumer)
The service acts as an **Event Consumer** for several external domain events, persisting them into its `EventLog` and occasionally reacting to them by creating domain objects:
- **`nexusaid.intervention.alerts`**: Logs intervention events from the Core Service.
- **`nexusaid.stock.alerts`**: Logs stock notifications.
- **`nexusaid.disaster.alerts`**: Automatically triggers the creation of a **DRAFT Situation Report (SITREP)** when a disaster alert is detected by the Disaster Detection Service (MS4).
- **`nexusaid.volunteer.events`**: Logs volunteer registration or role assignment events.

---

## 4. REST APIs and Functionalities

### 4.1. Dashboard Controller (`/api/v1/admin/dashboard`)
Provides aggregated metrics for front-end dashboards.
- **`GET /kpis`** (Public)
  - **Description:** Returns aggregate KPI data including total templates, reports, total monetary amount, etc.
- **`GET /my-context`** (Authenticated)
  - **Description:** Acts as a bridge to `core-service`. It fetches the user's hierarchy and profile and appends the MS3 KPIs into a unified context payload.

### 4.2. Donation Controller (`/api/v1/admin/donations`)
Manages everything related to donations, needs, and receipts.
- **`GET /needs/active`**: Fetches all active donation needs.
- **`POST /needs`**: Creates a new donation need requirement.
- **`POST /monetary`**: Processes an on-site monetary donation. Returns a receipt.
- **`POST /in-kind`**: Processes an on-site in-kind (goods/materials) donation.
- **`GET /receipts/{receiptNumber}/verify`**: Allows a user/system to scan a QR code and verify the authenticity and details of a donation receipt.
- **`GET /receipts/pdf/{receiptNumber}`**: Downloads a dynamically generated PDF receipt containing the transaction details and the verification QR code.

### 4.3. Event Log Controller (`/api/v1/events`)
Exposes the system audit trail and history for reporting.
- **`GET /recent`**: Retrieves the events of the last `N` hours (paginated).
- **`GET /by-type`**: Filters events by a specific event type (e.g., `INTERVENTION_ALERT`).
- **`GET /by-source`**: Filters events by the emitting service.
- **`GET /by-entity`**: Retrieves logs tied to a specific entity ID and type.
- **`GET /stats`**: Returns general statistics regarding the consumed events.

### 4.4. Monthly Report Controller (`/api/v1/reports`)
Handles the periodic reporting workflow of different committees.
- **`GET /committee/{committeeId}`**: Retrieves reports for a specific committee.
- **`GET /`**: Retrieves all monthly reports.
- **`POST /monthly`**: Creates a new Draft report. Limited to specific roles (Health, Youth, First Aid, etc.).
- **`POST /{id}/validate`**: Progresses the report to validated status (Restricted to `SECRETAIRE_GENERAL`).
- **`POST /{id}/finalize`**: Finalizes the monthly report (Restricted to `PRESIDENT`).

### 4.5. Report Controller (`/api/v1/admin/reports`)
Handles general and situational reports following a "CDC (Cahier des Charges)" strict validation workflow.
- **`POST /submit`**: Submits a generic or template-based report.
- **`GET /`**, **`GET /{id}`**: Fetches all or specific reports.
- **`GET /status/{status}`**: Retrieves reports filtered by their current workflow status (e.g., SUBMITTED).
- **`POST /{id}/validate`**: Secrétaire Général validation step (Changes state from `SUBMITTED` -> `VALIDATED`).
- **`POST /{id}/finalize`**: Président final visa step (Changes state from `VALIDATED` -> `FINALIZED`).
- **`GET /dashboard/summary`**: Gets aggregated counts of reports by their workflow statuses.

### 4.6. Template Controller (`/api/v1/admin/templates`)
Manages document and report templates dynamically.
- **`POST /`**: Creates a new template format.
- **`GET /{id}`**: Fetches a single template by ID.
- **`GET /`**: Fetches templates visible to the user, applying filters based on their effective role and committee context.

---

## 5. Entities (Data Models)
The service utilizes the following main database entities:
- **Donations:** `DonationNeed`, `MonetaryDonation`, `InKindDonation`.
- **Reporting:** `MonthlyReport`, `ReportInstance`, `ReportBlockData`.
- **Templates:** `Template`, `TemplateBlock`.
- **Auditing:** `EventLog`.
- **Security:** `SensitiveDataVault` (Potential implementation for encrypting specific sensitive JSON fields).

## 6. Conclusion
The `admin-service` is the backbone for operational reporting and transparency in the Nexus-AID platform. It effectively aggregates data across other services using asynchronous messaging to avoid coupling, while enforcing strict role-based access control and multi-tier validation workflows for reports and donations.
