
# Time Manager API Documentation

This document provides a detailed overview of the available REST API endpoints for the **Time Manager** backend. It is designed to help frontend developers integrate effectively with the backend services.

---

## 🔐 AuthController (`/auth`)

### POST `/auth/register`
Register a new user.

- **Body:** `RegisterRequest`
- **Returns:** `UserDTO`

### POST `/auth/login`
Authenticate a user.

- **Body:** `LoginRequest`
- **Returns:** `AuthResponse` with JWT

### GET `/auth/me`
Get details of the currently authenticated user.

- **Returns:** `UserDTO`

---

## 👤 UserController (`/api/users`)

### POST `/api/users`
Create a new user.

- **Body:** `UserDTO`
- **Returns:** Created `UserDTO`

### GET `/api/users/{id}`
Retrieve user by ID.

- **Returns:** `UserDTO`

### GET `/api/users`
List all users.

- **Returns:** List of `UserDTO`

### PUT `/api/users/{id}`
Update user by ID.

- **Body:** `UserDTO`
- **Returns:** Updated `UserDTO`

### DELETE `/api/users/{id}`
Delete user by ID.

- **Returns:** `204 No Content`

### PUT `/api/users/users/{id}/approve`
Approve user (CEO only).

### PUT `/api/users/users/{id}/reject`
Reject user (CEO only).

### GET `/api/users/users/pending`
List all pending users (CEO only).

---

## ⏱ ClockController (`/api/clock`)

### POST `/api/clock/clock-in`
Clock in the authenticated user.

### POST `/api/clock/clock-out`
Clock out the authenticated user.

### GET `/api/clock/me`
Get current clock entry for the logged-in user.

### GET `/api/clock/user/{userId}`
Get clock entries for a specific user.

### GET `/api/clock/all`
List all clock entries (admin only).

---

## 🔐 PasswordController (`/api/password`)

### POST `/api/password/forgot`
Trigger password reset email.

### POST `/api/password/reset`
Reset password using token.

---

## 👥 TeamController (`/api/teams`)

### POST `/api/teams`
Create a team.

### GET `/api/teams`
List all teams.

### GET `/api/teams/{id}`
Get team by ID.

### PUT `/api/teams/{id}`
Update team.

### DELETE `/api/teams/{id}`
Delete team.

---

## 👨‍👩‍👧‍👦 TeamMemberController (`/api/teams/{teamId}/members`)

### POST `/api/teams/{teamId}/members`
Add member to team.

### DELETE `/api/teams/{teamId}/members/{userId}`
Remove member from team.

### GET `/api/teams/{teamId}/members`
List all members of a team.

---

## 📊 ReportsController (`/api/reports`)

### GET `/api/reports/summary`
Get summary report (e.g., total hours, users, etc).

### GET `/api/reports/user/{userId}`
Get report for a specific user.

### GET `/api/reports/team/{teamId}`
Get report for a specific team.

---

## 🧾 DTOs and Entities Used

- `UserDTO`: Contains user details like name, email, role, phone, etc.
- `RegisterRequest`, `LoginRequest`: Used for authentication.
- `AuthResponse`: Returns JWT after login.
- `ClockDTO`, `TeamDTO`, `ReportDTO`: Used across endpoints.

---

## 🛡 Security

- Most `/api/**` routes require JWT-based authentication.
- CEO-only routes use Spring Security's `@PreAuthorize("hasRole('CEO')")`.

---

## 🧪 Testing

Integration tests cover:

- User creation, update, deletion
- Duplicate email conflict
- Missing password conflict
- Listing users
- Clock in/out flow

---

## 💡 Tips for Frontend Developers

- Use `/auth/login` to obtain a token, then set it in the `Authorization` header as `Bearer <token>` for all authenticated routes.
- Validate fields like password (min 8 chars) on the frontend.
- Always check for `403 Forbidden` responses in case of role restrictions.

---

For any issues or endpoint suggestions, contact the backend team.
