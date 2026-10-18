# Productivity App

> **Project status:** Active MVP implementation.  
> **Last status review:** 18 October 2026.

An all-in-one personal productivity workspace for managing tasks, projects, calendar activity, notes, and connected goals across personal areas of life and work. The app uses a modern SaaS interface, supports light and dark themes, and is being built for desktop and mobile.

## Contents

- [Current implementation status](#current-implementation-status)
- [Product vision and principles](#product-vision-and-principles)
- [MVP scope](#mvp-scope)
- [Deferred scope](#deferred-scope)
- [Technology stack](#technology-stack)
- [Experience and navigation](#experience-and-navigation)
- [Feature requirements and current behavior](#feature-requirements-and-current-behavior)
- [Data relationships and calculation rules](#data-relationships-and-calculation-rules)
- [Accounts, authentication, and permissions](#accounts-authentication-and-permissions)
- [Deletion and recovery](#deletion-and-recovery)
- [Development setup](#development-setup)
- [Known gaps and next work](#known-gaps-and-next-work)
- [Design trade-offs](#design-trade-offs)

## Current implementation status

This section describes the state reached so far. A feature being implemented does not necessarily mean every planned sub-feature or edge case is complete.

| Area | Status | Confirmed implementation |
|---|---|---|
| Repository and application scaffold | Implemented | Next.js frontend and Express backend in separate `frontend/` and `backend/` directories |
| Authentication | Implemented | Signup, login, logout, HTTP-only session authentication, and session persistence through `/me` |
| Workspace shell | Implemented | Shared workspace layout, sidebar navigation, space selector, quick-add entry point, and logout control |
| Spaces | Implemented | Space creation and space-scoped data isolation are part of the current app |
| Tasks | Implemented | Task management and Trash lifecycle are already built; do not treat the Tasks page as unstarted |
| Projects | Implemented | Project listing/management APIs and frontend Projects view; backend project progress calculation is implemented and tested |
| Calendar | Implemented, initial view | Monthly calendar navigation and task dates/deadlines by date are present. Separate event records and time-blocking are not yet confirmed complete |
| Goals | Implemented | Create/edit goals, show progress and linked-project information, and move goals to Trash |
| Trash | Implemented | Deleted tasks and goals can be viewed; goal restoration and permanent deletion are implemented. Task Trash lifecycle is also present |
| Notes | Not yet confirmed | Planned feature; no completed implementation was established in the latest review |
| Basic analytics | Not yet confirmed | Planned feature; implementation status still needs review |
| Customizable dashboard widgets | Not yet confirmed | The current landing experience is My Day; a customizable dashboard/overview is not currently part of the active MVP path |
| Habits and personal finance | Deferred | Explicitly outside the initial MVP |

### Validation completed recently

- Backend TypeScript check (`npx tsc --noEmit`) passed after goal Trash work.
- Frontend TypeScript check (`npx tsc --noEmit`) passed after goal Trash work.
- `git diff --check` passed before the goal-management commit.
- Goal management and Trash changes were committed and pushed to GitHub.

These checks are not a substitute for end-to-end tests or verification of every edge case.

## Product vision and principles

Build a modern SaaS-style productivity workspace that helps users capture work quickly, organize it into spaces and projects, plan tasks on a calendar, document context in linked notes, and track progress through connected goals.

- **One canonical item:** Avoid duplicate records when items are linked or visible in multiple contexts.
- **Multiple ways to plan:** Keep task data consistent across List, Kanban, Calendar, and My Day views.
- **Capture first, organize later:** Keep global quick capture accessible.
- **Explainable progress:** Use deterministic project and goal calculations and avoid double-counting.
- **Desktop and mobile equally matter:** Responsive behavior is part of the product, not a later retrofit.
- **Online-first:** Offline editing and synchronization are not MVP requirements.

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

The implementation status table above distinguishes work already present from planned but unconfirmed features.

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

Search and filtering are contextual to each section for the MVP; a single global search is deferred.

## Technology stack

| Layer | Decision / implementation |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Database | MongoDB |
| Authentication | Email/password with HTTP-only session cookies; Google sign-in is part of the intended product scope, but completion should be verified separately |
| API client | Shared frontend helper in `frontend/src/lib/api.ts`, using credentials for session requests |
| Connectivity model | Online-first |

## Experience and navigation

- **Desktop:** Sidebar-based navigation.
- **Mobile:** Intended bottom navigation for core destinations and a drawer for secondary destinations; responsive behavior should continue to be checked as pages are added.
- **Themes:** Light and dark modes are part of the design direction; verify coverage and persistence across all pages during polish.
- **Navigation:** Core destinations with switchable spaces.
- **Current main destinations:** My Day, Calendar, Projects, Goals, and Trash, plus Settings.
- **Global quick add:** Entry point in the workspace shell. Its supported item types and complete flows should be verified against the final requirement.

## Feature requirements and current behavior

### Tasks

The task system is already implemented; this is a specification checklist, not a claim that every item below has been individually re-tested in this status review.

Planned task capabilities:

- Priorities, subtasks, tags, due dates, recurring tasks, filters, and statuses
- List, Kanban, Calendar, and My Day views
- Quick task details in a panel and a full page for complex details
- Optional scheduled start/end times for calendar time-blocking
- A dedicated Overdue section and grouping of recurring overdue tasks to reduce clutter

Standard statuses:

- `To do`
- `In progress`
- `Done`
- `Cancelled` (optional status)

Cancelled tasks are excluded from goal progress and completion statistics, and should be hidden from MVP analytics.

Recurring-task rule: create a new occurrence on its scheduled date. Previous incomplete occurrences remain open and are not silently overwritten or moved forward.

### Projects

Projects are organized by space. The intended project workspace contains:

- Overview
- Task views
- Milestones
- Notes

Project management APIs and the Projects view are implemented. Project progress is calculated from eligible, non-cancelled tasks, with each eligible task contributing equally. Milestones are tracked separately and do not contribute a second time to the project percentage.

Open verification items include milestone CRUD/UI, linked notes inside project pages, and the behavior for projects with no eligible tasks.

### Calendar

The current Calendar page includes a monthly grid, month navigation, a Today action, and task dates/deadlines shown by date. The full planned calendar scope is broader:

- Tasks and their due dates
- Tasks with optional scheduled start and end times
- Separate event records, visually distinct from tasks

Separate event creation/editing, time-blocking interactions, time-zone handling, and overlapping-block rules remain unconfirmed and should be treated as future work until verified.

### Notes

Planned: a plain editor (not a block-based editor) supporting titles, formatted text, links, and connections to tasks, projects, and goals. Notes implementation is not yet confirmed in the current app status.

### Goals

Implemented goal UI and backend behavior includes:

- Create and edit goals
- Display goal status, target date, progress, and linked-project information
- Move a goal to Trash
- Restore a deleted goal
- Permanently delete a goal from Trash
- Backend goal progress support, including project-aware progress rules

Goal model decisions:

- Goals may contain child goals.
- Progress is automatic and project-aware.
- Parent goals incorporate child-goal progress without double-counting underlying work.
- Standalone linked tasks contribute separately from tasks already represented by linked-project progress.
- Cancelled tasks do not contribute to goal progress.

### Analytics

Planned MVP analytics focus on task completion and overdue tasks. Cancelled tasks are excluded from MVP analytics. Habit analytics are deferred until habit tracking exists. The analytics page is not yet confirmed as implemented.

### Spaces and shared items

- Multiple user accounts are supported from the start.
- Spaces are private to their owner in the MVP.
- Collaboration and shared spaces are deferred.
- The design decision for shared items specifies per-item edit permissions.
- The backend must enforce authorization; hiding controls in the frontend is not sufficient.

The exact permission matrix for view, edit, move, delete, restore, and permanent delete should be reviewed as features expand.

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

## Accounts, authentication, and permissions

### Accounts and sign-in

The intended product supports multiple user accounts, private spaces, email/password authentication, and Google sign-in. Email/password signup/login/logout and HTTP-only session persistence have been implemented and tested. Google sign-in completion should be verified separately before describing it as shipped.

### Authorization

Permissions must be checked by the backend for each relevant read or mutation. The implementation should define who can view, edit, move, delete, restore, and permanently delete an item, including when it is visible outside its home space.

## Deletion and recovery

Trash is recoverable, with two explicit actions:

- Restore an item
- Permanently delete an item

Task Trash support is implemented. Goal Trash support is implemented, including restore and a dedicated permanent-delete endpoint. Permanent deletion must remain separate from ordinary soft deletion.

Still to verify across the whole app: retention policy and restoration behavior when related spaces, projects, parent goals, or linked records have changed or been deleted. The current behavior for nested deleted goals should be reviewed for deeper descendants.

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

The frontend API helper defaults to `http://localhost:4000/api` unless `NEXT_PUBLIC_API_URL` is set. Configure the backend environment variables locally, including the MongoDB connection and session secret. Do not commit secrets or `.env` files.

TypeScript check (run separately in each directory):

```bash
npx tsc --noEmit
```

## Known gaps and next work

The next implementation work should be chosen from the features that are still planned or only partially confirmed—not from tasks, projects, goals, or Trash as if they were unstarted.

1. **Notes:** implement linked notes and their plain editor.
2. **Calendar completeness:** add and verify separate event records and optional task time-blocking if not already implemented.
3. **Projects completeness:** review milestone management, project notes, and empty-project progress behavior.
4. **Analytics:** implement basic task completion and overdue statistics.
5. **Polish and verification:** responsive mobile navigation, theme consistency, global quick-add coverage, authorization, and end-to-end tests.

Before taking any item off this list, verify it in the actual code and running application.

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
