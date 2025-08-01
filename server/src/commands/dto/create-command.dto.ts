import { IsString, IsEnum, IsOptional, IsObject } from 'class-validator';

export class CreateCommandDto {
  @IsString()
  agentId: string;

  @IsString()
  sessionId: string;

  @IsEnum(['approve', 'deny', 'context', 'continue', 'stop', 'interrupt'])
  type: 'approve' | 'deny' | 'context' | 'continue' | 'stop' | 'interrupt';

  @IsOptional()
  @IsObject()
  payload?: {
    reason?: string;
    feedback?: string;
    instructions?: string;
  };

  @IsOptional()
  @IsString()
  relatedEventId?: string;
}