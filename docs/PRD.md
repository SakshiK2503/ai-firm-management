# AI-POWERED FIRM OPERATIONS PLATFORM  
## Product Requirements Document — Version 1.0

**Working Description:**  
An AI-native Operations Management System that converts client communication into structured, intelligently allocated, tracked and costed workflows while maintaining a permanent organisational knowledge and document repository.

---

# 1. PRODUCT VISION

The organisation currently uses task-management software primarily to:

- assign work;
- monitor employee tasks;
- track deadlines;
- understand individual to-do lists; and
- monitor completion.

The proposed platform should go substantially beyond traditional task management.

The ultimate system should connect:

**Clients → Communication → AI → Tasks → Employees → Review → Delivery → Documents → Costing → Performance → Management Intelligence**

The platform should become the central operating system of the organisation.

Instead of management manually receiving requests, interpreting them, creating tasks, deciding who should handle them, following up with employees and organising completed files, the system should automate most of this workflow.

---

# 2. PRIMARY PRODUCT OBJECTIVES

The platform should achieve six major objectives.

### 2.1 Capture all work

Every material client requirement should ultimately exist as a structured task in the system.

Work should not remain hidden inside:

- WhatsApp chats;
- emails;
- verbal instructions;
- individual notebooks;
- employee memory; or
- personal folders.

---

### 2.2 Allocate work intelligently

Tasks should be automatically allocated based on:

- department;
- skill requirement;
- employee availability;
- estimated task effort;
- existing workload;
- deadlines;
- employee experience;
- priority;
- leave/absence;
- reviewer requirements; and
- client-specific responsibility.

The employee having the **fewest tasks should NOT automatically receive the next task**.

The system should allocate work according to actual available capacity.

---

### 2.3 Track execution

Management should know:

- what is pending;
- who is doing it;
- when it was assigned;
- when it is due;
- estimated effort;
- actual effort;
- present status;
- whether the client has provided the required documents;
- whether the task is under review;
- whether it is delayed; and
- why it is delayed.

---

### 2.4 Build institutional memory

Every client communication, file, working paper and final deliverable should become part of the organisation's searchable knowledge base.

Knowledge should belong to the organisation rather than remain dependent upon individual employees.

---

### 2.5 Measure operational economics

The organisation should eventually know:

- employee utilisation;
- cost per task;
- cost per client;
- cost per service;
- profitability per client;
- profitability per engagement;
- time consumed by rework;
- manager/reviewer time;
- turnaround time; and
- capacity requirements.

---

### 2.6 Create management intelligence

Management should not merely receive charts.

The system should proactively identify:

- overloaded employees;
- underutilised employees;
- tasks likely to miss deadlines;
- clients consuming excessive time;
- departments facing capacity constraints;
- recurring causes of delay;
- excessive rework;
- pending client information;
- abnormal task durations; and
- assignments that can be redistributed.

---

# 3. HIGH-LEVEL PRODUCT ARCHITECTURE

The proposed workflow is:

**Client Communication Channels**

WhatsApp  
Email  
Client Portal  
Internal Instructions  
Website/Forms

↓

**Communication Gateway**

Receives messages, attachments, voice notes and metadata.

↓

**AI Intake Engine**

Identifies:

- client;
- entity;
- nature of request;
- department;
- service;
- period;
- requested deadline;
- urgency;
- attachments;
- estimated complexity; and
- whether clarification is required.

↓

**Structured Task Engine**

Creates:

- task;
- subtasks;
- checklist;
- priority;
- due date;
- estimated hours;
- dependencies;
- responsible department; and
- reviewer requirement.

↓

**Rules & Allocation Engine**

Determines the most appropriate employee.

↓

**Employee Execution Workspace**

Employee performs and records work.

↓

**Review / Approval Workflow**

Maker → Reviewer → Manager/Partner, where applicable.

↓

**Client Delivery**

Completed deliverable communicated through an authorised channel.

↓

**Document & Knowledge Repository**

Complete task history and documentation preserved.

↓

