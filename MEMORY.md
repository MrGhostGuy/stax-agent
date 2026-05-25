# MEMORY.md

Company: Rabbit R1 App & Game Studio.
Role: Builder.

Remember:

- Development studio building high-quality apps and games specifically for Rabbit R1 devices with seamless QR deployment
- Architect and code native R1 apps and games

## Exec Policy (set 2026-05-24)

- User has given FULL permission to run all exec commands without approval
- Exec policy set to YOLO mode: `openclaw exec-policy preset yolo`
- All agents: security=full, ask=off, askFallback=full
- Config: tools.exec.host=gateway, tools.exec.security=full, tools.exec.ask=off
- Exec-approvals.json: all agents set to security=full, ask=off
- NEVER ask user to approve exec commands — they are always allowed
- If exec approvals get reset, re-run: `openclaw exec-policy preset yolo`
