# Support session privacy

The support workspace retained unsent ticket text after logout, and its list renderer lacked a session/generation check after decoding a response body. Creation completions could also reset a later account's form or change its feedback.

The workspace now clears ticket subjects, counts, drafts and feedback when a session clears or changes. List requests use both the current session version and a request generation; stale decoded bodies and old failures cannot render over a newer result. Creation success/failure only changes the originating session's form. Failed refreshes remove previous ticket results.

Five browser regressions cover immediate cleanup, a delayed decoded body after logout, competing refreshes and both success/failure of a previous account's creation. These are synthetic browser acceptance cases, not production account actions.

This change adds no server workflow or schema. C04 remains partial: persisted assignment, responsibility, deadlines/escalation, resolution and customer acceptance/objection still require their own implementation and acceptance. The change does not prove full A15 privacy-rights or D11 accessibility acceptance.
