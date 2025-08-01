import { IsEnum, IsOptional, IsString } from 'class-validator';

export class CompleteCommandDto {
  @IsEnum(['completed', 'expired'])
  status: 'completed' | 'expired';

  @IsOptional()
  @IsString()
  result?: string;
}