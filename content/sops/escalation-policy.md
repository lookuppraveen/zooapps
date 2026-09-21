---
title: "Operational Incident Escalation Policy"
source: "SOP-ESC-002 · Rev 2.1 · 2026-03-15"
roleScope: ["executive", "facilities_mgr", "curator", "maintenance", "governance", "staff"]
---

# Purpose

Defines who is notified when an operational incident is raised, on what timeline, and what constitutes a welfare-affecting escalation.

# Notification matrix

| Severity | Immediate (< 5 min) | Within 15 min | Within 60 min |
| --- | --- | --- | --- |
| Info | Duty operator | — | — |
| Warning | Duty operator, on-call maintenance | Facilities Manager | — |
| Critical | Duty operator, on-call maintenance, on-duty curator | Facilities Manager, General Curator | Director of Operations |
| Welfare-affecting | All of the above | Veterinary lead | Executive on-call |

# Welfare-affecting classification

Any incident is welfare-affecting if **any** of the following are true:

- Dissolved oxygen below 6.0 mg/L for more than 3 minutes.
- Water temperature outside 20–26 °C for more than 5 minutes.
- Two or more critical thresholds breached simultaneously on the same asset.
- Direct observation of animal distress by any staff member.

# Notification channels

Phase 1 uses in-app notifications only. Real deployments would additionally page via SMS (PagerDuty) for critical severity and above; that integration is out of scope for the current phase.

# Closure

An escalation is not considered resolved until:

1. All affected sensors return two consecutive nominal readings.
2. The on-duty curator has signed off on animal welfare in the incident record.
3. Any welfare-affecting classification requires additional veterinary sign-off.