**Analytics & Costing Engine**

Measures productivity, cost, utilisation and profitability.

↓

**Management Intelligence Layer**

Provides alerts, recommendations and organisational intelligence.

---

# 4. ORGANISATIONAL STRUCTURE

The software should support multiple departments.

Initial examples may include:

| Department | Illustrative Activities |
|---|---|
| Accounts & Taxation | GST, TDS, income tax, accounting, finalisation |
| Audit & Compliance | Audit, reconciliation, MCA, ROC, statutory compliance |
| Technology | Software development, automation, AI, integrations |
| Digital Marketing | Social media, advertising, content, SEO |
| CRM / Client Relations | Client communication, follow-up, lead handling |
| Administration | Internal administration |
| Management | Review, supervision, approvals |

Departments must remain configurable.

The software should not hard-code the organisation around any one profession.

---

# 5. USER HIERARCHY

## 5.1 Super Administrator

Full system configuration access.

Typical permissions:

- organisation settings;
- department creation;
- role creation;
- user management;
- workflow configuration;
- integrations;
- security settings;
- audit logs;
- AI configuration.

---

## 5.2 Management / Partner / Director

Organisation-wide visibility subject to policy.

Should see:

- organisational workload;
- employee utilisation;
- department performance;
- delays;
- profitability;
- high-priority work;
- client risk;
- capacity;
- escalations.

---

## 5.3 Department Head

Visibility over assigned department.

Should be able to:

- view department workload;
- modify assignment;
- approve allocation;
- assign reviewers;
- monitor deadlines;
- escalate tasks;
- review team performance.

---

## 5.4 Manager / Reviewer

Should be able to:

- review assigned tasks;
- return work for correction;
- approve completed work;
- assign/reassign subordinate work where authorised;
- review employee time;
- add review notes.

---

## 5.5 Employee / Maker

Should primarily see:

- My Tasks;
- today's priorities;
- upcoming deadlines;
- client instructions;
- required documents;
- working files;
- task checklist;
- review comments.

Employees should not necessarily have unrestricted access to all organisation/client information.

---

## 5.6 Client User — Future Phase

A client portal can later provide:

- request submission;
- file upload;
- task status;
- pending document requests;
- completed deliverables;
- invoices;
- communication.

This is not necessary for MVP.

---

# 6. CLIENT MASTER

Every client should have a permanent master record.

The master should support multiple legal entities under one client/group.

Example:

**ABC Group**

→ ABC Private Limited  
→ ABC LLP  
→ Mr. A  
→ ABC Trust

Each entity may contain:

| Field | Example |
|---|---|
| Entity Name | ABC Private Limited |
| PAN | XXXXX1234X |
| GSTIN | 09XXXXXXXXXXXXX |
| CIN | UXXXXXXXXXX |
| Primary Contact | Client Contact |
| Phone | +91... |
| Email | ... |
| Account Manager | Employee |
| Services | GST, TDS, Audit |
| Engagement Start | Date |
| Billing Structure | Monthly / Assignment |
| Status | Active / Inactive |

The system should also maintain:

- historical tasks;
- client documents;
- communications;
- service history;
- responsible employees;
- billing;
- client-specific instructions;
- important deadlines.

---

# 7. SERVICE MASTER

A standard Service Master should exist.

Example hierarchy:

**Taxation**

→ GST  
→ GSTR-1  
→ GSTR-3B  
→ GSTR-9  
→ GST Notice  
→ GST Reconciliation

**Income Tax**

→ ITR  
→ Tax Audit  
→ TDS  
→ Assessment  
→ Notice

**MCA**

→ Incorporation  
→ AOC-4  
→ MGT-7  
→ DIR-3 KYC  
→ Event-Based Compliance

**Technology**

→ Development  
→ Bug Fix  
→ Integration  
→ Deployment  
→ Automation

**Digital Marketing**

→ Social Media  
→ Campaign  
→ Creative  
→ SEO  
→ Website

Each service should allow configuration of:

