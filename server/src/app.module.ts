import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { HooksModule } from './hooks/hooks.module';
import { EventsModule } from './events/events.module';
import { AuthModule } from './auth/auth.module';
import { CommandsModule } from './commands/commands.module';

@Module({
  imports: [
    // Configuration
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    
    // Rate limiting
    ThrottlerModule.forRoot({
      ttl: 60000, // 1 minute
      limit: 100, // 100 requests per minute per IP
    }),

    // Feature modules
    HooksModule,
    EventsModule,
    CommandsModule,
    AuthModule,
  ],
})
export class AppModule {}