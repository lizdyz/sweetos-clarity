---
name: Vault canon
description: capture_attachments is the unified Vault for all files; visibility flag gates client portal exposure
type: design
---
Vault is the single file surface across the system, backed by `capture_attachments`. Every file (capture, session, document, external_ai, manual) lands here with `visibility` ∈ (internal, client_shared, public). Client portals (relationship_portals) only ever render `client_shared`. Internal Vault sees everything. Tag with `tagged_personas`, `tagged_components`, `tagged_relationships`, `tagged_domains`, `tagged_tenets` so the file shows up on the right detail pages. Use `<VaultGrid>` to render.
