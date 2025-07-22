import { Module } from '@nestjs/common';
import { HooksController } from './hooks.controller';
import { HooksService } from './hooks.service';
import { EventsModule } from '../events/events.module';

@Module({
  imports: [EventsModule],
  controllers: [HooksController],
  providers: [HooksService],
})
export class HooksModule {}