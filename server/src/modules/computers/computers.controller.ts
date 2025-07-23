import { Controller, Get, Param, Post, Body, Put } from '@nestjs/common';
import { StorageService } from '../storage/storage.service';
import { Computer } from '../storage/entities/computer.entity';

@Controller('api/computers')
export class ComputersController {
  constructor(private readonly storageService: StorageService) {}

  @Get()
  getAllComputers(): Computer[] {
    return this.storageService.getAllComputers();
  }

  @Get(':id')
  getComputer(@Param('id') id: string): Computer | null {
    const computer = this.storageService.getComputer(id);
    return computer || null;
  }

  @Get(':id/agents')
  getAgentsByComputer(@Param('id') computerId: string) {
    return this.storageService.getAgentsByComputer(computerId);
  }

  @Post()
  registerComputer(@Body() computerData: Omit<Computer, 'agents'>) {
    return this.storageService.registerComputer(computerData);
  }
}