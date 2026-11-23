# Intern Management System - Backend

REST API for managing interns, assigning tasks and reviewing their work.
Built with Node.js, Express 5, MongoDB (Mongoose) and JWT auth.

## Setup

1. `npm install`
2. Create a `.env` file:
   ```
   MONGO_URL=<your MongoDB connection string>
   PORT=3000
   JWT_SECRET=<long random string>
   JWT_EXPIRES_IN=7d
   ADMIN_NAME=Admin
   ADMIN_EMAIL=admin@ims.com
   ADMIN_PASSWORD=<admin password>
   ```
3. `npm run seed` - creates the admin account (safe to run more than once)
4. `npm run dev` - starts the server and restarts it on file changes

## API reference

Base URL: `http://localhost:3000`. Every route except login needs the header `Authorization: Bearer <token>`.
Errors always come back as `{ "message": "..." }`.

| Code | Meaning |
|---|---|
| 400 | Bad input: missing field, wrong value, invalid id, duplicate email |
| 401 | No token, bad or expired token, or the account was deactivated |
| 403 | Logged in, but not allowed (wrong role, or not your task) |
| 404 | The intern, task, submission or route does not exist |

### Auth

| Method | Route | Who | Body / query | What it does |
|---|---|---|---|---|
| POST | `/api/auth/login` | Anyone | `email`, `password` | Returns `{ token, user }`. Email is not case-sensitive. Deactivated accounts get 403 |
| GET | `/api/auth/me` | Logged in | - | Returns the logged-in user's profile |

### Interns (admin only)

| Method | Route | Body / query | What it does |
|---|---|---|---|
| GET | `/api/interns` | `?search=` (name or email), `?department=`, `?isActive=true\|false` | Lists interns, newest first |
| POST | `/api/interns` | `name`, `email`, `password` (min 6) required; `phone`, `department`, `joiningDate`, `isActive` optional | Creates an intern |
| GET | `/api/interns/:id` | - | Gets one intern |
| PUT | `/api/interns/:id` | Any of the fields above | Updates only the fields sent. A new password is hashed. `role` is ignored |
| DELETE | `/api/interns/:id` | - | Deletes the intern and their tasks and submissions |

To block an intern without losing their history, send `PUT /api/interns/:id` with `{ "isActive": false }`.

### Tasks

| Method | Route | Who | Body / query | What it does |
|---|---|---|---|---|
| GET | `/api/tasks` | Admin | `?status=`, `?priority=`, `?assignedTo=<internId>` | Lists all tasks, soonest deadline first, with intern details |
| POST | `/api/tasks` | Admin | `title`, `assignedTo`, `deadline` required; `description`, `priority` (Low/Medium/High, default Medium), `status` optional | Creates a task for an active intern |
| GET | `/api/tasks/my` | Intern | `?status=` | Lists the logged-in intern's own tasks |
| PUT | `/api/tasks/:id` | Admin | Any task field | Edits the task, including reassigning it to another active intern |
| PUT | `/api/tasks/:id` | Intern | `{ "status": "In Progress" }` only | Starts work on their own task. Not allowed once the task is Completed |
| DELETE | `/api/tasks/:id` | Admin | - | Deletes the task and its submissions |

### Submissions

| Method | Route | Who | Body / query | What it does |
|---|---|---|---|---|
| POST | `/api/submissions` | Intern | `task` required; `githubUrl` and/or `docLink` (http/https, at least one); `description` optional | Submits work for their own task. Can resubmit after feedback, but not once the task is Completed |
| GET | `/api/submissions` | Admin | `?task=`, `?intern=`, `?reviewed=true\|false` | Lists submissions, newest first, with task and intern details |
| PUT | `/api/submissions/:id/review` | Admin | `adminFeedback` required; `taskStatus` (Pending/In Progress/Completed) optional | Saves feedback and can update the task status in the same request |

### Dashboard

| Method | Route | Who | What it does |
|---|---|---|---|
| GET | `/api/dashboard/stats` | Logged in | Admin: intern counts, task counts by status and priority, overdue tasks, submissions waiting for review. Intern: the same numbers for their own tasks and submissions only |

### Typical flow

1. Admin logs in, creates an intern (`POST /api/interns`) and assigns a task (`POST /api/tasks`).
2. Intern logs in, sees the task (`GET /api/tasks/my`) and starts it (`PUT /api/tasks/:id` with `"In Progress"`).
3. Intern submits work (`POST /api/submissions`).
4. Admin finds unreviewed work (`GET /api/submissions?reviewed=false`) and reviews it
   (`PUT /api/submissions/:id/review`), either with `"taskStatus": "Completed"` or with feedback and `"In Progress"` to ask for changes.
5. Both check progress on `GET /api/dashboard/stats`.

## Design decisions

- **One User model with a `role` field** (`admin` / `intern`) instead of separate Admin and Intern models.
  Both log in the same way and share the same fields, so one model keeps auth simple: one login route,
  one `protect` middleware, and `adminOnly` just checks the role.
- **Only the admin marks a task "Completed".** An intern can only move their own task to "In Progress".
  When they finish, they send a submission; the admin reviews it and marks the task "Completed"
  (or sends it back to "In Progress" with feedback). This way a task is only completed once someone has checked the work.
- **Interns can only touch their own data.** Intern routes use `protect` but not `adminOnly`, and the controller
  checks that the task's `assignedTo` matches the logged-in user, otherwise it returns 403.
- **The role can never be set through the API.** The intern routes ignore any `role` in the request body,
  so nobody can create or promote an admin that way. The only admin comes from the seed script.
- **Deleting an intern also deletes their tasks and submissions**, and deleting a task deletes its submissions,
  so no record points to something that no longer exists. To keep an intern's history, deactivate them instead
  (`isActive: false`): they can no longer log in, and their existing token stops working.
- **One stats route for both roles.** `GET /api/dashboard/stats` returns system-wide numbers for the admin
  and only the logged-in intern's own numbers for an intern, so the frontend calls the same URL for both dashboards.
  A task counts as overdue when its deadline has passed and it is not "Completed".
- **Passwords** are hashed with bcrypt in a pre-save hook and are never returned by the API (`select: false`).
