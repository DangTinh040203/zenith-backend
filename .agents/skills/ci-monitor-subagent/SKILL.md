---
name: ci-monitor-subagent
description: One-shot Nx Cloud CI helper for the monitor-ci workflow. Use when Codex needs to execute exactly one CI status or self-healing MCP operation on behalf of the monitor-ci orchestrator, including FETCH_STATUS, FETCH_HEAVY, UPDATE_FIX, or FETCH_THROTTLE_INFO.
---

# CI Monitor Subagent

## Overview

Act as a narrowly scoped CI helper for the repository monitor flow. Execute one
requested MCP operation, shape the response exactly as requested, and return
immediately.

Do not use this skill as the top-level CI monitor. For long-running monitoring,
polling, local fixes, or decision making, use the `monitor-ci` skill.

## Operating Rules

- Execute exactly one command per invocation.
- Call exactly one MCP tool: either `ci_information` or
  `update_self_healing_fix`.
- Do not loop, poll, sleep, retry, analyze, or make workflow decisions.
- Return only the fields or summary shape specified for the command.
- Do not dump raw `suggestedFix`, raw diffs, full CI payloads, or full task
  output logs.

## Commands

The caller must specify one command and its required inputs.

### FETCH_STATUS

Call `ci_information` with the provided branch and select fields. Return a JSON
object with only these keys:

```json
{
  "cipeStatus": "...",
  "selfHealingStatus": "...",
  "verificationStatus": "...",
  "selfHealingEnabled": true,
  "selfHealingSkippedReason": "...",
  "failureClassification": "...",
  "failedTaskIds": [],
  "verifiedTaskIds": [],
  "couldAutoApplyTasks": [],
  "autoApplySkipped": false,
  "autoApplySkipReason": "...",
  "userAction": "...",
  "cipeUrl": "...",
  "commitSha": "...",
  "shortLink": "..."
}
```

### FETCH_HEAVY

Call `ci_information` with heavy select fields. Summarize heavy content and
return:

```json
{
  "shortLink": "...",
  "failedTaskIds": ["..."],
  "verifiedTaskIds": ["..."],
  "suggestedFixDescription": "...",
  "suggestedFixSummary": "...",
  "selfHealingSkipMessage": "...",
  "taskFailureSummaries": [{ "taskId": "...", "summary": "..." }]
}
```

Summarize `suggestedFix` and `taskOutputSummary`; do not return raw diffs or raw
logs.

### UPDATE_FIX

Call `update_self_healing_fix` with the provided `shortLink` and action. Valid
actions are `APPLY`, `REJECT`, and `RERUN_ENVIRONMENT_STATE`. Return only the
result message as a success/failure string.

### FETCH_THROTTLE_INFO

Call `ci_information` with the provided CI URL. Return only:

```json
{ "shortLink": "...", "cipeUrl": "..." }
```
