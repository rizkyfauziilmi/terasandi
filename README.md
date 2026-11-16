# Terasandi

### Your files. Your keys. Your rules.

Terasandi is an open-source, self-hosted private file storage and sharing platform designed to give you complete ownership and control over your files.

Think of it as your own private cloud drive. Upload, organize, store, and share files through a simple web interface, hosted on infrastructure you control.

Unlike traditional file-sharing services, Terasandi keeps your data under your control through the application — you upload and manage files via the web interface, just like Google Drive.

---

## ✨ Why Terasandi?

We believe your files should belong to you, not to the platform storing them.

Terasandi provides a private cloud storage experience similar to Google Drive, while allowing you to host and manage your own storage infrastructure.

Our philosophy is simple:

- **Your Data, Your Ownership** — Your files stay on infrastructure you control.
- **Private by Design** — Users interact with files through the application and controlled sharing links, never through direct access to the underlying storage.
- **Self-Hosted Freedom** — Run your own private cloud without depending on third-party storage providers.
- **Simple File Sharing** — Share files with others through controlled sharing links.
- **Open Source** — Transparent development and community-driven improvements.

## 🚀 MVP Features

The initial release focuses on the essential private cloud drive experience. Progress is tracked per feature below — files are managed through the application and controlled sharing links, just like Google Drive.

### 1. Authentication & Accounts

- [x] Register new user
- [x] Login and logout
- [x] Secure password hashing
- [x] Session / token-based authentication
- [x] Route protection middleware
- [x] First registered user becomes the administrator
- [x] Role-based access control (`admin` / `user`)
- [x] Admin-only user creation and role changes
- [x] Admin user management console (list, search, rename, reset password, revoke sessions, delete)

#### Roles and permissions

Every account has exactly one role:

- **`admin`** — the first account, created by onboarding. Can create users and change roles.
- **`user`** — every account an admin creates. Can sign in and use the endpoints available to signed-in accounts.

The API is the only place accounts are created:

| Endpoint | Who may call it | Purpose |
| --- | --- | --- |
| `POST /auth/onboarding` | anyone, once | creates the first account as `admin`; later calls return `409` |
| `GET /users/me` | any signed-in user | returns the current account, role included |
| `POST /users` | `admin` | creates a new account as `user` |
| `GET /users` | `admin` | lists accounts, with `q` search and `limit` / `offset` pagination |
| `GET /users/:id` | `admin` | returns one account |
| `PATCH /users/:id` | `admin` | renames an account |
| `PATCH /users/:id/role` | `admin` | promotes or demotes an account |
| `PATCH /users/:id/password` | `admin` | sets a new password and signs the account out everywhere |
| `POST /users/:id/sessions/revoke` | `admin` | signs the account out of every device |
| `DELETE /users/:id` | `admin` | deletes an account |

New accounts always start as `user`; promoting one is a separate request, so creating an account can never silently grant privileges. The last admin cannot be demoted (`409`), because an install without an admin could never create users or promote anyone again. Admins also cannot delete their own account (`409`), so the console cannot lock itself out.

Roles live in the database and are loaded on each request, so a role change takes effect immediately, even for a session that is already signed in. On an existing install, the migration marks the oldest account as the first admin.

The web app exposes these endpoints at `/admin/users`, reachable from the account menu. Resetting a password or revoking sessions ends the account's refresh-token families; an already-issued access token stays valid until it expires.

#### Password policy

Passwords follow NIST SP 800-63B-4 and OWASP ASVS 5.0: at least 8 characters, at most 128, and no composition rules — no required letters, digits, or symbols. Requiring those only pushes people toward predictable values like `Password1!`. The control that replaces them is a blocklist: the 10,000 most common passwords are rejected, compared case-insensitively against the whole password. So `correct horse battery staple` is accepted while `qwerty123` is not. The policy lives in `packages/contracts`, so onboarding, admin user creation, and admin password resets all enforce the same rules.

### 2. Upload & Storage

- [ ] Upload file through application interface
- [ ] File storage in application internal storage
- [ ] File metadata stored in database
- [ ] Validate file type and size
- [ ] Unique identifier for each file

### 3. File & Folder Management