- responsible department;
- expected skill level;
- standard checklist;
- normal turnaround time;
- estimated effort range;
- reviewer requirement;
- recurring/non-recurring nature;
- standard documents required.

---

# 8. WHATSAPP INTEGRATION

The organisation's official WhatsApp should eventually become one of the primary work-intake channels.

## Illustrative Message

Client sends:

"Please file our August GST return tomorrow. Sales register attached. Complete by 3 PM."

Attachment:

`Sales Register August.xlsx`

The system should identify:

**Client:** ABC Pvt Ltd  
**Category:** GST  
**Service:** GSTR-1  
**Period:** August 2026  
**Deadline:** Tomorrow, 3 PM  
**Attachment:** Sales Register August.xlsx  
**Department:** Accounts/GST  
**Priority:** High  
**Reviewer Required:** Yes

The proposed task can then be generated automatically.

---

# 9. AI INTAKE ENGINE

The AI should interpret unstructured communication.

Inputs may include:

- text messages;
- voice notes;
- PDFs;
- spreadsheets;
- photographs;
- emails;
- documents.

The AI should produce structured output.

Example:

```text
Client: ABC Private Limited
Entity: ABC Private Limited
Request: File GSTR-1
Period: August 2026
Requested Deadline: 17 September 2026, 3:00 PM
Department: GST
Service Code: GST-GSTR1
Priority: High
Attachments: 1
Estimated Effort: 90 minutes
Confidence: 96%
```

---

# 10. AI CONFIDENCE RULE

AI-generated tasks should carry a confidence score.

### High Confidence

Example: 95%

Task can be automatically created and assigned.

### Medium Confidence

Example: 75%

Task can be created as:

**AI Proposed — Awaiting Internal Confirmation**

### Low Confidence

Example: 40%

The system should not guess.

It should route the communication to an internal clarification queue.

This is especially important for professional services.

---

# 11. TASK STRUCTURE

Every task should have a unique Task ID.

Example:

`GST-ABC-2026-09-00127`

Core task fields:

| Field | Description |
|---|---|
| Task ID | Unique |
| Client | Client master |
| Entity | Relevant entity |
| Department | Responsible department |
| Service | Nature of work |
| Task Title | Description |
| Source | WhatsApp/email/manual |
| Original Instruction | Raw communication |
| AI Summary | Structured summary |
| Assigned To | Employee |
| Reviewer | Reviewer |
| Priority | Low/Normal/High/Critical |
| Created On | Timestamp |
| Start Date | Planned |
| Due Date | Commitment |
| Estimated Hours | Work estimate |
| Actual Hours | Time recorded |
| Status | Workflow status |
| Attachments | Linked files |
| Dependencies | Other tasks |
| Client SLA | Where applicable |
| Internal SLA | Where applicable |

---

# 12. TASK STATUS MODEL

Tasks should move through controlled statuses.

Recommended core workflow:

**New**

↓

**AI Processing**

↓

**Awaiting Allocation**

↓

**Assigned**

↓

**In Progress**

↓

**Awaiting Client Information**  
or  
**Awaiting Internal Dependency**

↓

**In Progress**

↓

**Submitted for Review**

↓

**Review in Progress**

↓

**Correction Required**  
or  
**Approved**

↓

**Client Delivery**

↓

**Completed**

↓

**Archived**

Separate status:

**Cancelled**

A complete timestamp trail should be maintained.

---

# 13. TASK ALLOCATION ENGINE

This should be one of the platform's most important proprietary components.

The system should NOT simply allocate work according to pending task count.

## Illustrative Allocation Factors

### Employee eligibility

- correct department;
- required skill;
- required authority;
- client restrictions;
- experience level.

### Employee capacity

Available working hours minus committed hours.

### Existing deadlines

Urgent existing tasks reduce available capacity.

### Task complexity

Complex assignments require suitable employees.

### Employee proficiency

Some employees may be faster or more experienced in specific services.

### Availability

Consider:

- leave;
- meetings;
- holidays;
- working hours;
- part-time arrangements.

