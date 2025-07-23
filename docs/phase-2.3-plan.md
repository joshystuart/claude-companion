# Phase 2.3: Dashboard UI Enhancements Plan

- Move the agents from being a vertical list to horizontal tabs.
  - It should be: All | Agent Name | Agent Name | Agent Name
  - Then on the right hand side, it should show the buttons to control the agent session.
- The "notification" type should show the actual command that it needs to get approval for. eg. instead of "Claude needs your permission to use Bash", show the actual command like "Claude needs your permission to run `ls -la`".
  - Also add the CTAs on the card to approve or deny the command.
- Split up the agent name to help make it more identifiable.
  - eg. "josh.stuart-ORG101311-b0f5ac05" should be split into:
    - computer: josh.stuart-ORG101311
    - agent: b0f5ac05
- The edit operation should show the before and after string