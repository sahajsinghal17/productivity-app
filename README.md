# Productivity App

> **Project status:** Active MVP implementation
> **Implementation audit updated:** 21 October 2026

An all-in-one personal productivity workspace for managing tasks, projects, calendar activity, notes, and connected goals across personal areas of life and work. The app uses a modern SaaS interface and is designed for desktop and mobile, with light and dark themes.

This README records both the intended product requirements and the implementation status confirmed during the latest code review. **“Not found” means the feature was not found in the reviewed frontend files; it is not proof that no backend support exists.** Backend-dependent behavior and end-to-end flows are marked for verification rather than assumed complete.

## Contents

- [Current implementation status](#current-implementation-status)
- [Product vision and principles](#product-vision-and-principles)
- [MVP scope](#mvp-scope)
- [Deferred scope](#deferred-scope)
- [Technology stack](#technology-stack)
- [Experience and navigation](#experience-and-navigation)
- [Feature requirements and current behavior](#feature-requirements-and-current-behavior)
- [Resource Library](#resource-library)
- [Data relationships and calculation rules](#data-relationships-and-calculation-rules)
- [Accounts, authentication, and permissions](#accounts-authentication-and-permissions)
- [Deletion and recovery](#deletion-and-recovery)
- [Development setup](#development-setup)
- [Known gaps and next work](#known-gaps-and-next-work)
- [Design trade-offs](#design-trade-offs)

## Current implementation status

A feature may be implemented in part without every planned interaction, edge case, or related page being complete.

| Area | Status | Confirmed implementation / outstanding work |
|---|---|---|
| Repository and application scaffold | Implemented | Next.js frontend and Express backend in separate `frontend/` and `backend/` directories |
| Email/password authentication | Implemented | Signup, login, logout, HTTP-only session authentication, and session persistence through `/auth/me` |
| Google sign-in | Needs verification | Part of intended scope; not confirmed in the reviewed files |
| Workspace shell | Partial | Desktop sidebar, mobile drawer, space selector, user display, logout, and Quick Add entry point |
| Mobile bottom navigation | Not implemented in reviewed UI | README design calls for bottom navigation on mobile plus a drawer |
| Spaces | Implemented in UI; authorization needs verification | Space creation and switching are present; verify backend isolation for every resource and mutation |
| Tasks | Partial against full specification | My Day list, priority display, descriptions, completion/reopening, delete-to-Trash integration, and resource attachments |
| Task subtasks, tags, recurrence, Kanban, overdue grouping | Not found in reviewed frontend | Still required by the task specification unless deliberately descoped |
| Task details panel / full details page | Not found in reviewed frontend | Task title does not open a details panel/page in the reviewed list component |
| Projects | Partial against full specification | Project list, create/edit, status/search, dates, delete-to-Trash, attachments; project workspace, milestones, and project notes not found in reviewed page |
| Project progress | Backend implemented; frontend display needs work | Backend calculation was previously tested; project list page does not show a progress indicator |
| Calendar | Partial | Monthly grid, navigation, day selection, task due dates and scheduled-start display; separate events and time-blocking interactions not found |
| Goals | Partial against full specification | Create/edit, status/search/date controls, parent selection, progress display, project-link information, and Trash integration; task linking and project-link editing not exposed in reviewed form |
| Resource Library | Implemented for core flows | Upload/download, rename, list, Trash/restore/permanent delete, and task/project attachments |
| Notes | Not implemented in reviewed frontend | No notes page/editor or linked-note UI found |
| Basic analytics | Not implemented in reviewed frontend | No analytics page or analytics component found |
| Trash | Partial | Task, goal, and resource restore/permanent-delete controls; Empty Trash currently handles tasks only in the reviewed page |
| Customizable dashboard widgets | Not implemented in reviewed dashboard | My Day currently renders a task-focused page |
| Theme switching and persistence | Needs verification | Theme-aware styling exists, but a working user-facing toggle and persistence were not confirmed |
| Search | Partial / not functional in shell | Contextual search is the MVP target; the reviewed shell search control is decorative/inert |
| Settings | Not implemented in reviewed shell | Settings control has no confirmed action |
| TypeScript checks and end-to-end validation | Needs fresh verification | Prior checks passed at earlier milestones; rerun after current changes and add broader integration tests |

### Recent validation history

- Backend TypeScript checks passed at earlier implementation milestones.
- Frontend TypeScript checks passed at earlier implementation milestones.
- Authentication flows were tested: signup, login, session check, and logout.
- Task/project/resource workflows were manually tested at earlier milestones, including resource upload, download, rename, Trash/restore, and attachments.
- Project progress calculation was previously tested when tasks changed status.

These are historical checks, not a claim that every current branch or edge case has been tested. Re-run checks before release.

## Product vision and principles

Build a modern SaaS-style productivity workspace that helps users capture work quickly, organize it into spaces and projects, plan tasks on a calendar, document context in linked notes, and track progress through connected goals.

- **One canonical item:** Avoid duplicate records when items are linked or visible in multiple contexts.
- **Multiple ways to plan:** Keep task data consistent across List, Kanban, Calendar, and My Day views.
- **Capture first, organize later:** Keep global Quick Add accessible.
- **Explainable progress:** Use deterministic project and goal calculations and avoid double-counting.
- **Desktop and mobile equally matter:** Responsive behavior is part of the product, not a later retrofit.
- **Online-first:** Offline editing and synchronization are not MVP requirements.
- **Backend-enforced security:** Frontend visibility is not a substitute for authorization checks.

## MVP scope

The agreed MVP scope is:

1. Task management
2. Projects and milestones
3. Calendar, including separate event records and optional task time-blocking
4. Linked notes
5. Hierarchical, connected goals
6. Basic analytics
7. Multiple user accounts with private spaces
8. Email/password and Google sign-in
9. Recoverable Trash

The Resource Library and resource attachments have also been implemented as supporting functionality. Statuses in this README distinguish confirmed work from requirements that remain incomplete or need verification.

## Deferred scope

These are intentionally outside the initial MVP:

- Habit tracking and habit-streak analytics
- Personal finance
- Shared spaces and team collaboration
- Unified global search across every section
- Offline editing and synchronization
- Advanced task dependencies, estimates, custom fields, and richer task metadata
- Advanced or custom analytics and reporting
- Block-based notes editing

Search and filtering should be contextual to each section for the MVP; a single global search is deferred. **Basic contextual search is still a requirement where specified** and should not be considered complete merely because global search is deferred.

## Technology stack

| Layer | Decision / implementation |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB |
| File storage | Cloudflare R2 for resource file bytes; MongoDB stores resource metadata and attachment relationships |
| Authentication | Email/password with HTTP-only session cookies; Google sign-in completion needs verification |
| API client | Shared frontend helper in `frontend/src/lib/api.ts`, using credentials for session requests |
| Connectivity model | Online-first |

## Experience and navigation

- **Desktop:** Sidebar-based navigation.
- **Mobile:** Intended bottom navigation for core destinations and a drawer for secondary destinations. The reviewed shell currently has a mobile drawer, but bottom navigation was not found.
- **Themes:** Light and dark modes are part of the design direction. Verify a user-facing toggle, persistence, and coverage across all pages.
- **Navigation:** Core destinations with switchable spaces.
- **Current main destinations:** My Day, Calendar, Projects, Resources, Goals, and Trash.
- **Quick Add:** Available from the workspace shell, but the reviewed flow creates tasks only. The full requirement is to capture supported item types without forcing the user to navigate to each section.
- **Search:** Contextual search is the MVP target. The search control in the reviewed shell is not functional yet.
- **Dashboard:** My Day currently focuses on tasks. Customizable dashboard widgets are not implemented in the reviewed page.

## Feature requirements and current behavior

### Tasks

The task system has working foundations, but the full task specification is not yet complete.

| Requirement | Current audit status | Notes |
|---|---|---|
| Task list | Implemented | `TaskList` renders tasks in a vertical list |
| My Day | Implemented, basic | Dashboard loads top-level tasks for the active space; custom My Day selection/filter rules were not found |
| Priorities | Implemented | Low, medium, high, urgent are represented and displayed |
| Descriptions | Implemented | Description is displayed when present |
| Complete/reopen | Implemented, limited | Current hook toggles between `todo` and `done`; other status transitions need UI support |
| In-progress/cancelled display | Partial | Labels render, but the reviewed list does not offer controls to set these statuses |
| Due dates | Partial | Present in task type and Calendar UI; task-list editing/display is not confirmed |
| Scheduled start/end | Partial | Present in task type and used by Calendar display; editing/time-blocking interactions are not confirmed |
| Kanban view | Not found | Required by the intended task views |
| Subtasks | Not exposed in reviewed frontend | Hook queries top-level tasks with `parentTaskId=null`, but the frontend task type/list has no subtask controls |
| Tags | Not found | No tag fields or UI found in reviewed frontend |
| Recurring tasks | Not found | Required recurrence behavior is described below |
| Filters | Partial / needs verification | Some project/goal status filters exist; comprehensive task filters were not found |
| Overdue section and recurring-overdue grouping | Not found | Required to reduce clutter from overdue recurring tasks |
| Quick details panel / full details page | Not found | No task detail interaction in the reviewed list |
| Delete to Trash | Integrated | List calls the page's delete handler; Trash supports task recovery |
| Resource attachments | Implemented | Tasks can display and manage attached Resource Library items |

Standard task statuses:

- `todo` — To do
- `in_progress` — In progress
- `done` — Done
- `cancelled` — Cancelled (optional status)

Cancelled tasks must be excluded from goal progress and completion statistics and hidden from MVP analytics. The My Day summary excludes cancelled tasks from its denominator, although the reviewed list still receives and may display cancelled tasks.

**Recurring-task rule:** create a new occurrence on its scheduled date. Previous incomplete occurrences remain open and are not silently overwritten or moved forward.

### Projects

Projects are organized by space. The intended project workspace contains:

- Overview
- Task views
- Milestones
- Notes

**Confirmed:** project listing, creation/editing, status selection, name/description search, start/due dates, delete-to-Trash, and resource attachments are present in the reviewed frontend. Project APIs and backend progress calculation are implemented; the calculation was previously tested.

**Partial or not found in the reviewed Projects page:**

- A dedicated project workspace/overview
- Project task views
- Milestone management UI
- Notes linked within projects
- Display of calculated project progress
- Defined UI behavior for projects with no eligible tasks

Project progress is calculated from eligible, non-cancelled tasks, with each eligible task contributing equally. Milestones are tracked separately and do not contribute a second time to the task-based percentage.

### Calendar

The current Calendar page includes a monthly grid, month navigation, a Today action, day selection, and task dates/deadlines shown by date.

| Requirement | Current audit status |
|---|---|
| Monthly grid and navigation | Implemented |
| Tasks grouped by due date | Implemented |
| Scheduled-start dates shown | Implemented |
| Display scheduled start/end time labels | Partial |
| Create/edit separate event records | Not found |
| Visually distinguish events from tasks | Not found |
| Edit scheduled start/end from calendar | Not found |
| Interactive time-blocking | Not found |
| Overlap rules and time-zone consistency | Needs verification |

Calendar requirements:

- Show tasks and their due dates.
- Support optional scheduled start/end times for tasks.
- Store calendar events as separate records; an event is not a task.
- Keep deadline-only tasks valid without requiring a time block.

Time-zone behavior, event CRUD, time-blocking interactions, and overlapping-block rules remain open.

### Notes

No dedicated Notes page/editor was found in the reviewed frontend.

Planned MVP behavior:

- Plain editor, not a block-based editor
- Titles, formatted text, and links
- Connections to tasks, projects, and goals
- Notes visible from relevant project/task/goal contexts where applicable

### Goals

The reviewed Goals page supports creating and editing goals, status filtering, search, dates, color, parent-goal selection, progress display, project-link information, and Trash integration.

| Requirement | Current audit status | Notes |
|---|---|---|
| Goal CRUD and status | Implemented | Create/edit and status controls are present |
| Parent/child relationship | Implemented in UI | Parent selection exists; backend depth/cycle validation needs verification |
| Progress display | Implemented | Page requests calculated progress for each goal |
| Link projects | Partial | Linked-project information is displayed, but editing project links is not exposed in the reviewed form |
| Link standalone tasks | Not found | No task-linking control found |
| Parent progress without double-counting | Needs verification | The intended rule is documented; test mixed parent/child/project/task combinations |
| Nested hierarchy visualization | Partial | Parent can be selected and shown, but the page uses a flat grid rather than a nested tree |
| Trash/restore/permanent delete | Implemented | Goal lifecycle controls are integrated |

Goal model decisions:

- Goals may contain child goals.
- Progress is automatic and project-aware.
- Parent goals incorporate child-goal progress without double-counting underlying work.
- Standalone linked tasks contribute separately from tasks already represented by linked-project progress.
- Cancelled tasks do not contribute to goal progress.

### Analytics

The planned MVP analytics focus on task completion and overdue tasks. Cancelled tasks are excluded from MVP analytics. Habit analytics are deferred until habit tracking exists.

No dedicated analytics page or analytics component was found in the reviewed frontend. Basic analytics remain unimplemented in the reviewed UI.

### Spaces and shared items

- Multiple user accounts are supported from the start.
- Spaces are private to their owner in the MVP.
- Collaboration and shared spaces are deferred.
- The design decision for shared items specifies per-item edit permissions.
- The backend must enforce authorization; hiding controls in the frontend is not sufficient.

The exact permission matrix for view, edit, move, delete, restore, and permanent delete should be reviewed as features expand. Verify owner checks and space isolation for every resource type and mutation.

## Resource Library

The Resource Library is implemented as a supporting feature.

- Cloudflare R2 stores file bytes; MongoDB stores resource metadata and attachment relationships.
- The bucket is private; downloads use short-lived signed URLs rather than permanent public URLs.
- The intended maximum upload size is 20 MiB.
- Upload flow: create an upload intent, upload directly to R2 with a signed URL, then complete the upload so the backend can verify the object and mark the resource available.
- Core flows tested previously include upload, list, download, rename, Trash, restore, and permanent deletion.
- Resources can be attached to tasks and projects. A single resource can be attached to multiple targets without duplicating the stored bytes.
- Detaching removes only the relationship; it does not delete the resource.
- Same-name uploads create separate resources.
- Resource Trash preserves attachment relationships; restoring should recover the resource's normal availability.
- The planned retention rule makes resources in Trash eligible for permanent cleanup after 30 days.

**Security and lifecycle verification still required:** validate file type and content safely, verify authorization for cross-space attachments, handle expired/failed pending uploads, confirm the 30-day cleanup job, and test retry-safe permanent deletion across R2 and MongoDB. Preview support for PDF, images, and text/code files is future work unless separately implemented.

## Data relationships and calculation rules

### Avoid double-counting

A task already represented by a linked project's progress must not also count as an independent task contribution to the same goal. Standalone linked tasks contribute separately. Parent goals must not count work already represented by child goals a second time.

### Project progress

Project progress is the completion percentage of eligible, non-cancelled tasks, with each eligible task weighted equally. Milestones have their own progress signal and do not add to the task-based percentage.

### Cancelled tasks

Cancelled tasks are excluded from goal progress and completion statistics and should not appear in MVP analytics.

### Recurring occurrences

Create each occurrence on schedule. Keep previous incomplete occurrences open so history and overdue work remain visible.

### Items to verify

- Goal aggregation when a parent has child goals alongside directly linked projects and tasks
- Displayed progress for a project with no eligible tasks
- Behavior of links when tasks or projects are moved or unlinked
- Whether archived/ineligible records exist and how they affect calculations
- Recurrence creation timing, duplicate prevention, and handling of missed schedules
- Resource retention cleanup and partial failures during permanent deletion

## Accounts, authentication, and permissions

### Accounts and sign-in

The intended product supports multiple user accounts, private spaces, email/password authentication, and Google sign-in. Email/password signup/login/logout and HTTP-only session persistence have been implemented and tested. Google sign-in completion should be verified separately before describing it as shipped.

### Authorization

Permissions must be checked by the backend for each relevant read or mutation. The implementation should define who can view, edit, move, delete, restore, and permanently delete an item, including when it is visible outside its home space.

## Deletion and recovery

Trash is recoverable, with two explicit actions:

- Restore an item
- Permanently delete an item

Task and goal Trash support is implemented. Resource Trash support is also implemented, including restore and permanent-delete controls.

**Known limitation in the reviewed Trash page:** Empty Trash loops over tasks only; it does not empty goals or resources. Individual permanent deletion is available for the displayed item types. The 30-day resource cleanup policy, behavior for nested deleted goals, and restoration when related spaces/projects/parent goals have changed still need verification.

## Development setup

The repository uses separate frontend and backend applications:

```text
productivity-app/
├── frontend/
└── backend/
```

Install dependencies in each directory if needed, then run the development server for each application in its own terminal.

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Backend:

```bash
cd backend
npm install
npm run dev
```

The frontend API helper defaults to `http://localhost:4000/api` unless `NEXT_PUBLIC_API_URL` is set. Configure backend environment variables locally, including the MongoDB connection, session secret, and Cloudflare R2 credentials. Do not commit secrets or `.env` files.

TypeScript check (run separately in each directory):

```bash
npx tsc --noEmit
```

## Known gaps and next work

Prioritize the remaining MVP requirements and verify uncertain backend behavior before marking items complete.

1. **Task completeness:** subtasks, tags, recurrence, Kanban, task filters, overdue grouping, and task details panel/full page.
2. **Calendar completeness:** separate event records and CRUD, distinguish events from tasks, and implement/verify optional time-blocking.
3. **Projects completeness:** project workspace, task views, milestone management, project notes, and visible progress.
4. **Notes:** linked notes with the plain editor.
5. **Goals:** edit project links, link standalone tasks, and verify deterministic parent progress without double-counting.
6. **Analytics:** basic task-completion and overdue statistics.
7. **Workspace polish:** mobile bottom navigation, functional contextual search, Settings behavior, theme toggle/persistence, and broader Quick Add support.
8. **Trash and resource lifecycle:** Empty Trash for every supported type, verify retention cleanup, and test related-record recovery.
9. **Security and quality:** verify per-user/per-space authorization, upload validation, and cross-space attachment rules; rerun typechecks and add end-to-end tests.

Before taking any item off this list, verify it in the actual code and running application. This audit is based on the reviewed files and previously reported manual tests, not a complete repository-wide test run.

## Design trade-offs

| Decision | Benefit | Trade-off to manage |
|---|---|---|
| Multiple task views | Supports different planning styles | Views must remain consistent over the same task data |
| Panel and full-page task details | Fast routine edits plus room for complex work | Requires a clear transition between detail modes |
| Projects organized by space | Keeps contexts organized | Cross-space visibility and permissions need careful rules |
| Hybrid project workspace | Gives projects meaningful context | Milestones and linked notes add implementation scope |
| Combined calendar | One planning surface for tasks and events | Types must remain distinct and avoid clutter |
| Optional time-blocking | Supports deadline-first and schedule-first workflows | Requires validation for scheduled times and time zones |
| Mobile bottom navigation plus drawer | Keeps common destinations accessible | Information architecture must avoid duplicate or hidden navigation |
| Global quick capture | Reduces friction when recording work | Capture must stay minimal and support later organization |
| Automatic goal progress | Reduces manual upkeep | Aggregation and double-counting rules must be deterministic |
| Equal-weight project tasks | Simple and explainable progress | Small and large tasks count equally |
| Multiple sign-in methods | Offers choice and lowers sign-up friction | Account linking and recovery need safe handling |
| Recoverable Trash | Protects against accidental deletion | Adds retention and restoration lifecycle rules |
| Contextual search | Keeps results relevant and simpler to implement | No single global search in the MVP |
| Online-first behavior | Avoids offline sync complexity | Normal use depends on network access |
| Deferred habits and finance | Keeps the MVP focused | Those workflows arrive later |

---

**Maintenance note:** Update the implementation status table whenever a feature is completed or its scope changes. Keep confirmed product decisions aligned with the Productivity App MVP Design Decision Log.