### Continuity

Where beneficial, existing client ownership should receive additional weight.

---

# 14. PROPOSED CAPACITY MODEL

Instead of:

**Pending Tasks = 3**

The system should calculate:

**Committed Workload = 14.5 hours**

Example:

| Employee | Pending Tasks | Estimated Pending Hours | Available Hours | Capacity |
|---|---:|---:|---:|---:|
| Employee A | 5 | 3.0 | 8 | 62.5% free |
| Employee B | 2 | 11.0 | 8 | Overloaded |
| Employee C | 4 | 6.0 | 8 | 25% free |

Although Employee B has only two pending assignments, the system should not assign additional work to Employee B.

---

# 15. ALLOCATION SCORE

A future algorithm can use an illustrative weighted score:

```text
Allocation Score =

Skill Match
+ Available Capacity
+ Client Continuity
+ Historical Efficiency
+ Experience Suitability

minus

Current Workload
+ Deadline Congestion
+ Leave Risk
+ Existing Critical Work
```

The employee with the strongest valid score receives the assignment.

The score should remain explainable.

Example:

**Why was this assigned to Sakshi?**

System:

"Sakshi possesses the required GST skill, has 4.2 available hours before the requested deadline and currently has the highest eligible capacity among three qualified employees."

This is important for management trust.

---

# 16. MANUAL OVERRIDE

Management must always be able to override AI allocation.

Every override should optionally capture:

**Reason for reassignment**

Examples:

- employee expertise;
- client preference;
- continuity;
- training;
- workload balancing;
- management discretion.

This information can later improve the allocation model.

---

# 17. EMPLOYEE DASHBOARD

The employee interface should remain extremely simple.

Primary screen:

# MY WORK

### Due Today

Tasks due today.

### In Progress

Currently active work.

### Upcoming

Future assignments.

### Waiting

Client/internal dependency.

### Returned for Correction

Reviewer feedback.

For each task show:

| Priority | Client | Task | Deadline | Estimated | Status |
|---|---|---|---|---:|---|
| Critical | ABC Ltd | GSTR-1 | 3 PM | 1.5h | Not Started |
| High | XYZ Ltd | MCA Filing | Tomorrow | 2h | In Progress |
| Normal | Client C | ITR | 19 Sep | 45m | Waiting |

The system should clearly communicate:

**What should I work on next?**

---

# 18. TASK DETAIL SCREEN

Opening a task should display:

### Header

Client  
Entity  
Task  
Deadline  
Priority  
Assignee  
Reviewer

### Client Instruction

Original WhatsApp/email instruction.

### AI Interpretation

Concise description of work required.

### Checklist

Standard + AI-generated checklist.

### Attachments

Incoming documents.

### Working Papers

Employee files.

### Time

Estimated vs actual.

### Comments

Internal discussion.

### Client Communication

Relevant communication history.

### Review

Reviewer comments.

### Activity Timeline

Complete audit trail.

---

# 19. TIME TRACKING

The system should allow:

**Start Work**

**Pause**

**Resume**

**Complete**

Employees may also manually record time subject to permissions.

Time should be recorded against:

- employee;
- task;
- client;
- service;
- date;
- duration.

This enables costing and productivity analytics.

---

# 20. REVIEW / MAKER-CHECKER SYSTEM

Professional work should support maker-checker workflows.

Example:

Employee prepares GSTR-1.

↓

Submits for review.

↓

Reviewer receives notification.

↓

Reviewer either:

**Approve**

or

**Return for Correction**

↓

Employee corrects.

↓

Reviewer approves.

↓

Final output delivered.

The system should maintain:

- original submission time;
- review time;
- corrections;
- reviewer notes;
- number of rework cycles.

---

# 21. DOCUMENT MANAGEMENT

Documents should automatically inherit context.

Example:

Client sends:

`Sales Register.xlsx`

System stores metadata:

