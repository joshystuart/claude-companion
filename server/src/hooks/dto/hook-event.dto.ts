import { IsString, IsObject, IsDateString, IsIn, IsOptional } from 'class-validator';
import { Transform } from 'class-transformer';

export class HookEventDto {
  @IsString()
  agentId: string;

  @IsString()
  sessionId: string;

  @IsIn(['pre_tool_use', 'post_tool_use', 'stop', 'notification'])
  hookType: 'pre_tool_use' | 'post_tool_use' | 'stop' | 'notification';

  @IsDateString()
  timestamp: string;

  @IsObject()
  data: {
    toolName?: string;
    toolArgs?: any;
    result?: any;
    message?: string;
    rawInput?: any;
  };
}