- [ ] Download file
- [ ] Create folder
- [ ] Browse files and folders
- [ ] Rename files and folders
- [ ] Move files and folders
- [ ] Delete files and folders
- [ ] View file details and metadata
- [ ] Search files and folders

### 4. File Sharing

- [ ] Create unique sharing link
- [ ] Share individual files
- [ ] Share folders
- [ ] Access public files through controlled link
- [ ] Password protection (optional)
- [ ] Link expiration date
- [ ] Revoke / disable sharing link
- [ ] Validate shared resource access

### 5. Web Interface

- [ ] Dashboard page
- [ ] Login and registration pages
- [ ] File browser interface
- [ ] Folder navigation
- [ ] Drag-and-drop upload
- [ ] Show upload progress
- [ ] File detail view
- [ ] Sharing management interface
- [ ] Shared file download page
- [ ] Responsive layout

### 6. Security & MVP Release

- [ ] Validate all file operations on server
- [ ] Authorization on every protected endpoint
- [ ] Prevent path traversal and IDOR
- [ ] Secure download endpoint
- [ ] Request size limit and rate limiting
- [ ] Production-ready Docker image
- [ ] Docker Compose + storage volume
- [ ] Health check endpoint
- [ ] Installation documentation and env variables
- [ ] First MVP release

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
- [ ]Manage their files through the application interface.
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

You interact with your files through the application interface and controlled sharing links — just like Google Drive — without direct access to the underlying storage.

This keeps application access clearly separated from the server infrastructure.

## 🔐 Security & Privacy

Security and privacy are fundamental to Terasandi.

Our approach includes:

- Files are private by default.
- Every file operation requires appropriate authorization.
- Users can only access files they are permitted to access.
- Shared files are accessed through controlled sharing mechanisms.
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

### Local development

The API ships a Compose file with its Postgres and MinIO services:

```bash
docker compose -f api/docker-compose.yml up -d
```

Bucket setup runs as a `post_start` hook on the MinIO container: it waits for the server, then creates the private `terasandi-files` bucket. It is a lifecycle hook rather than a one-shot service because `docker compose up --wait` treats any exited service as a failure, even on exit code 0. Check it with `docker compose -f api/docker-compose.yml logs minio`.

The image is a pinned release of `pgsty/minio`, a community build of the MinIO server: MinIO no longer publishes images on Docker Hub or anonymous Quay. It keeps MinIO's release tags, and the Compose file pins one so a rebuild cannot change the server under you.

Copy `api/.env.example` to `api/.env` and fill the storage variables:

| Variable | Development value | Notes |
| --- | --- | --- |
| `STORAGE_ENDPOINT` | `http://localhost:9000` | S3 API of MinIO |
| `STORAGE_REGION` | `us-east-1` | MinIO ignores it, the SDK requires it |
| `STORAGE_BUCKET` | `terasandi-files` | created by the MinIO container's `post_start` hook |
| `STORAGE_ACCESS_KEY` | `terasandi` | in production, a restricted user, not root |
| `STORAGE_SECRET_KEY` | `terasandi-dev-secret` | in production, a restricted user, not root |
| `STORAGE_FORCE_PATH_STYLE` | `true` | required by MinIO; AWS S3 can use virtual-hosted style |

The MinIO console is at [http://localhost:9001](http://localhost:9001), signed in with `MINIO_ROOT_USER` / `MINIO_ROOT_PASSWORD`. The bucket is private: files are meant to be served by the API, never read directly from MinIO.

For production, create a MinIO user limited to that bucket and use its credentials for `STORAGE_ACCESS_KEY` / `STORAGE_SECRET_KEY`; the root credentials are only for the container itself.

### Auth deployment notes

Set `TRUST_PROXY=true` when the API runs behind a reverse proxy (Caddy, nginx, a load balancer). Without it every request carries the proxy's address, and all users share one rate-limit bucket.

Sign-in attempts are limited per address and username (`AUTH_RATE_LIMIT`, default 5 per minute) and per address alone (`AUTH_IP_RATE_LIMIT`, default 20 per minute).

Two pieces of auth state are process-local, so run one instance of each service, or use sticky sessions:

- The API counts rate limits in memory; several API instances each keep their own counts.
- The web app de-duplicates a refresh already in flight within one process. With several web instances, two simultaneous requests can spend the same refresh token; the API treats the second as stolen and revokes the session family.

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