```text
Client: ABC Private Limited
Entity: ABC Private Limited
FY: 2026-27
Department: GST
Service: GSTR-1
Period: August 2026
Task ID: GST-ABC-2026-09-00127
Document Type: Input
Source: WhatsApp
Uploaded By: Client
```

The employee should not need to manually create complex folder structures.

---

# 22. DOCUMENT TYPES

Suggested categories:

**Client Input**

Documents received from client.

**Working Paper**

Internal calculations/files.

**Draft**

Draft output.

**Review Copy**

Submitted for internal review.

**Final**

Approved deliverable.

**Acknowledgement**

Portal acknowledgement/receipt.

**Communication**

Supporting correspondence.

---

# 23. VERSION CONTROL

Files should support versions.

Example:

`GSTR1_Working_v1`

Employee modifies.

`v2`

Reviewer correction.

`v3`

Final.

The history should remain accessible.

A new upload should not silently destroy the previous file.

---

# 24. SEARCH & ORGANISATIONAL KNOWLEDGE

Management should eventually be able to ask:

"Show all GST notices received from ABC Limited."

"Find last year's audit working paper for Client X."

"Who handled Client Y's incorporation?"

"Show every completed task relating to TDS for FY 2025-26."

"Find the final response filed against the GST notice dated 12 June."

The AI should retrieve information using controlled access permissions.

---

# 25. MANAGEMENT DASHBOARD

The management dashboard should answer:

## What requires attention?

Example:

**Organisation**

Open Tasks: 184  
Due Today: 31  
Overdue: 8  
Waiting on Client: 27  
Awaiting Review: 16

**Capacity**

Accounts: 87% utilised  
Technology: 94% utilised  
Marketing: 63% utilised  
CRM: 52% utilised

**Alerts**

3 employees overloaded.

7 commitments likely to breach deadline.

16 tasks awaiting reviewer action.

12 tasks waiting for client documents for more than 3 days.

---

# 26. MANAGEMENT AI

A management AI layer should convert operational data into recommendations.

Example:

### Capacity Warning

"Technology department is expected to exceed available capacity by approximately 42 hours during the next seven days."

### Reallocation Suggestion

"Employee A has 14 hours of work due before tomorrow evening. Two assignments totalling 4.5 hours can be transferred to Employee B."

### Client Behaviour

"Client XYZ has caused 17 workflow delays during the previous six months due to late document submission."

### Cost Alert

"Client ABC consumed 26 staff hours this month against an average monthly billing equivalent to 14 staff hours."

---

# 27. EMPLOYEE PERFORMANCE ANALYTICS

The purpose should be operational improvement, not merely surveillance.

Metrics may include:

| Metric | Purpose |
|---|---|
| Tasks Completed | Output |
| On-Time Completion % | Reliability |
| Average Completion Time | Efficiency |
| Estimated vs Actual | Planning |
| Review Rejection Rate | Quality |
| Rework Hours | Quality/Training |
| Utilisation | Capacity |
| Client Delays | Separate external delays |
| Manager Delays | Identify bottlenecks |

The system must distinguish between:

**Employee-caused delay**

and

**Client-caused delay**

and

**Reviewer-caused delay**

and

**Dependency-caused delay**.

Otherwise employee performance analytics will be misleading.

---

# 28. COSTING ENGINE

Each employee should have an internal hourly cost.

Example:

Salary + employer costs + allocated overhead

divided by

productive annual hours.

Illustratively:

Employee cost = ₹400/hour.

Task:

Employee work  
3.5 hours × ₹400 = ₹1,400

Reviewer  
0.5 hour × ₹1,000 = ₹500

AI/API cost  
₹30

Allocated overhead  
₹250

**Total Task Cost = ₹2,180**

---

# 29. CLIENT PROFITABILITY

If a client pays:

₹20,000/month

and actual service cost equals:

₹27,000/month

management should know this.

Profitability should ultimately be available by:

- client;
- client entity;
- service;
- department;
- engagement;
- month;
- employee;
- assignment.

---

# 30. NOTIFICATIONS

Notifications should be intelligent rather than excessive.

Examples:

### Employee

