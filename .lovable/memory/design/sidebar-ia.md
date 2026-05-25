---
name: sidebar-ia
description: Locked 7-group sidebar IA mirroring the SweetBOS Operating Console spec — Command · Clients & Scope · Workbench · Review · Coordination · Library · Admin.
type: design
---

Sidebar groups are locked to the SweetBOS Operating Console spec:

1. **Command** (always open) — Command Center · Today · Planning · Capture · Import · Notifications
2. **Clients & Scope** (always open) — Clients/Prospects · People · Engagements · Missions · Journeys · Quests · SweetCycle
3. **Workbench** (always open) — Sandbox · OCDA · Flightdeck · SweetScan · Sessions · Projects · Tasks · Sparks · Campaigns · Decisions · Open Decisions · Risks · Delegation · Measures
4. **Review** (collapsed) — Portfolio · Roadmap · Metrics · Capacity
5. **Coordination** (collapsed) — Calendar · Operators/Team · Messages
6. **Library** (collapsed) — Components · Workflows · Session Templates · Playbooks · Personas · Outcomes · JTBD · KTIs · Documents/Assets · Evidence · Insights · Domain Assessments · Vault · Domains · Tenets · Lens Studio
7. **Admin** (collapsed) — Entity Canon · Prompt Console · Spark Library · Excellence rubric · UX Audit · Audit Trail · Team & profile

Rules:
- Sessions live in **Workbench** (scheduled work). Session Templates live in **Library** (catalog).
- Measures live in **Workbench** (operational signal). `/metrics` in **Review** is the rollup destination.
- Operators live in **Coordination** (people management). The cross-relationship cockpit (**Flightdeck**) lives in **Workbench** because it's where you act.
- Review pages are derived rollups only — they never create records.
- Sparks live in Workbench under Quests (SweetSync remains the conceptual nudge rail).
