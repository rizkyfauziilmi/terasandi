# Terasandi

### Your files. Your keys. Your rules.

Terasandi is an open-source, self-hosted private file storage and sharing platform designed to give you complete ownership and control over your files.

Think of it as your own private cloud drive. Upload, organize, store, and share files through a simple web interface, hosted on infrastructure you control.

Unlike traditional file-sharing services, Terasandi keeps your data under your control without exposing the host filesystem directly to users.

---

## ✨ Why Terasandi?

We believe your files should belong to you, not to the platform storing them.

Terasandi provides a private cloud storage experience similar to Google Drive, while allowing you to host and manage your own storage infrastructure.

Our philosophy is simple:

- **Your Data, Your Ownership** — Your files stay on infrastructure you control.
- **Private by Design** — Users interact with files through the application, never through direct host filesystem access.
- **Self-Hosted Freedom** — Run your own private cloud without depending on third-party storage providers.
- **Simple File Sharing** — Share files with others through controlled sharing links.
- **Open Source** — Transparent development and community-driven improvements.

## 🚀 MVP Features

The initial release focuses on providing the essential experience of a private cloud drive.

### Milestone 1 — Project Foundation

Establish the core application architecture and development environment.

- [x]Initialize project structure and application architecture.
- [ ]Set up backend and frontend applications.
- [ ]Configure database and migrations.
- [ ]Set up environment-based configuration.
- [ ]Implement centralized error handling.
- [ ]Set up logging.
- [ ]Establish API conventions and response formats.

### Milestone 2 — Storage Foundation

Build the storage layer responsible for managing files independently of the host filesystem interface.

- [ ]Implement application-managed local storage.
- [ ]Configure a private storage directory.
- [ ]Implement file storage abstraction.
- [ ]Generate unique internal file identifiers.
- [ ]Store file metadata in the database.
- [ ]Implement file read and write operations.
- [ ]Implement file deletion and cleanup.
- [ ]Prevent direct exposure of physical storage paths.
- [ ]Implement configurable storage limits.

### Milestone 3 — Authentication & User Management

Introduce user accounts and establish ownership boundaries.

- [ ]Implement user registration.
- [ ]Implement user login and logout.
- [ ]Implement secure password hashing.
- [ ]Implement session or token-based authentication.
- [ ]Implement user profile management.
- [ ]Establish user-specific storage ownership.
- [ ]Implement authentication middleware.
- [ ]Implement authorization checks.

### Milestone 4 — Core File Management

Build the essential file management functionality.

- [ ]Upload files.
- [ ]Download files.
- [ ]Create folders.
- [ ]Browse folders and files.
- [ ]Rename files and folders.
- [ ]Move files and folders.
- [ ]Delete files and folders.
- [ ]View file details and metadata.
- [ ]Search files and folders.
- [ ]Validate file types and upload sizes.
- [ ]Enforce file and folder ownership.

### Milestone 5 — Private File Sharing

Enable users to share files and folders with controlled access.

- [ ]Generate unique sharing links.
- [ ]Share individual files.
- [ ]Share folders.
- [ ]Implement public share access through controlled endpoints.
- [ ]Add optional password protection.
- [ ]Configure link expiration.
- [ ]Configure download permissions.
- [ ]Revoke or disable sharing links.
- [ ]Validate sharing permissions.
- [ ]Prevent unauthorized access to shared resources.

### Milestone 6 — Web Interface & User Experience

Build the interface that brings all core functionality together.

- [ ]Create the application dashboard.
- [ ]Implement login and registration pages.
- [ ]Build the file browser interface.
- [ ]Implement folder navigation.
- [ ]Add drag-and-drop file uploads.
- [ ]Display upload progress.
- [ ]Implement file and folder actions.
- [ ]Build file details views.
- [ ]Create sharing management interface.
- [ ]Create shared file download pages.
- [ ]Implement responsive layouts.

### Milestone 7 — Security & Reliability

Strengthen the application before the first public MVP release.

- [ ]Validate all file operations on the server.
- [ ]Enforce authorization on every protected endpoint.
- [ ]Prevent path traversal vulnerabilities.
- [ ]Prevent unauthorized file access.
- [ ]Secure file download endpoints.
- [ ]Protect against insecure direct object references (IDOR).
- [ ]Implement upload validation and safe filename handling.
- [ ]Apply request size limits and rate limiting.
- [ ]Implement secure session handling.
- [ ]Add basic audit logging.
- [ ]Test user and storage isolation.
- [ ]Add automated tests for critical operations.

### Milestone 8 — Deployment & MVP Release

Prepare Terasandi for real-world self-hosted deployment.

- [ ]Create production-ready Docker images.
- [ ]Provide Docker Compose configuration.
- [ ]Configure persistent storage volumes.
- [ ]Provide environment variable documentation.
- [ ]Document installation and upgrade procedures.
- [ ]Document backup and restore procedures.
- [ ]Add health check endpoints.
- [ ]Perform end-to-end testing.
- [ ]Verify clean installation on a fresh server.
- [ ]Publish the first MVP release.

---

### 🎯 MVP Completion Criteria

The MVP is considered ready when users can:

- [ ]Register and securely log in.
- [ ]Upload and store files on their own infrastructure.
- [ ]Create folders and organize their files.
- [ ]Browse, search, rename, move, and delete files.
- [ ]Download their stored files.
- [ ]Share files and folders through controlled links.
- [ ]Protect shared links with passwords and expiration dates.
- [ ]Manage their files without direct access to the host filesystem.
- [ ]Deploy Terasandi using Docker Compose.

## 🏠 Self-Hosted by Design

Terasandi is built to run on your own infrastructure.

You can deploy it on:

- Home servers
- VPS instances
- Dedicated servers
- Private cloud infrastructure
- Docker-based environments

Your files are stored on your server, while all file operations are managed through Terasandi.

**Users never receive direct access to the host filesystem.**

Instead, they interact with their files through authenticated application interfaces and controlled APIs.

This provides a clear separation between application access and underlying server infrastructure.

## 🔐 Security & Privacy

Security and privacy are fundamental to Terasandi.

Our approach includes:

- Files are private by default.
- Every file operation requires appropriate authorization.
- Users can only access files they are permitted to access.
- Shared files are accessed through controlled sharing mechanisms.
- The host filesystem is never directly exposed to users.
- Storage paths and internal server structures remain managed by the application.

We believe privacy should be built into the architecture, not added as an afterthought.

## 📦 Getting Started

### Requirements

- Docker
- Docker Compose
- A server or machine capable of running containers

### Installation

bash

```bash
git clone https://github.com/rizkyfauziilmi/terasandi.git

cd terasandi

docker compose up -d
```

Check running containers:

bash

```bash
docker compose ps
```

Refer to the installation documentation for additional configuration details.

---

## 🌱 Philosophy

**Privacy is not a privilege. It is ownership.**

Terasandi is built around a simple belief: people should have the freedom to store, manage, and share their files without surrendering control to third-party platforms.

Your files should remain yours.

Your infrastructure should remain yours.

And sharing should always be your choice.

## 📄 License

Terasandi is open-source software.

See the `LICENSE` file for licensing information.
