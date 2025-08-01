import { describe, test, expect } from '@jest/globals';

// Mock the dependencies that have ES module issues
jest.mock('chalk', () => ({
  default: {
    gray: (text: string) => text,
  }
}));

jest.mock('ora', () => ({
  default: () => ({
    start: () => ({ text: '', succeed: () => {}, fail: () => {}, warn: () => {} })
  })
}));

// Import the functions after mocking
const { isAFKHook, mergeHooks, removeAFKHooks } = require('../installer');

describe('Hook Management Functions', () => {
  const sampleAFKHooks = {
    PreToolUse: [{
      hooks: [{
        type: "command",
        command: 'node "/path/to/pre-tool-use.js" "http://localhost:3000" "auto-generated" "token"'
      }]
    }],
    PostToolUse: [{
      hooks: [{
        type: "command", 
        command: 'node "/path/to/post-tool-use.js" "http://localhost:3000" "auto-generated" "token"'
      }]
    }]
  };

  const sampleExistingHooks = {
    PreToolUse: [{
      hooks: [{
        type: "command",
        command: 'some-other-tool --pre-hook'
      }]
    }],
    Stop: [{
      hooks: [{
        type: "command",
        command: 'cleanup-script.sh'
      }]
    }]
  };

  describe('isAFKHook', () => {
    test('should identify AFK hooks correctly', () => {
      expect(isAFKHook('node "/path/to/pre-tool-use.js"')).toBe(true);
      expect(isAFKHook('node "/path/to/post-tool-use.js"')).toBe(true);  
      expect(isAFKHook('node "/path/to/stop.js"')).toBe(true);
      expect(isAFKHook('node "/path/to/notification.js"')).toBe(true);
      expect(isAFKHook('some-other-command')).toBe(false);
    });
  });

  describe('mergeHooks', () => {
    test('should merge AFK hooks with empty existing hooks', () => {
      const result = mergeHooks({}, sampleAFKHooks);
      expect(result).toEqual(sampleAFKHooks);
    });

    test('should merge AFK hooks with existing hooks', () => {
      const result = mergeHooks(sampleExistingHooks, sampleAFKHooks);
      
      // Should have PreToolUse with both existing and AFK hooks
      expect(result.PreToolUse).toHaveLength(2);
      expect(result.PreToolUse[0].hooks[0].command).toBe('some-other-tool --pre-hook');
      expect(result.PreToolUse[1].hooks[0].command).toContain('pre-tool-use.js');
      
      // Should have PostToolUse with only AFK hooks (no existing)
      expect(result.PostToolUse).toHaveLength(1);
      expect(result.PostToolUse[0].hooks[0].command).toContain('post-tool-use.js');
      
      // Should preserve existing Stop hooks
      expect(result.Stop).toHaveLength(1);
      expect(result.Stop[0].hooks[0].command).toBe('cleanup-script.sh');
    });

    test('should not duplicate AFK hooks when merging', () => {
      const existingWithAFK = {
        PreToolUse: [{
          hooks: [{
            type: "command",
            command: 'node "/path/to/pre-tool-use.js" "old-config"'
          }]
        }]
      };
      
      const result = mergeHooks(existingWithAFK, sampleAFKHooks);
      
      // Should only have one PreToolUse entry (the new AFK hook, old one removed)
      expect(result.PreToolUse).toHaveLength(1);
      expect(result.PreToolUse[0].hooks[0].command).toContain('auto-generated');
    });
  });

  describe('removeAFKHooks', () => {
    test('should remove only AFK hooks', () => {
      const mixedHooks = {
        PreToolUse: [{
          hooks: [
            { type: "command", command: 'some-other-tool --pre-hook' },
            { type: "command", command: 'node "/path/to/pre-tool-use.js"' }
          ]
        }],
        Stop: [{
          hooks: [
            { type: "command", command: 'cleanup-script.sh' }
          ]
        }]
      };
      
      const result = removeAFKHooks(mixedHooks);
      
      // Should keep non-AFK hooks
      expect(result.PreToolUse[0].hooks).toHaveLength(1);
      expect(result.PreToolUse[0].hooks[0].command).toBe('some-other-tool --pre-hook');
      expect(result.Stop[0].hooks[0].command).toBe('cleanup-script.sh');
    });

    test('should return undefined when only AFK hooks exist', () => {
      const onlyAFKHooks = {
        PreToolUse: [{
          hooks: [{ type: "command", command: 'node "/path/to/pre-tool-use.js"' }]
        }]
      };
      
      const result = removeAFKHooks(onlyAFKHooks);
      expect(result).toBeUndefined();
    });

    test('should handle empty or invalid input', () => {
      expect(removeAFKHooks(null)).toBeNull();
      expect(removeAFKHooks(undefined)).toBeUndefined();
      expect(removeAFKHooks({})).toBeUndefined();
    });
  });
});