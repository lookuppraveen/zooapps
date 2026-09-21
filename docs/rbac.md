# Role-Based Access Control

The Zoo AI environment defines **6 roles** and **6 modules** (PDF §5.6).
Access is enforced in three layers:

1. **Sidebar** — modules the role cannot `read` are hidden from navigation.
2. **API middleware** — every tRPC procedure verifies `canRead` for the resource module.
3. **Service layer** — `canAct` gates mutations (create/update/delete/approve).

The matrix below is the source of truth; it is materialized into the `role_module_access`
table by [`prisma/seed.ts`](../prisma/seed.ts) and checked by the runtime `AuthzService`.

## Access matrix

Legend: `R` = read only · `RW` = read + act · `—` = no access.

| Role                  | Home | Knowledge | Facilities | Executive | Incidents | Security |
| --------------------- | :--: | :-------: | :--------: | :-------: | :-------: | :------: |
| Executive             |  R   |     R     |     R      |    RW     |     R     |    R     |
| Facilities Manager    |  RW  |    RW     |     RW     |     R     |    RW     |    R     |
| Curator               |  RW  |    RW     |     R      |     R     |    RW     |    —     |
| Maintenance Tech      |  RW  |     R     |     RW     |     —     |    RW     |    —     |
| Governance Admin      |  R   |     R     |     R      |     R     |     R     |    RW    |
| General Staff         |  R   |     R     |     R      |     —     |     —     |    —     |

## Notes

- **Knowledge answers are role-scoped twice**: the retrieval layer filters passages
  by `roleScope` before the LLM sees them, and the API additionally checks that the
  caller's role includes the module.
- **PO approval** requires `canAct` on `incidents`. Default approver is the Facilities
  Manager; multi-tier approval can be added by extending `POApproval`.
- **Audit trail** is read-only for Governance (`canRead`), append-only for the system
  itself. No role can update or delete `audit_events`.
- **General Staff** intentionally cannot see Executive or Incidents/Security — the demo
  uses this to prove role-scoping visibly.

## Extending

To add a role: add the enum value in [`prisma/schema.prisma`](../prisma/schema.prisma),
add a matrix row in `ACCESS_MATRIX` in [`prisma/seed.ts`](../prisma/seed.ts), create a
demo user, run `pnpm db:seed`.
