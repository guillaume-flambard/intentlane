# M2: Capability Map

## 1. Red: the mapping has its contract before anyone renders

- [ ] 1.1 A fixture whose `AuditReport` has a single finding (a dot-separated
      capability) is extracted into a tree of one group with one node. The node's
      `capability`, `state`, `confidence`, `requirements`, `gaps` and `nextAction`
      are copied from the findings row and no renderer is involved.
- [ ] 1.2 The same fixture with a second finding in the same group: still one
      group with two nodes in source order.
- [ ] 1.3 A finding whose group is not in the catalogue is rendered under an
      explicit `other` group instead of being dropped.
- [ ] 1.4 A finding whose `evidence` is empty produces a node with zero evidence.
- [ ] 1.5 The six states in the report each produce the exact same state, with no
      other value appearing.

## 2. Green

- [ ] 2.1 Implement `toCapabilityNode()` in `packages/studio-protocol`, and make
      the ten real group names the only root children.
- [ ] 2.2 Every test in group 1 turns green.

## 3. Wiring in the shell

- [ ] 3.1 A **Capabilities** screen reads the audit JSON and renders the tree, in
      the same style as the existing five screens.
- [ ] 3.2 A selected node's inspector shows the **original findings row**
      verbatim, with the evidence path and line, and every gap.
- [ ] 3.3 A node with evidence opens the corresponding path in Xcode via `xed`,
      including the line when one is known.
- [ ] 3.4 A filter row: All, Problems, Implemented, Tested, Unknown.

## 4. Real run

- [ ] 4.1 An audit fixture placed in the shell has the FSNotes run's 51 findings
      rendered, and 10 groups in a known order.
- [ ] 4.2 When `INTENTLANE_STUDIO_REPO` is not set the screen is empty, not a
      fixture, matching the shell's existing real-run discipline.
- [ ] 4.3 `pnpm test` green and `openspec validate --changes --strict` clean.
