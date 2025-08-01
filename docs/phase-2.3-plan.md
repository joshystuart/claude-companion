# Phase 2.3: Advanced Dashboard UI Enhancements Plan

## Overview
Transform the dashboard from a vertical agent list to horizontal agent tabs with integrated session controls, enhanced notification displays, improved agent identification, and detailed edit operation visualization.

## Goals
- Convert vertical agent list to horizontal tabbed interface
- Show actual command details in notification events requiring approval
- Split agent IDs into computer/agent hierarchy for better identification
- Display before/after content for edit operations
- Integrate agent controls directly into the header area
- Improve overall information hierarchy and visual clarity

## Current State Analysis
- **Agent Display**: Vertical list in left sidebar (20% width) with basic ID, status, session info
- **Session Controls**: Separate SessionControl component below agent list
- **Notifications**: Generic "Claude needs permission" messages without command details
- **Agent IDs**: Simple string display without parsing (e.g., `josh.stuart-ORG101311-b0f5ac05`)
- **Edit Operations**: Basic file path display without showing actual changes
- **Event Data Available**: `toolArgs` contains rich data including commands, file changes, etc.

## Phase 2.3 Implementation Plan

### 2.3.1: Agent Tabs & Header Integration
**Priority: High** | **Files: `Dashboard.tsx`, `components/AgentTabs.tsx`**

#### Agent Tab Bar Design
- **Layout**: Horizontal scrollable tab bar below main navigation
- **Tab Structure**: 
  - First tab: "All Agents" (shows combined feed from all agents)
  - Agent tabs: Display parsed agent name with status indicator
- **Tab Content**:
  - Computer name (e.g., "josh.stuart-ORG101311")
  - Agent ID (e.g., "b0f5ac05") 
  - Status dot (green/yellow/red) with last seen time
  - Active event count badge

#### Session Controls Integration
- **Location**: Right side of header bar, contextual to selected agent
- **Responsive Behavior**: 
  - Desktop: Inline with tab bar
  - Mobile: Collapsible dropdown
- **Control Buttons**:
  - Emergency Interrupt (🛑) - Most prominent
  - Continue/Stop/Inject Context - Secondary actions

#### Agent ID Parsing System
```typescript
interface ParsedAgentId {
  computer: string;    // "josh.stuart-ORG101311"
  agentId: string;     // "b0f5ac05"
  original: string;    // Full original ID
}

function parseAgentId(id: string): ParsedAgentId {
  // Parse pattern: computer-agent or fallback to full ID
  const lastDashIndex = id.lastIndexOf('-');
  if (lastDashIndex > 0 && id.length - lastDashIndex <= 9) {
    return {
      computer: id.substring(0, lastDashIndex),
      agentId: id.substring(lastDashIndex + 1),
      original: id
    };
  }
  return { computer: id, agentId: '', original: id };
}
```

### 2.3.2: Enhanced Notification Event Cards
**Priority: High** | **Files: `components/event-cards/NotificationEventCard.tsx`**

#### Approval-Required Notifications
- **Card Design**: Distinct styling with approval urgency (orange/amber theme)
- **Content Structure**:
  - **Header**: "Approval Required" with risk level badge
  - **Command Display**: 
    ```typescript
    // For Bash commands
    "Claude wants to run: `npm install --save lodash`"
    
    // For file operations  
    "Claude wants to edit: src/components/Dashboard.tsx"
    
    // For web operations
    "Claude wants to fetch: https://api.github.com/repos/owner/repo"
    ```
- **Inline Approval Controls**: 
  - Quick approve/deny buttons directly on card
  - Expandable section for custom reason/feedback
  - Context injection capability

