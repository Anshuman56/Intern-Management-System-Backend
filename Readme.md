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
