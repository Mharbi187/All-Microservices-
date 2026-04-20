# Nexus-AID: Microservices Platform 🌍

Welcome to the **Nexus-AID** repository. This platform is a Disaster Response & Coordination System built with a microservices architecture. 

> **⚠️ IMPORTANT REPOSITORY STRUCTURE ⚠️**
> 
> This repository uses a **Branch-per-Service** architecture. The `main` branch ONLY contains orchestration files (like `docker-compose.yml` and `.env.example`). The actual source code for each microservice lives on its own dedicated branch.

## 🏗️ Architecture & Branches

- `main` — Orchestration (Docker Compose, DB Init)
- `frontend` — Unified React/Vite Single Page Application
- `core-service` — Spring Boot (MS1: Social & Resources)
- `admin-service` — Spring Boot (MS3: Admin & Reporting)
- `disaster-detection` — Python/Flask AI Agent (MS4)
- `api-gateway` — Spring Cloud Gateway
- `config-server` — Spring Cloud Config Server
- `eureka-server` — Spring Cloud Netflix Eureka

---

## 🚀 How to Run the Platform (Production / Docker)

You don't need to clone all the code if you just want to run the platform! Every branch automatically builds and publishes a Docker image to GitHub Container Registry (GHCR).

1. Clone just the main branch:
   ```bash
   git clone https://github.com/Mharbi187/All-Microservices-.git
   cd All-Microservices-
   ```
2. Copy the environment config:
   ```bash
   cp .env.example .env
   # Edit .env and set your secure passwords
   ```
3. Start the entire platform using Docker Compose:
   ```bash
   docker-compose up -d
   ```
4. Access the frontend at `http://localhost:5173`.

---

## 💻 How to Clone for Local Development

Because the services live on separate branches, a standard `git clone` will only get you the `main` branch. To develop locally and see all the code at once, the best approach is to use **Git Worktrees**. This allows you to check out multiple branches into separate folders simultaneously.

### Strategy 1: Using Git Worktrees (Recommended)

Run this script in your terminal to clone the repo and map every branch to its own folder:

**Linux / macOS (Bash):**
```bash
# 1. Clone the main repository orchestration
git clone https://github.com/Mharbi187/All-Microservices-.git nexus-aid
cd nexus-aid

# 2. Add worktrees for each microservice branch
git worktree add ../frontend frontend
git worktree add ../core-service core-service
git worktree add ../admin-service admin-service
git worktree add ../disaster-detection disaster-detection
git worktree add ../api-gateway api-gateway
git worktree add ../config-server config-server
git worktree add ../eureka-server eureka-server
```

**Windows (PowerShell):**
```powershell
git clone https://github.com/Mharbi187/All-Microservices-.git nexus-aid
cd nexus-aid
$branches = @("frontend", "core-service", "admin-service", "disaster-detection", "api-gateway", "config-server", "eureka-server")
foreach ($branch in $branches) {
    git worktree add "../$branch" $branch
}
```

*This will give you a parent folder containing cleanly separated directories for each microservice, all linked to the same underlying Git repository.*

### Strategy 2: Manual Clone per Folder
If you don't want to use worktrees, you can simply clone the repo multiple times and target specific branches:

```bash
git clone -b frontend https://github.com/Mharbi187/All-Microservices-.git frontend
git clone -b core-service https://github.com/Mharbi187/All-Microservices-.git core-service
git clone -b admin-service https://github.com/Mharbi187/All-Microservices-.git admin-service
# ... etc ...
```