New task assigned.

Task due soon.

Reviewer returned task.

Client uploaded requested document.

### Reviewer

Task ready for review.

Review approaching SLA.

### Manager

Task overdue.

Employee overloaded.

Critical client request received.

### Client — Future

Documents required.

Task completed.

Deliverable ready.

---

# 31. INTERNAL TASK CREATION

Not every task originates from a client.

Employees/managers should be able to type:

"Prepare Sarna monthly digital marketing report by Friday and assign to Bhavya."

The AI should create the structured task.

Voice-based task creation can subsequently be supported.

---

# 32. RECURRING TASKS

The system should support recurring work.

Examples:

Monthly:

- GST;
- TDS;
- payroll;
- MIS;
- marketing report.

Quarterly:

- TDS returns;
- board reviews.

Annual:

- ITR;
- statutory audit;
- MCA annual filing.

The system should generate recurring tasks automatically based upon configured calendars.

---

# 33. DEADLINE ENGINE

Deadlines should be classified as:

### Statutory Deadline

Defined by law/regulation.

### Client Commitment

Promised completion date.

### Internal Deadline

Earlier target set internally.

Example:

Statutory deadline: 20 September  
Client commitment: 18 September  
Internal completion target: 17 September

This provides a safety margin.

---

# 34. ESCALATION ENGINE

Suggested escalation rules:

**T-24 Hours**

Employee alert.

**T-8 Hours**

Employee + reviewer.

**T-4 Hours**

Department head.

**Deadline at Risk**

Manager alert.

**Overdue**

Escalation based on severity.

These rules should remain configurable.

---

# 35. CLIENT DEPENDENCY MANAGEMENT

A major professional-services problem is waiting for information.

The system should allow:

**Mark Waiting for Client**

Employee records the requirement:

"Purchase register for August required."

The delay clock attributable to the employee stops.

Client dependency clock begins.

Automated reminders can subsequently be sent.

When the document arrives through WhatsApp, AI should identify the corresponding request and update the task.

---

# 36. AUDIT TRAIL

Every material action should be recorded.

Example:

10:32 — Client message received  
10:32 — AI classified request  
10:33 — Task generated  
10:33 — Assigned to Employee A  
10:35 — Employee opened task  
10:44 — Work commenced  
11:28 — Waiting for client information  
12:13 — Client uploaded document  
12:15 — Work resumed  
13:42 — Submitted for review  
14:06 — Reviewer opened  
14:28 — Approved  
14:33 — Final document sent  
14:33 — Task completed

This audit trail will become invaluable.

---

# 37. AI SHOULD NOT CONTROL EVERYTHING

A fundamental architectural principle:

## Deterministic software should control

- permissions;
- financial calculations;
- statuses;
- deadlines;
- task IDs;
- capacity;
- cost;
- audit logs;
- document ownership;
- user authentication;
- workflow transitions.

## AI should assist with

- understanding language;
- reading documents;
- classifying work;
- summarising communication;
- extracting deadlines;
- estimating complexity;
- suggesting allocation;
- searching organisational knowledge;
- drafting responses;
- highlighting anomalies.

The LLM should never itself become the system of record.

---

# 38. DATABASE — CORE ENTITIES

At minimum, the database should eventually contain entities such as:

| Entity | Purpose |
|---|---|
| Organisation | Company settings |
| Department | Team structure |
| User | Employee accounts |
| Role | Permissions |
| Employee Skill | Capability matrix |
| Client | Client/group |
| Client Entity | Legal entity |
| Contact | Client contact |
| Service | Service catalogue |
| Engagement | Client-service relationship |
| Task | Work item |
| Subtask | Detailed work |
| Checklist | Execution steps |
| Assignment | Employee allocation |
| Time Entry | Work time |
| Communication | WhatsApp/email etc. |
| Document | File metadata |
| Document Version | Version control |
| Review | Maker-checker |
| Comment | Internal communication |
| Dependency | Client/internal dependency |
| Deadline | Relevant deadlines |
| Cost | Task costing |
| Invoice | Future billing |
| Notification | Alerts |
| AI Event | AI processing |
| Audit Log | Complete activity history |

