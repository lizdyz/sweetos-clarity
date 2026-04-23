---
name: handoffs
description: handoff_events table + lifecycle for routing tasks/projects/campaigns/sessions/workflow steps between operators.
type: feature
---

# Handoffs

Every routing event between operators is a row in `handoff_events`. Subject can be a `task`, `project`, `campaign`, `session`, or `workflow_step_run`. The receiver appears as the new `operator_id` on the subject immediately on create — the handoff row records the audit trail and lets the receiver Accept/Decline.

## Lifecycle (enforced in `src/lib/handoffs.ts`)

1. **Create** → `status='pending'`. Subject reassigned to receiver. If `reason='blocked'`, `tasks.waiting_on` set to receiver name.
2. **Accept** → `status='accepted'`, `responded_at=now()`. Subject stays with receiver.
3. **Decline** → `status='declined'`. Subject reassigns back to sender. Sender gets `bot_alerts` row (`kind='handoff_declined'`).
4. **Cancel** (sender, before response) → `status='cancelled'`. Subject reassigns back.
5. **Auto-complete** (deferred to Wave 5) → `status='auto_completed'` when subject completes while pending.

Race protection: `respondToHandoff()` does `UPDATE ... WHERE status='pending'` and reports `already_handled` if no row updated.

## Where it surfaces

- `/operators/$id` → **Handoffs** tab renders `<HandoffInbox operatorId={id} />` with Inbound + Sent (last 7d) stacks.
- `<HandoffSheet>` is the universal write surface — mounted on the operator detail header and reused elsewhere later.
- View `operator_handoff_inbox` joins subject labels for display.

## Permissions

Team members (any user with a `user_roles` row) can read, insert, and update `handoff_events`. RLS uses `is_team_member(auth.uid())`.
