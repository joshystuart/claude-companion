/**
 * Agent-related utility functions for parsing and displaying agent information
 */

export interface ParsedAgentId {
  computer: string;    // "josh.stuart-ORG101311"
  agentId: string;     // "b0f5ac05"
  original: string;    // Full original ID
}

/**
 * Parse agent ID into computer and agent components
 * Assumes format: computer-agentId where agentId is typically 8 characters or less
 */
export function parseAgentId(id: string): ParsedAgentId {
  // Find the last dash that could separate computer from agent ID
  const lastDashIndex = id.lastIndexOf('-');
  
  // Check if we have a dash and the potential agent ID part is reasonable length (<=9 chars)
  if (lastDashIndex > 0 && id.length - lastDashIndex <= 9) {
    const potentialAgentId = id.substring(lastDashIndex + 1);
    const potentialComputer = id.substring(0, lastDashIndex);
    
    // Basic validation: agent ID should be alphanumeric
    if (/^[a-zA-Z0-9]+$/.test(potentialAgentId) && potentialComputer.length > 0) {
      return {
        computer: potentialComputer,
        agentId: potentialAgentId,
        original: id
      };
    }
  }
  
  // Fallback: treat entire ID as computer name
  return { 
    computer: id, 
    agentId: '', 
    original: id 
  };
}

/**
 * Format agent display name for tabs
 */
export function formatAgentDisplayName(id: string): { primary: string; secondary: string } {
  const parsed = parseAgentId(id);
  
  if (parsed.agentId) {
    return {
      primary: parsed.computer,
      secondary: parsed.agentId
    };
  }
  
  return {
    primary: parsed.computer,
    secondary: ''
  };
}

/**
 * Get shortened agent name for compact display
 */
export function getShortAgentName(id: string, maxLength: number = 20): string {
  const parsed = parseAgentId(id);
  
  if (parsed.agentId) {
    const combined = `${parsed.computer}-${parsed.agentId}`;
    if (combined.length <= maxLength) {
      return combined;
    }
    
    // Try to show computer + shortened agent ID
    const availableForComputer = maxLength - parsed.agentId.length - 1; // -1 for dash
    if (availableForComputer > 3) {
      return `${parsed.computer.substring(0, availableForComputer)}-${parsed.agentId}`;
    }
    
    // Fall back to just agent ID if computer is too long
    return parsed.agentId;
  }
  
  // No agent ID, just truncate the computer name
  return parsed.computer.length > maxLength 
    ? `${parsed.computer.substring(0, maxLength - 3)}...`
    : parsed.computer;
}