#### Command Detail Extraction
```typescript
function getCommandDetails(event: HookEvent): string {
  const { toolName, toolArgs } = event.data;
  
  switch (toolName?.toLowerCase()) {
    case 'bash':
      return `run: \`${toolArgs?.command || 'unknown command'}\``;
    case 'edit':
    case 'multiedit':
      return `edit: ${toolArgs?.file_path || 'unknown file'}`;
    case 'webfetch':
      return `fetch: ${toolArgs?.url || 'unknown URL'}`;
    case 'websearch':
      return `search: "${toolArgs?.query || 'unknown query'}"`;
    default:
      return `use ${toolName || 'unknown tool'}`;
  }
}
```

### 2.3.3: Edit Operation Before/After Display
**Priority: Medium** | **Files: `components/event-cards/EditEventCard.tsx`**

#### Enhanced Edit Visualization
- **Card Layout**: Split-pane or tabbed view showing changes
- **Content Display**:
  - **Before Section**: Original content with line numbers
  - **After Section**: Modified content with highlighted changes
  - **Diff View**: Side-by-side or unified diff format
- **Data Extraction**:
  ```typescript
  // For Edit tool
  const oldString = toolArgs?.old_string;
  const newString = toolArgs?.new_string;
  const filePath = toolArgs?.file_path;
  
  // For MultiEdit tool
  const edits = toolArgs?.edits || [];
  const editCount = edits.length;
  ```

#### Diff Display Component
- **Syntax Highlighting**: Use syntax highlighting based on file extension
- **Change Indicators**: Color-coded additions/deletions/modifications
- **Collapsible Sections**: Large changes can be collapsed/expanded
- **Context Lines**: Show surrounding context for better understanding

### 2.3.4: Advanced UX Improvements
**Priority: Medium** | **Files: Various component files**

#### Smart Event Grouping
- **Sequential Operations**: Group related file operations (read → edit → write)
- **Batch Operations**: Combine multiple edits to same file
- **Session Boundaries**: Clear visual separation between different work sessions

#### Enhanced Visual Hierarchy
- **Priority-Based Layout**: Critical approval events get prominent placement
- **Contextual Information**: Show relevant context (current directory, recent commands)
- **Progressive Disclosure**: Details expand on demand, summary view by default

#### Mobile-First Responsive Design
- **Tab Scrolling**: Horizontal scroll for many agents on mobile
- **Stacked Controls**: Agent controls stack vertically on narrow screens
- **Touch Interactions**: Proper touch targets and swipe gestures

## Detailed Implementation Strategy

### Phase 2.3.1: Header & Tabs (2-3 sessions)
1. **Create AgentTabs component** with horizontal scrolling
2. **Implement agent ID parsing** utility functions
3. **Integrate session controls** into header area
4. **Update Dashboard layout** to use new tab system
5. **Add responsive behavior** for mobile devices

### Phase 2.3.2: Notification Enhancement (2 sessions)
1. **Create NotificationEventCard** component
2. **Implement command detail extraction** from toolArgs
3. **Add inline approval controls** with better UX
4. **Update event routing** to use specialized notification cards

### Phase 2.3.3: Edit Operation Display (2 sessions)
1. **Create EditEventCard** with before/after views
2. **Implement diff visualization** component
3. **Add syntax highlighting** for code files
4. **Handle MultiEdit operations** with multiple changes

### Phase 2.3.4: UX Polish (1-2 sessions)
1. **Implement smart event grouping** algorithms
2. **Add enhanced visual hierarchy** throughout dashboard
3. **Optimize mobile experience** with touch-friendly interactions
4. **Add loading states and animations** for better feedback

## Advanced Features for Future Consideration

### Real-Time Collaboration Indicators
- Show when multiple agents are active simultaneously
- Visual indicators for agent interactions and dependencies
- Conflict resolution UI for competing operations

### Customizable Dashboard Layouts
- User preferences for tab arrangement and grouping
- Customizable event card layouts and information density
- Saved filter and view configurations

### Advanced Search and Filtering
- Full-text search across event history and agent activities
- Temporal filtering (last hour, today, this session)
- Smart suggestions based on recent activity patterns

### Performance Monitoring Integration
- Resource usage indicators for active agents
- Performance impact visualization for operations
- Historical performance trending

## Success Criteria
- [ ] Agent list converted to horizontal tabs with computer/agent ID parsing
- [ ] Session controls integrated into header area
- [ ] Notification events show actual command details requiring approval
- [ ] Inline approval controls on notification cards
- [ ] Edit operations display before/after content with diff visualization
- [ ] Mobile-responsive design maintained throughout
- [ ] All existing functionality preserved and enhanced
- [ ] Improved information hierarchy and visual clarity
- [ ] Smart event grouping for related operations

## Risk Mitigation
- **Data Migration**: Ensure existing event data remains compatible
- **Performance Impact**: Monitor rendering performance with complex diffs
- **Mobile Usability**: Extensive testing on various mobile devices
- **Accessibility**: Maintain keyboard navigation and screen reader support

## Estimated Timeline
- **Phase 2.3.1**: 2-3 development sessions
- **Phase 2.3.2**: 2 development sessions  
- **Phase 2.3.3**: 2 development sessions
- **Phase 2.3.4**: 1-2 development sessions
- **Total**: 7-9 development sessions

This plan significantly enhances the dashboard's usability while maintaining all existing functionality and preparing for future advanced features.