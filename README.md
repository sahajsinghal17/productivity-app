# Productivity App

> **Status:** MVP design specification — awaiting explicit design-freeze and implementation approval.  
> **Implementation status:** Not started. This README documents the agreed product direction; it does not authorize coding by itself.

An all-in-one personal productivity workspace for organizing tasks, projects, calendar activity, notes, and goals across personal areas of life and work. The MVP prioritizes a consistent desktop and mobile experience, linked data, and clear progress tracking without expanding into habits, personal finance, or team collaboration yet.

## Contents

- [Product vision](#product-vision)
- [MVP scope](#mvp-scope)
- [Deferred scope](#deferred-scope)
- [Technology stack](#technology-stack)
- [Experience and navigation](#experience-and-navigation)
- [Core feature requirements](#core-feature-requirements)
- [Data relationships and calculation rules](#data-relationships-and-calculation-rules)
- [Accounts, authentication, and permissions](#accounts-authentication-and-permissions)
- [Deletion and recovery](#deletion-and-recovery)
- [Non-functional requirements](#non-functional-requirements)
- [Implementation details to specify](#implementation-details-to-specify)
- [Design trade-offs](#design-trade-offs)
- [Decision governance](#decision-governance)

## Product vision

Build a modern SaaS-style productivity workspace that helps a user capture work quickly, organize it into spaces and projects, plan it on a calendar, document context in linked notes, and track progress through connected goals.

### Product principles

- **One canonical item:** Items shared across spaces should not be duplicated.
- **Multiple ways to plan:** Support list, board, calendar, and daily views over consistent underlying task data.
- **Capture first, organize later:** Provide a global quick-capture entry point.
- **Progress should be explainable:** Goal and project calculations must follow deterministic rules and avoid double-counting.
- **Desktop and mobile matter equally:** Responsive behavior is part of the initial design, not a later retrofit.
- **Online-first:** Offline editing and synchronization are not MVP requirements.

The product name, branding, exact palette, and typography have not been chosen.

## MVP scope

The initial MVP includes:

1. Task management
2. Projects and milestones
3. Calendar with separate event records and optional task time-blocking
4. Linked notes
5. Hierarchical, connected goals
6. Basic analytics
7. Multiple user accounts with private spaces
8. Email/password and Google sign-in
9. Recoverable Trash

### Deferred features

These are intentionally outside the initial MVP:

- Habit tracking and habit streak analytics
- Personal finance
- Shared spaces and team collaboration
- Unified global search across every section
- Offline editing and synchronization
- Advanced task dependencies, estimates, custom fields, and richer task metadata
- Advanced or custom analytics and reporting
- Block-based notes editing

Features may be reconsidered after the MVP, but should not be assumed to be included in the first release.

## Technology stack

| Layer | Decision |
|---|---|
| Frontend | Next.js (React-based) |
| Backend | Node.js with Express.js |
| Database | MongoDB |
| Authentication | Email/password and Google sign-in |
| Connectivity model | Online-first |

Specific libraries, hosting provider, deployment pipeline, testing tools, and environment-management approach remain to be selected during implementation planning.

## Experience and navigation

### Responsive shell

- **Desktop:** Sidebar-based navigation.
- **Mobile:** Bottom navigation for core destinations and a drawer for secondary destinations.
- **Themes:** Light and dark modes.
- **Dashboard:** Information-rich, with customizable widgets.
- **Navigation:** Core destinations plus switchable spaces.

The exact navigation items, dashboard widget catalog, customization controls, and responsive breakpoints remain implementation details.

### Global quick capture

A global quick-add entry point should be accessible throughout the app. It should support capturing items such as tasks, events, notes, and projects while requesting only the minimum information necessary. Users should be able to organize or complete details later.

### Search

Search and filtering are contextual to each section in the MVP. A single global search across all content is deferred.

## Core feature requirements

### Tasks

The task system must support:

- Priorities
- Subtasks
- Tags
- Due dates
- Recurring tasks
- Filters
- Statuses
- List, Kanban, Calendar, and My Day views
- Quick task details in a panel
- A full page for more complex task details
- Optional scheduled start and end times for calendar time-blocking
- A dedicated Overdue section
- Grouping of recurring overdue tasks to reduce visual clutter

#### Task statuses

The standard workflow is:

- `To do`
- `In progress`
- `Done`
- `Cancelled` (available as an optional status)

Cancelled tasks are excluded from goal progress and completion statistics, and are hidden entirely from MVP analytics.

#### Recurring tasks

Each recurrence creates a new task occurrence on its scheduled date, regardless of whether earlier occurrences have been completed. Earlier incomplete occurrences remain open; they are not silently overwritten or moved forward.

The exact recurrence editor, time-zone behavior, and edge cases remain to be specified.

### Projects

Projects are organized by space. Each project has a workspace containing:

- An overview
- Task views
- Milestones
- Notes

Project progress is calculated from eligible, non-cancelled tasks, with each eligible task contributing equally. Milestone completion is tracked separately and does not contribute a second time to the project percentage.

The behavior of a project with no eligible tasks must be specified before implementation.

### Calendar

The calendar combines relevant planning information while keeping types visually distinct:

- Tasks and their due dates
- Tasks with optional scheduled start and end times
- Separate event records

Events are not tasks. A task can have a deadline without a scheduled time block. Calendar interactions, event fields, time-zone rules, and handling of overlapping blocks remain to be specified.

### Notes

Notes use a plain editor rather than a block-based editor. They support formatted text, titles, links, and links to related records such as tasks, projects, and goals.

### Goals

Goals can link to projects and standalone tasks, and can contain child goals. Progress is calculated automatically from completion, follows a project-aware model, and must avoid double-counting.

- A linked project's progress represents the tasks inside that project.
- Standalone linked tasks contribute separately.
- Parent goals incorporate child-goal progress without counting the same underlying work twice.
- Cancelled tasks do not contribute to goal progress.

The exact aggregation formula for a parent goal that contains child goals alongside directly linked projects and tasks must be deterministic and documented before implementation.

### Analytics

The MVP provides basic statistics, initially focused on task completion and overdue tasks. Cancelled tasks are hidden from analytics entirely. Habit-related analytics are deferred until habit tracking exists.

### Spaces and shared items

Each item has one home space and can be shared into other spaces without creating duplicate copies. Spaces can have their own dashboards and views over shared canonical data.

- Multiple user accounts are supported from the start.
- Spaces are private to their owner in the MVP.
- Collaboration and shared spaces are deferred.
- Shared-item edit permissions are configurable per item.
- The backend must enforce authorization; hiding controls in the frontend is not sufficient.

Detailed permission modes and the exact rules for editing, moving, deleting, and permanently deleting shared items remain to be specified.

## Data relationships and calculation rules

The following behavior is agreed and should be treated as a correctness requirement.

### Avoid double-counting

A task that is already represented by a linked project's progress must not also be counted as an independent task contribution to the same goal. Standalone linked tasks contribute separately. Parent goals must likewise avoid counting work already represented by child goals.

### Project progress

Project progress is the completion percentage of eligible, non-cancelled tasks, with each eligible task weighted equally. Milestones have their own progress signal and do not add to this task-based percentage.

### Cancelled tasks

Cancelled tasks are excluded from goal progress and completion statistics, and are not shown in MVP analytics.

### Recurring occurrences

Create each occurrence on schedule. Keep previous incomplete occurrences open so that history and overdue work remain visible.

### Open calculation details

Before implementation, specify:
- How goals aggregate a mixture of child goals, projects, and standalone tasks without overlap
- What project progress displays when there are no eligible tasks
- How task/project/goal links behave when an item is moved or unlinked
- Whether any archived or otherwise ineligible records exist in the MVP and how they affect calculations

## Accounts, authentication, and permissions

### Accounts

Support multiple user accounts from the beginning. Users' spaces are private to them in the MVP. Team collaboration is not part of the initial release.

### Sign-in

Provide both:
- Email/password authentication
- Google sign-in

Account linking and recovery flows must safely handle cases such as an email address used with more than one sign-in method. Exact implementation and security details remain to be specified.

### Authorization

Per-item sharing permissions are configurable. Permissions must be checked on the backend for every relevant read or mutation. The implementation plan must define who can view, edit, move, delete, restore, and permanently delete an item, including when the item is visible in a space other than its home space.

## Deletion and recovery

Use a recoverable Trash with two explicit actions:

- Restore an item
- Permanently delete an item

The implementation plan must define retention duration and restoration behavior when related records (such as a space, project, or goal) have changed or been deleted. Permanent deletion should be an explicit action rather than the default response to an ordinary delete request.

## Non-functional requirements

- Responsive and usable on desktop and mobile.
- Light and dark themes.
- Consistent task state across all task views.
- One canonical record for an item shared across spaces.
- Backend-enforced data isolation and permissions.
- Deterministic, explainable goal and project progress.
- Online-first behavior; offline editing and sync are not required for MVP.
- Avoid exposing cancelled tasks in MVP analytics.

Performance targets, accessibility acceptance criteria, backup/recovery targets, logging, and deployment requirements should be defined in the technical plan.

## Implementation details to specify

These are open implementation specifications, not blockers to documenting the agreed product direction:

- Product name, brand, exact colors, typography, and responsive breakpoints
- Exact dashboard widgets and customization behavior
- Detailed data schemas and validation for tasks, projects, milestones, events, notes, goals, accounts, sharing, and Trash
- Detailed per-item permission matrix, including deletion and recovery permissions
- Exact hierarchical-goal aggregation formula and edge-case handling
- Empty-project progress behavior
- Recurrence, time-zone, scheduled-time, and overlapping-block rules
- Trash retention duration and restoration behavior
- API structure, error conventions, validation strategy, and security controls
- Hosting, deployment, environment configuration, backups, and monitoring
- Testing strategy and acceptance criteria

Resolve these details during implementation planning without reopening confirmed product decisions unless new evidence makes a change necessary.

## Design trade-offs

| Decision | Benefit | Trade-off to manage |
|---|---|---|
| Multiple task views | Supports different planning styles | Views must remain consistent over the same task data |
| Panel and full-page task details | Fast routine edits plus room for complex work | Requires a clear transition between detail modes |
| Projects organized by space | Keeps contexts organized | Cross-space visibility and permissions need careful rules |
| Hybrid project workspace | Gives projects meaningful context | Adds scope for milestones and linked notes |
| Combined calendar | One planning surface for tasks and events | Types must remain distinct and avoid clutter |
| Optional time-blocking | Supports deadline-first and schedule-first workflows | Requires validation for scheduled times and time zones |
| Mobile bottom navigation plus drawer | Keeps common destinations accessible | Information architecture must avoid duplication or hidden features |
| Global quick capture | Reduces friction when recording work | Capture must stay minimal and support later organization |
| Shared canonical data across spaces | Avoids duplicate records | Visibility and edit permissions need explicit rules |
| Automatic goal progress | Reduces manual upkeep | Aggregation and double-counting rules must be deterministic |
| Equal-weight project tasks | Simple and explainable progress | Small and large tasks count equally |
| Multiple sign-in methods | Offers choice and lowers sign-up friction | Requires safe account-linking and recovery flows |
| Recoverable Trash | Protects against accidental deletion | Adds retention and restoration lifecycle rules |
| Contextual search | Keeps results relevant and simpler to implement | No single global search in the MVP |
| Online-first behavior | Avoids offline sync complexity | Normal use depends on network access |
| Deferred habits and finance | Keeps the MVP focused | Those workflows and their analytics arrive later |

## Decision governance

The source of truth for confirmed design decisions is the persistent **Productivity App MVP Design Decision Log** in the user's Library:

`/ProductivityApp/ProductivityApp_MVP_Design_Decision_Log.md`

This README summarizes the agreed product direction and the key behavior rules. If a future change is approved, update the decision log and then keep this README aligned with it.

### Approval gate

- [x] Core product direction and MVP scope documented
- [x] Technology stack documented
- [x] Core task, project, calendar, notes, goal, account, permission, and deletion decisions documented
- [x] Deferred features and implementation-level open items documented
- [ ] User approves design freeze
- [ ] User explicitly approves implementation
- [ ] Implementation begins

**No code should be written until the user explicitly approves design freeze and implementation.**