---

# 39. MINIMUM DATABASE RELATIONSHIP

Conceptually:

**Organisation**

→ Departments

→ Employees

**Client**

→ Client Entities

→ Engagements

→ Services

→ Tasks

→ Assignments

→ Employees

Task also connects to:

→ Communications  
→ Documents  
→ Time Entries  
→ Reviews  
→ Dependencies  
→ Costs  
→ Audit Logs

This data architecture is more important than the visual dashboard.

If the data architecture is poorly designed, later AI functionality will become difficult.

---

# 40. SCREEN-BY-SCREEN APPLICATION STRUCTURE

## Screen 1 — Login

Employee credentials.

Future:

- MFA;
- SSO.

---

## Screen 2 — Home Dashboard

Different by user role.

Employee:

**My Work**

Manager:

**Team Work**

Management:

**Organisation Command Centre**

---

## Screen 3 — My Tasks

Filters:

- today;
- overdue;
- this week;
- priority;
- client;
- service;
- status.

---

## Screen 4 — Task Detail

Complete task workspace.

---

## Screen 5 — Clients

Client directory.

---

## Screen 6 — Client Detail

Client profile.

Tabs:

Overview  
Entities  
Tasks  
Documents  
Communication  
Services  
Billing  
Analytics

---

## Screen 7 — Team Workload

Visual capacity board.

Example:

Employee A — 82%  
Employee B — 43%  
Employee C — 112%

---

## Screen 8 — Review Queue

All tasks awaiting reviewer action.

---

## Screen 9 — Communication Inbox

WhatsApp/email requests requiring AI/internal processing.

---

## Screen 10 — Documents

Organisation-wide document repository subject to access.

---

## Screen 11 — Reports & Analytics

Performance  
Cost  
Profitability  
Turnaround  
SLA  
Capacity

---

## Screen 12 — Administration

Departments  
Employees  
Roles  
Services  
Workflow  
Integrations  
Security

---

# 41. MVP — VERSION 1

The first production version should NOT attempt the entire product.

The MVP should contain:

### Organisation

Departments  
Employees  
Roles  
Permissions

### Clients

Client master  
Client entities  
Client contacts

### Services

Service master

### Tasks

Manual task creation  
Department  
Assignee  
Reviewer  
Due date  
Priority  
Estimated hours  
Status  
Checklist

### Employee Workspace

My Tasks  
Task detail  
Task updates  
Attachments  
Comments

### Time

Start/stop/manual time entry

### Review

Submit  
Approve  
Return for correction

### Documents

Upload  
Link to client/task  
Basic versioning

### Management

Open work  
Overdue work  
Department workload  
Employee workload  
Task turnaround

This should be built and stabilised before attempting sophisticated AI automation.

---

# 42. VERSION 2 — AI INTAKE

Introduce:

Official WhatsApp integration.

AI message interpretation.

Attachment ingestion.

Client identification.

Service classification.

Deadline extraction.

AI-generated tasks.

Confidence score.

Internal confirmation queue.

---

# 43. VERSION 3 — INTELLIGENT ALLOCATION

Introduce:

Skills matrix.

Capacity engine.

Estimated workload.

Automatic assignment.

Reallocation recommendations.

Leave/availability consideration.

Explainable allocation score.

---

# 44. VERSION 4 — AUTOMATED CLIENT WORKFLOW

Introduce:

Automatic client reminders.

Document request tracking.

Status notifications.

Delivery through authorised communication channels.

Client portal.

---

# 45. VERSION 5 — COST & PROFITABILITY

Introduce:

Employee cost rates.

Task costing.

Service costing.

Client profitability.

Department profitability.

Revenue integration.

---

# 46. VERSION 6 — AI MANAGEMENT LAYER

Introduce conversational management intelligence.

Examples:

"Who is overloaded today?"

"Which GST filings are likely to be delayed?"

