# Health Sensor Dashboard

A FHIR-compliant health sensor web application built for the DIT Web Application Development course. Real-time sensor data visualization using FastAPI, PostgreSQL, React, and D3.js — fully containerized and cloud-deployable.

## Quick Start (One Command)

```bash
git clone <your-repo-url>
cd healthapp
chmod +x setup.sh && ./setup.sh
```

- **Frontend:** http://localhost:5173  
- **API docs:** http://localhost:8000/docs  
- **Health check:** http://localhost:8000/health

> GitHub Codespaces: just open the repo — ports 5173 and 8000 are auto-forwarded.

---

## Architecture

```
Frontend (React + D3.js)
    ↕  REST (FHIR JSON)   ↕  WebSocket (real-time)
Backend (FastAPI / Python)
    ↕  SQL
Database (PostgreSQL)
```

All services run in Docker Compose. The "one button" on the frontend calls `POST /api/v1/observations`, which validates the payload, persists a FHIR R4 Observation resource to PostgreSQL, and broadcasts it live to all connected WebSocket clients.

---

## Project Structure

```
healthapp/
├── backend/
│   ├── app/
│   │   ├── core/          # config, database, FHIR builder
│   │   ├── routers/       # REST endpoints, WebSocket manager
│   │   └── schemas/       # Pydantic models
│   └── tests/             # unit + integration tests
├── frontend/
│   └── src/
│       ├── App.jsx        # dashboard + one-button UI
│       ├── LineChart.jsx  # D3.js real-time chart
│       └── api.js         # fetch + WebSocket service
├── infra/
│   └── init.sql           # DB schema (FHIR-aligned tables)
├── .github/workflows/     # CI/CD (test → build → smoke test)
├── .devcontainer/         # GitHub Codespaces config
├── docker-compose.yml
└── setup.sh               # one-command bootstrap
```

---

## Evaluation Criteria Coverage

| Criterion | Implementation |
|---|---|
| Dev environment | Docker Compose, `.env` separation, Codespaces, pre-commit hooks |
| Testing | Unit tests for FHIR builder and schema validation; CI runs on every push |
| Config management | Per-environment env vars; no hardcoded secrets |
| Logging | Structured Python logging; audit trail in `audit_logs` table |
| Deployment | Multi-container Docker Compose; CI/CD via GitHub Actions |
| Input validation | Pydantic schemas with range/type checks on all inputs |
| Error handling | Global exception handler; WebSocket auto-reconnect |
| Authentication | Token-based auth ready (SECRET_KEY in config); TLS via reverse proxy |
| Fault tolerance | WS reconnect with backoff; DB health check before backend starts |
| FHIR compliance | FHIR R4 Observation resources stored as JSONB; LOINC codes |

---

## AI Collaboration Model

### Team Composition

| Member | Role |
|---|---|
| Human lead | Architecture decisions, code review, requirements translation, final QA |
| Claude (Anthropic) | Code generation, boilerplate, FHIR schema research, README drafts |
| GitHub Copilot | Inline autocompletion during active coding sessions |

### How We Work with AI Agents

**Synchronous collaboration (human-in-the-loop)**  
The human writes a task specification as a prompt — e.g., *"build a FastAPI endpoint that validates this Pydantic schema and writes a FHIR R4 Observation to PostgreSQL, then broadcasts it via WebSocket"* — and Claude generates the full implementation. The human reviews, runs tests, and commits.

**Asynchronous / unattended generation**  
For repetitive or well-scoped tasks (boilerplate, test stubs, SQL migrations), we use Claude with detailed specs and pipe output directly into files. The human reviews the diff before merging. This lets one developer produce the equivalent of 2–3 developers' output in a sprint.

**Direction alignment**  
- All AI outputs are committed with descriptive commit messages explaining what was generated vs. hand-written.  
- A `DECISIONS.md` (see below) records every architectural choice and the reasoning behind it — human-maintained, AI-assisted drafting.  
- The CI pipeline acts as an automated gatekeeper: AI-generated code that breaks tests never reaches `main`.
- Code reviews explicitly tag AI-generated sections with `# ai-generated` comments so the team knows what to scrutinize most carefully.

**What the AI does well**  
- Boilerplate (Dockerfiles, GitHub Actions YAML, Pydantic schemas)  
- FHIR resource structure and LOINC code lookups  
- Writing test cases for edge cases the human might miss  
- Generating consistent, readable documentation  

**What the human must own**  
- Final architectural decisions (data model, security posture)  
- Acceptance of all AI-generated code after review  
- Patient/user safety considerations in a healthcare context  
- Compliance interpretation (HIPAA, GDPR)  

### Optimisation Dimensions

| Dimension | Strategy |
|---|---|
| **Performance** | Async FastAPI + asyncpg; D3 renders client-side; WebSocket avoids polling |
| **Development time** | AI agents generate ~70% of boilerplate; humans focus on logic and review |
| **Cost** | Single `docker compose up`; no cloud infra required for dev |
| **Accuracy** | FHIR R4 schema enforced; Pydantic validation on all inputs; unit tests |
| **Usability** | Live dashboard with D3 charts; real-time feed; single button for demo |
| **Security** | Env-based secrets; audit log on every request; parameterized queries |
| **Scalability** | Stateless backend; DB connection pooling; WebSocket manager scales horizontally |
| **Maintainability** | Modular routers; schema/model separation; typed Pydantic contracts |
| **Traceability** | Structured logs; audit_logs table; FHIR `issued` timestamp on every record |

---

## FHIR Observation Example

`POST /api/v1/observations` stores and returns:

```json
{
  "resourceType": "Observation",
  "status": "final",
  "category": [{ "coding": [{ "code": "vital-signs" }] }],
  "code": {
    "coding": [{ "system": "http://loinc.org", "code": "8867-4", "display": "Heart rate" }]
  },
  "subject": { "reference": "Patient/demo-patient" },
  "effectiveDateTime": "2024-04-13T10:30:00Z",
  "valueQuantity": { "value": 72, "unit": "beats/minute", "system": "http://unitsofmeasure.org" }
}
```

---

## Running Tests

```bash
cd backend
pip install -r requirements.txt pydantic-settings
pytest tests/ -v --cov=app
```

---

## Extending for Real Sensor Data

Replace the random value generator in `App.jsx` with a real sensor stream (BLE, serial, or WebSocket from a Raspberry Pi). The backend FHIR pipeline is sensor-agnostic — just change the LOINC code and unit.
