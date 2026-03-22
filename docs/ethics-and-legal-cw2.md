# Ethics and legal considerations (CW2)

**Purpose:** Coursework often requires explicit discussion of **privacy**, **consent**, and **legal** aspects of telemetry and user-facing software.  
**Submission:** Integrate into the main report or **export to PDF** as a standalone appendix if required.

## 1. Data minimisation and pseudonymity

- Sessions and events use **identifiers** (e.g. user/session IDs) suitable for **pseudonymous** analytics rather than direct real-world identity in the seeded demo.
- Production deployments should avoid collecting unnecessary PII; align retention with policy.

## 2. Consent and transparency

- The client should present **clear notice** before gameplay telemetry is recorded where applicable (e.g. menu/consent flow).
- Players should understand **what is logged** (e.g. stage progress, powerups, outcomes) at a high level.

## 3. Security

- API authentication/roles for designer routes (`backend/utils/auth.py`, `permissions.py`).
- Transport security (**HTTPS**) in production; no secrets in the repository.

## 4. Third-party and licensing

- Open-source dependencies are listed in `docs/software-inventory.md` and lockfiles (`requirements.txt`, `package-lock.json`).
- Asset licences (images/sounds) should be recorded if redistributing; see `client/public/` and project README.

## 5. Accessibility and fairness

- See `docs/accessibility.md` for inclusive design notes; fairness of difficulty and progression is partly addressed via dashboard metrics and balancing tools.

---

*Adapt wording to your institution’s ethics template and any real deployment context.*
