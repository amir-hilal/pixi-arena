# Prompt Playbook

## Feature Requests

Ask for one feature at a time. Include the target folder, expected behavior, and constraints.

Example:

```text
Implement player movement as a system. Keep entities as data only. Do not add rendering logic to the system.
```

## Refactors

State the current pain point, the desired boundary, and what must not change.

Example:

```text
Refactor collision code into a system without changing entity shape or scene behavior.
```

## Performance Constraints

Name the measurable constraint and the likely hotspot.

Example:

```text
Optimize enemy updates to avoid per-frame allocations. Preserve current movement behavior.
```

## Review Requests

Ask for findings first, then recommendations.

Example:

```text
Review this change for coupling, frame-time cost, state predictability, and test gaps.
```