"Which employees have capacity tomorrow?"

"Which clients consumed the highest staff cost this month?"

"Why did ABC's work get delayed?"

"Which assignments should I redistribute?"

The AI answers using actual operational data.

---

# 47. FUTURE — EXECUTION AGENTS

Eventually selected task categories can automatically invoke specialised AI agents.

Example:

**GST Reconciliation Task**

↓

GST reconciliation agent processes files.

↓

Produces exceptions.

↓

Employee reviews exceptions.

↓

Reviewer approves.

The employee therefore moves from performing every repetitive activity to supervising machine-assisted work.

Similar agents can later handle:

- reconciliations;
- document extraction;
- compliance checklists;
- data validation;
- report preparation;
- research;
- marketing analytics;
- standard communication.

---

# 48. MVP SUCCESS CRITERIA

The first release should be considered successful if management can reliably answer:

1. What work is currently pending?
2. Who is responsible?
3. When is it due?
4. How much work does each employee already have?
5. Which assignments are delayed?
6. Why are they delayed?
7. Which work is awaiting review?
8. How much time was spent?
9. Where are the relevant files?
10. What happened during the entire life of the task?

If the system cannot answer these ten questions reliably, additional AI functionality should not be prioritised.

---

# 49. NON-NEGOTIABLE PRODUCT PRINCIPLES

### 1. One source of truth

The platform database must be authoritative for work status.

### 2. Exception-based management

Management should primarily see matters requiring attention rather than operational noise.

### 3. Explainable automation

AI assignment decisions must be understandable.

### 4. Human override

Authorised users can override AI decisions.

### 5. Complete audit trail

No material action should disappear.

### 6. Role-based security

Employees should only see data they are authorised to access.

### 7. AI is an assistant, not the system of record

Core business rules remain deterministic.

### 8. Build incrementally

Do not attempt AI agents before the operational foundation works.

### 9. Mobile-friendly

Task updates and approvals should work properly on mobile.

### 10. Avoid excessive data entry

Information already available through communication or system data should not need to be manually entered again.

---

# 50. SUGGESTED FIRST DEVELOPMENT SPRINT

The first development exercise should focus on the skeleton.

### Organisation Setup

Create departments.

Create employees.

Create roles.

Define reporting relationships.

### Client Setup

Create client.

Create entities.

Create contacts.

### Service Setup

Create configurable services.

### Task Engine

Create task.

Assign employee.

Assign reviewer.

Set dates.

Set priority.

Track status.

Attach documents.

### Dashboards

Employee My Tasks.

Manager Team Tasks.

Management All Tasks.

### Audit Trail

Record every action.

At this point management should be able to run the organisation manually through the new platform even without AI.

Only after this works reliably should the WhatsApp-AI automation layer be connected.

---

# 51. PRODUCT NORTH STAR

The final product experience should eventually become:

**Client communicates normally.**

The organisation does not need somebody to manually interpret every message.

The system understands the requirement.

It retrieves the relevant client context.

It identifies the work required.

It knows who is qualified.

It understands who has capacity.

It understands the required deadline.

It allocates the work.

The employee receives the complete context.

The employee or AI performs the task.

The reviewer controls the output.

The client receives the result.

The documents are archived.

The employee's workload updates.

The task cost updates.

The client's profitability updates.

The management dashboard updates.

The organisational knowledge base becomes richer.

That complete closed loop is the real product.

---

# 52. INTERNAL WORKING NAME FOR THE ARCHITECTURE

For development purposes, the platform can be thought of as consisting of six engines:

**1. Intake Engine**  
Captures and understands work.

**2. Workflow Engine**  
Creates, tracks and controls tasks.

**3. Allocation Engine**  
Decides who should perform the work.

**4. Knowledge Engine**  
Preserves communication, files and historical context.

**5. Intelligence Engine**  
Analyses capacity, performance, risk and profitability.

**6. Agent Engine**  
Eventually helps perform selected work itself.

Together these create the organisation's:

# AI OPERATIONS OS