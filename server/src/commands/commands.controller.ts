import { Controller, Get, Post, Put, Body, Param, Logger, HttpCode, HttpStatus } from '@nestjs/common';
import { CommandsService } from './commands.service';
import { CreateCommandDto } from './dto/create-command.dto';
import { CompleteCommandDto } from './dto/complete-command.dto';
import { RemoteCommand } from '../libs/types';

@Controller('api/commands')
export class CommandsController {
  private readonly logger = new Logger(CommandsController.name);

  constructor(private readonly commandsService: CommandsService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createCommand(@Body() createCommandDto: CreateCommandDto): Promise<RemoteCommand> {
    this.logger.log(`Creating ${createCommandDto.type} command for agent ${createCommandDto.agentId}`);
    return this.commandsService.createCommand(createCommandDto);
  }

  @Get(':agentId')
  async getPendingCommands(@Param('agentId') agentId: string): Promise<RemoteCommand[]> {
    this.logger.debug(`Getting pending commands for agent ${agentId}`);
    return this.commandsService.getPendingCommandsForAgent(agentId);
  }

  @Put(':id/complete')
  @HttpCode(HttpStatus.OK)
  async completeCommand(
    @Param('id') commandId: string,
    @Body() completeDto: CompleteCommandDto,
  ): Promise<RemoteCommand> {
    this.logger.log(`Completing command ${commandId} with status ${completeDto.status}`);
    return this.commandsService.completeCommand(commandId, completeDto);
  }

  @Put(':id/processing')
  @HttpCode(HttpStatus.OK)
  async markAsProcessing(@Param('id') commandId: string): Promise<RemoteCommand> {
    this.logger.log(`Marking command ${commandId} as processing`);
    return this.commandsService.markCommandAsProcessing(commandId);
  }

  @Get()
  async getAllCommands(): Promise<RemoteCommand[]> {
    return this.commandsService.getAllCommands();
  }

  @Get('agent/:agentId')
  async getCommandsByAgent(@Param('agentId') agentId: string): Promise<RemoteCommand[]> {
    return this.commandsService.getCommandsByAgent(agentId);
  }
}