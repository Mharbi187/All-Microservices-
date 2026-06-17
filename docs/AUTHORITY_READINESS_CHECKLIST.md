# MS4 Authority Readiness Checklist (Go/No-Go)

Date: 2026-04-16
System: NexusAid MS4 Disaster Detection
Audience: Tunisian Red Crescent, Civil Protection, national/regional authorities

## 1) Intended Use and Safety Boundary

This system is approved for authority deployment only as:

- Decision-support with mandatory human validation before operational action.
- Situational awareness for prioritization and triage.

This system is not approved for:

- Fully autonomous dispatch or public warning without operator approval.
- Safety-critical action when data sources are stale/offline.

## 2) Mandatory Go/No-Go Gates

All gates below must be `PASS` before production authorization.

### Gate A: Security and Credential Hygiene

Pass criteria:

- No tracked secrets (`.env`, service keys, private keys) in git.
- Secret scan enforced in CI.
- Rotated credentials confirmed after prior exposure:
  - OpenWeather API key
  - RabbitMQ credentials
  - GEE service-account key JSON

Evidence:

- CI logs showing `scripts/secret_scan.sh` pass.
- Rotation record and revocation timestamps.
- `.env.example` placeholders only.

### Gate B: Runtime Architecture Integrity

Pass criteria:

- API + daemon both running in local mode and Docker mode.
- Shared cache path in use: `data/cache/radar_cache.json`.
- Radar endpoint returns non-empty wilaya entries after first cycle.

Evidence:

- `GET /status` and `GET /api/v1/radar` snapshots (timestamped).
- Local startup logs from `start_local_microservices.ps1`.
- Docker compose logs confirming `disaster-detection` and `disaster-daemon`.

### Gate C: Data Freshness and Degrade Behavior

Pass criteria:

- CHIRPS recency exposed (`chirps_lag_days`) in status/radar.
- Missing satellite precipitation is never silently treated as "real zero".
- OpenWeather fallback used when CHIRPS stale/missing.
- Radar marked `stale` when fallback cannot restore confidence.

Evidence:

- Radar payload samples showing `source_health`.
- At least one simulated stale-source test run with expected `daemon_status=stale`.

### Gate D: Canonical Feature Schema Consistency

Pass criteria:

- Training and inference both use canonical feature mapping.
- No active path predicts from raw unmatched schema.
- Model load fails fast on schema mismatch.

Evidence:

- Code references:
  - `src/feature_schema.py`
  - `src/inference_shared.py`
  - `src/model.py` schema checks
- Test or smoke-run logs showing successful canonical prediction path.

### Gate E: Model Performance (Historical Backtest)

Backtest must include real Tunisia incidents and non-incidents, including rainy periods in Nabeul and Mahdia.

Minimum thresholds for operational pilot:

- Flood recall >= 0.85
- Flood precision >= 0.70
- Wildfire recall >= 0.75
- Wildfire precision >= 0.70
- False negative rate on severe known events <= 0.10
- Calibration error (ECE) <= 0.08

Evidence:

- Versioned backtest report with confusion matrices by hazard.
- Event-by-event audit table with date, wilaya, predicted hazard, risk score, outcome label.
- Threshold analysis showing selected operating point and tradeoffs.

### Gate F: Alert Reliability and Governance

Pass criteria:

- Alert hazard type is predicted, not hard-coded.
- Alert location uses model output coordinates when available.
- Alert stream is capped and deduplicated.
- Operator-facing SOP defines response by risk tier.

Evidence:

- Workflow logs/artifacts from `poll_gee.yml`.
- Example alert payloads with hazard type + coordinates + source health.
- Approved SOP document.

### Gate G: Operational Hardening

Pass criteria:

- 14 to 28 days shadow mode completed with authority operators.
- Uptime target met during pilot:
  - API availability >= 99%
  - Daemon cycle success >= 98%
- Median radar refresh <= 5 seconds at dashboard layer (polling path healthy).

Evidence:

- Shadow-mode daily summary (alerts vs confirmed incidents).
- Uptime/health logs and outage logbook.
- Frontend polling trace confirming periodic refresh.

## 3) Required Delivery Artifacts

The delivery package to authorities must contain:

1. System architecture and data-flow diagram.
2. Security incident + key-rotation report.
3. Backtest methodology and full metrics by hazard.
4. Calibration/threshold selection report.
5. SOP for stale/offline mode and human escalation.
6. Shadow-mode evaluation report.
7. Deployment runbook (local, Docker, rollback, key updates).
8. Signed Go/No-Go checklist (section below).

## 4) Final Sign-Off Sheet

Use this exact sheet in your final authority review.

| Gate | Description | Owner | Status (PASS/FAIL) | Date | Evidence Link |
|------|-------------|-------|--------------------|------|---------------|
| A | Security & credential hygiene |  |  |  |  |
| B | Runtime architecture integrity |  |  |  |  |
| C | Data freshness & degrade behavior |  |  |  |  |
| D | Canonical feature schema consistency |  |  |  |  |
| E | Model backtest performance |  |  |  |  |
| F | Alert reliability & governance |  |  |  |  |
| G | Operational hardening & shadow mode |  |  |  |  |

Authorization decision:

- `GO` only if all gates are PASS.
- Any FAIL means `NO-GO` until corrective action is complete and re-verified.
