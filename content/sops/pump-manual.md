---
title: "LSS-200 Series Pump — Operator Reference"
source: "MAN-LSS200-1 · Rev 5.0 · 2025-08-10"
roleScope: ["facilities_mgr", "maintenance"]
---

# Overview

The LSS-200 series is a redundant twin-pump aquatic life-support unit. The primary pump (suffix A) runs continuously; the backup (suffix B) exercises weekly and engages automatically on primary fault, or manually via the local transfer switch.

# Nominal operating envelope

- Discharge pressure: 22–32 psi (nominal 27 psi).
- Flow: 180–260 L/min.
- Bearing temperature: below 65 °C.
- Shaft-seal life: 9 months nominal duty (see PM policy).

# Consumables

- Shaft seals — replaced during scheduled PM or on demand when weep is observed.
- O-rings (4 per rebuild).
- Filter media — quarterly.

# Fault codes

- **E-01**: pressure below 22 psi. Cause: seal wear, filter blockage, or intake starvation.
- **E-02**: pressure above 32 psi. Cause: downstream restriction.
- **E-03**: bearing temperature high. Cause: lubrication failure or excessive load.
- **E-04**: transfer switch failed. Cause: relay contact wear; contact maintenance.

Any fault code auto-raises an alert in the operational workspace and follows the ladder in SOP-LSS-001.

# Backup pump

The backup pump (LSS-204B for River's Edge) is rated for continuous duty up to 30 days. It should not be considered a permanent primary. Once engaged, schedule shaft-seal service on the primary within 72 hours.
