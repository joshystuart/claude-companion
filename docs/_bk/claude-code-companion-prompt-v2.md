# Claude Code Companion - Project Setup Prompt

## Overview
Create a NestJS project called "claude-code-companion" that implements a real-time dashboard for monitoring Claude Code tasks remotely using Server-Sent Events (SSE). This system allows you to step away from your computer while Claude Code performs long-running tasks and monitor progress through a web-based dashboard accessible from any device.

## Core Architecture

The system should consist of:

- **NestJS Backend**: RESTful API with SSE endpoints for real-time streaming
- **Claude Code Service**: Wraps the Claude Code SDK as a subprocess
- **SSE Streaming**: Real-time one-way streaming of Claude Code output
- **Web Dashboard**: Accessible from any device for remote monitoring
- **Process Management**: Handle long-running tasks and status tracking

## Technical Requirements

### Dependencies
- `@nestjs/core` - NestJS framework core
- `@nestjs/common` - Common NestJS utilities
- `@nestjs/platform-express` - Express platform adapter
- `@nestjs/serve-static` - Static file serving
- `@nestjs/event-emitter` - Event-driven architecture
- `@anthropic-ai/claude-code` - Official Claude Code SDK
- `nest-typed-config` - Type-safe configuration management
- `js-yaml` - YAML configuration parsing
- `class-validator` - Configuration validation
- `class-transformer` - Configuration transformation
- `node-pty` - Better subprocess handling with PTY support
- `rxjs` - Reactive extensions for streaming
- `uuid` - Unique identifier generation

### Key Technologies
- **Server-Sent Events**: Real-time unidirectional communication
- **NestJS Guards**: Authentication and authorization
- **NestJS Interceptors**: Request/response transformation
- **RxJS Observables**: Reactive streaming patterns
- **YAML Configuration**: Environment-specific settings
- **Mobile Responsive Design**: Works on phones, tablets, and desktops

## Project Structure

```
claude-code-companion/
├── src/
│   ├── config/
│   │   ├── configuration.ts         # Configuration schema
│   │   ├── config.module.ts         # Configuration module
│   │   └── validation.schema.ts     # Joi validation schemas
│   ├── claude/
│   │   ├── claude.service.ts        # Claude Code SDK integration
│   │   ├── claude.module.ts         # Claude module
│   │   ├── dto/
│   │   │   ├── create-task.dto.ts   # Task creation DTO
│   │   │   └── task-status.dto.ts   # Task status DTO
│   │   └── interfaces/
│   │       └── task.interface.ts    # Task type definitions
│   ├── process/
│   │   ├── process.service.ts       # Process lifecycle management
│   │   ├── process.controller.ts    # Process REST endpoints
│   │   ├── process.gateway.ts       # SSE gateway
│   │   └── process.module.ts        # Process module
│   ├── auth/
│   │   ├── auth.service.ts          # Authentication logic
│   │   ├── auth.controller.ts       # Auth endpoints
│   │   ├── auth.guard.ts            # Authentication guard
│   │   ├── auth.module.ts           # Auth module
│   │   └── strategies/
│   │       └── basic.strategy.ts    # Basic auth strategy
│   ├── dashboard/
│   │   ├── dashboard.controller.ts  # Dashboard endpoints
│   │   └── dashboard.module.ts      # Dashboard module
│   ├── common/
│   │   ├── interceptors/
│   │   │   └── logging.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── decorators/
│   │       └── sse-stream.decorator.ts
│   ├── public/
│   │   ├── index.html               # Dashboard interface
│   │   ├── dashboard.js             # Client-side SSE handling
│   │   ├── styles.css               # Responsive styling
│   │   └── mobile.css               # Mobile-specific styles
│   ├── app.module.ts                # Root application module
│   └── main.ts                      # Application entry point
├── config/
│   ├── development.yaml             # Development configuration
│   ├── production.yaml              # Production configuration
│   ├── test.yaml                    # Test configuration
│   └── default.yaml                 # Default configuration
├── test/
│   ├── app.e2e-spec.ts
│   ├── claude.service.spec.ts
│   └── process.service.spec.ts
├── docker/
│   ├── Dockerfile
│   └── docker-compose.yml
├── scripts/
│   ├── setup.sh                     # Initial setup script
│   └── deploy.sh                    # Deployment script
├── nest-cli.json                    # NestJS CLI configuration
├── package.json
├── tsconfig.json
├── README.md
└── LICENSE
```

## Core Features to Implement

### 1. Configuration Management (`config/configuration.ts`)
- **Type-Safe Config**: Use nest-typed-config with class-validator
- **Environment-Specific**: YAML files per environment
- **Validation**: Runtime validation of configuration values
- **Hot Reloading**: Development-time config reloading

### 2. Claude Code Service (`claude/claude.service.ts`)
- **SDK Integration**: Proper authentication and configuration
- **Stream Handling**: Capture real-time output from Claude Code
- **Error Management**: Handle Claude Code failures and timeouts
- **Context Preservation**: Maintain conversation context across tasks

### 3. Process Management (`process/process.service.ts`)
- **Task Queue**: Manage multiple Claude Code processes
- **Status Tracking**: Running, completed, failed, queued states
- **Resource Monitoring**: CPU, memory usage per process
- **Cleanup**: Graceful shutdown and orphan process handling

### 4. SSE Gateway (`process/process.gateway.ts`)
- **Real-time Broadcasting**: Stream output to connected clients
- **Connection Management**: Handle client connections/disconnections
- **Message Types**: Define protocol for different message types
- **RxJS Integration**: Use observables for stream management

### 5. Web Dashboard (`public/index.html`, `public/dashboard.js`)
- **Live Output Display**: Real-time streaming of Claude Code output
- **Process List**: Show all running and completed tasks
- **Interactive Controls**: Start, stop, pause, resume tasks
- **Mobile Responsive**: Touch-friendly interface for mobile devices
- **Dark/Light Theme**: User preference toggle

### 6. Authentication (`auth/auth.guard.ts`)
- **NestJS Guards**: Declarative authentication
- **Basic Authentication**: Username/password protection
- **JWT Support**: Token-based authentication option
- **Rate Limiting**: Prevent abuse of the system

## Implementation Details

### Configuration Schema (`config/configuration.ts`)

```typescript
import { Type } from 'class-transformer';
import { IsNumber, IsString, IsBoolean, ValidateNested } from 'class-validator';

export class ServerConfig {
  @IsNumber()
  port: number = 3000;

  @IsString()
  host: string = '0.0.0.0';

  @IsBoolean()
  ssl: boolean = false;
}

export class ClaudeConfig {
  @IsString()
  apiKey: string;

  @IsString()
  model: string = 'claude-3-5-sonnet-20241022';

  @IsNumber()
  maxConcurrentTasks: number = 3;

  @IsNumber()
  taskTimeout: number = 3600000;
}

export class AuthConfig {
  @IsBoolean()
  enabled: boolean = true;

  @IsString()
  username: string;

  @IsString()
  password: string;

  @IsNumber()
  sessionTimeout: number = 86400000;
}

export class Configuration {
  @ValidateNested()
  @Type(() => ServerConfig)
  server: ServerConfig;

  @ValidateNested()
  @Type(() => ClaudeConfig)
  claude: ClaudeConfig;

  @ValidateNested()
  @Type(() => AuthConfig)
  auth: AuthConfig;
}
```

### YAML Configuration (`config/development.yaml`)

```yaml
server:
  port: 3000
  host: "0.0.0.0"
  ssl: false

claude:
  apiKey: "${ANTHROPIC_API_KEY}"
  model: "claude-3-5-sonnet-20241022"
  maxConcurrentTasks: 3
  taskTimeout: 3600000

auth:
  enabled: true
  username: "${AUTH_USERNAME:admin}"
  password: "${AUTH_PASSWORD}"
  sessionTimeout: 86400000

logging:
  level: "debug"
  enableConsole: true
  enableFile: true
  filename: "logs/app.log"
```

### SSE Controller (`process/process.controller.ts`)

```typescript
import { Controller, Sse, MessageEvent, UseGuards } from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ProcessService } from './process.service';
import { AuthGuard } from '../auth/auth.guard';

@Controller('api/process')
@UseGuards(AuthGuard)
export class ProcessController {
  constructor(private readonly processService: ProcessService) {}

  @Sse('stream/:taskId')
  streamTask(@Param('taskId') taskId: string): Observable<MessageEvent> {
    return this.processService.getTaskStream(taskId).pipe(
      map(data => ({
        type: 'process_output',
        data: JSON.stringify({
          taskId,
          timestamp: new Date().toISOString(),
          ...data
        })
      }))
    );
  }

  @Sse('stream/all')
  streamAllTasks(): Observable<MessageEvent> {
    return this.processService.getAllTasksStream().pipe(
      map(data => ({
        type: 'system_status',
        data: JSON.stringify(data)
      }))
    );
  }

  @Post('tasks')
  async createTask(@Body() createTaskDto: CreateTaskDto) {
    return this.processService.createTask(createTaskDto);
  }

  @Get('tasks')
  async getTasks() {
    return this.processService.getAllTasks();
  }

  @Get('tasks/:id')
  async getTask(@Param('id') id: string) {
    return this.processService.getTask(id);
  }

  @Delete('tasks/:id')
  async stopTask(@Param('id') id: string) {
    return this.processService.stopTask(id);
  }
}
```

### Client-Side SSE Implementation (`public/dashboard.js`)

```javascript
class ClaudeCodeDashboard {
  constructor() {
    this.eventSources = new Map();
    this.tasks = new Map();
    this.initializeEventSource();
    this.setupEventListeners();
  }

  initializeEventSource() {
    // Stream all tasks
    const allTasksSource = new EventSource('/api/process/stream/all');
    
    allTasksSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.updateSystemStatus(data);
    };

    allTasksSource.onerror = (error) => {
      console.error('SSE connection error:', error);
      this.handleReconnection();
    };

    this.eventSources.set('all', allTasksSource);
  }

  subscribeToTask(taskId) {
    if (this.eventSources.has(taskId)) return;

    const taskSource = new EventSource(`/api/process/stream/${taskId}`);
    
    taskSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.updateTaskOutput(data);
    };

    taskSource.onerror = (error) => {
      console.error(`Task ${taskId} stream error:`, error);
    };

    this.eventSources.set(taskId, taskSource);
  }

  updateTaskOutput(data) {
    const outputElement = document.getElementById(`task-${data.taskId}-output`);
    if (outputElement) {
      outputElement.innerHTML += `<div class="output-line">${data.output}</div>`;
      outputElement.scrollTop = outputElement.scrollHeight;
    }
  }

  handleReconnection() {
    setTimeout(() => {
      this.initializeEventSource();
    }, 5000); // Retry after 5 seconds
  }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  new ClaudeCodeDashboard();
});
```

## NestJS Module Structure

### App Module (`app.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';
import { ConfigModule } from './config/config.module';
import { ClaudeModule } from './claude/claude.module';
import { ProcessModule } from './process/process.module';
import { AuthModule } from './auth/auth.module';
import { DashboardModule } from './dashboard/dashboard.module';

@Module({
  imports: [
    ConfigModule,
    EventEmitterModule.forRoot(),
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
      exclude: ['/api*'],
    }),
    ClaudeModule,
    ProcessModule,
    AuthModule,
    DashboardModule,
  ],
})
export class AppModule {}
```

### Configuration Module (`config/config.module.ts`)

```typescript
import { Module } from '@nestjs/common';
import { TypedConfigModule, dotenvLoader, selectConfig } from 'nest-typed-config';
import { Configuration } from './configuration';
import * as yaml from 'js-yaml';
import { readFileSync } from 'fs';
import { join } from 'path';

const yamlLoader = selectConfig((path) => {
  const configPath = join(process.cwd(), 'config', `${process.env.NODE_ENV || 'development'}.yaml`);
  const config = yaml.load(readFileSync(configPath, 'utf8')) as Record<string, any>;
  return config;
});

@Module({
  imports: [
    TypedConfigModule.forRoot({
      schema: Configuration,
      load: [dotenvLoader, yamlLoader],
    }),
  ],
})
export class ConfigModule {}
```

## Security Considerations

### NestJS Guards and Interceptors
- **Authentication Guards**: Protect all API endpoints
- **Rate Limiting**: Use NestJS throttler module
- **Input Validation**: Class-validator for all DTOs
- **CORS Configuration**: Proper cross-origin settings

### Process Security
- **Sandbox Claude Code**: Use proper process isolation
- **Resource Limits**: CPU and memory constraints
- **Error Sanitization**: Prevent information leakage
- **Audit Logging**: Track all operations

## Environment Setup

### Development Configuration (`config/development.yaml`)

```yaml
server:
  port: 3000
  host: "0.0.0.0"
  ssl: false

claude:
  apiKey: "${ANTHROPIC_API_KEY}"
  model: "claude-3-5-sonnet-20241022"
  maxConcurrentTasks: 2
  taskTimeout: 1800000

auth:
  enabled: false  # Disabled for development
  username: "dev"
  password: "dev"

logging:
  level: "debug"
  enableConsole: true
  enableFile: false
```

### Production Configuration (`config/production.yaml`)

```yaml
server:
  port: ${PORT:3000}
  host: "0.0.0.0"
  ssl: true

claude:
  apiKey: "${ANTHROPIC_API_KEY}"
  model: "claude-3-5-sonnet-20241022"
  maxConcurrentTasks: 5
  taskTimeout: 3600000

auth:
  enabled: true
  username: "${AUTH_USERNAME}"
  password: "${AUTH_PASSWORD}"
  sessionTimeout: 3600000

logging:
  level: "info"
  enableConsole: false
  enableFile: true
  filename: "/var/log/claude-companion/app.log"
```

## Installation & Setup Instructions

### Prerequisites
- Node.js 18+ installed
- Claude Code CLI installed and authenticated
- Valid Anthropic API key

### Quick Start
```bash
# 1. Create new NestJS project
npx @nestjs/cli new claude-code-companion
cd claude-code-companion

# 2. Install additional dependencies
npm install @anthropic-ai/claude-code nest-typed-config js-yaml class-validator class-transformer node-pty rxjs uuid

# 3. Install dev dependencies
npm install --save-dev @types/js-yaml

# 4. Create directory structure
mkdir -p src/{config,claude,process,auth,dashboard,common} config public

# 5. Create configuration files
touch config/{development,production,test,default}.yaml

# 6. Set environment variables
export ANTHROPIC_API_KEY=your-api-key
export AUTH_USERNAME=admin
export AUTH_PASSWORD=secure-password

# 7. Start the application
npm run start:dev
```

## Usage Examples

### Starting the Application
```bash
# Development mode with hot reload
npm run start:dev

# Production mode
npm run start:prod

# With specific environment
NODE_ENV=production npm run start:prod
```

### API Endpoints
```bash
# Create a new task
curl -X POST http://localhost:3000/api/process/tasks \
  -H "Content-Type: application/json" \
  -d '{"prompt": "Refactor this codebase", "workingDir": "/path/to/project"}'

# Get all tasks
curl http://localhost:3000/api/process/tasks

# Stream task output (SSE)
curl -H "Accept: text/event-stream" http://localhost:3000/api/process/stream/task-id

# Stream all tasks (SSE)
curl -H "Accept: text/event-stream" http://localhost:3000/api/process/stream/all
```

### Client-Side SSE Connection
```javascript
// Connect to task stream
const taskStream = new EventSource('/api/process/stream/task-123');
taskStream.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Task output:', data);
};

// Connect to system stream
const systemStream = new EventSource('/api/process/stream/all');
systemStream.onmessage = (event) => {
  const status = JSON.parse(event.data);
  console.log('System status:', status);
};
```

## Docker Deployment

### Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY .. .
RUN npm run build

EXPOSE 3000

CMD ["npm", "run", "start:prod"]
```

### Docker Compose (`docker-compose.yml`)
```yaml
version: '3.8'
services:
  claude-companion:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - AUTH_USERNAME=${AUTH_USERNAME}
      - AUTH_PASSWORD=${AUTH_PASSWORD}
    volumes:
      - ./logs:/app/logs
      - ./projects:/app/projects
      - ./config:/app/config:ro
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

## Testing Strategy

### Unit Tests
```typescript
// claude.service.spec.ts
describe('ClaudeService', () => {
  let service: ClaudeService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [ClaudeService],
    }).compile();

    service = module.get<ClaudeService>(ClaudeService);
  });

  it('should create a task', async () => {
    const task = await service.createTask({
      prompt: 'test prompt',
      workingDir: '/tmp'
    });
    expect(task).toBeDefined();
    expect(task.id).toBeDefined();
  });
});
```

### Integration Tests
```typescript
// app.e2e-spec.ts
describe('AppController (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  it('/api/process/tasks (POST)', () => {
    return request(app.getHttpServer())
      .post('/api/process/tasks')
      .send({ prompt: 'test', workingDir: '/tmp' })
      .expect(201);
  });
});
```

## Development Guidelines

### NestJS Best Practices
- **Modular Architecture**: Separate concerns into modules
- **Dependency Injection**: Use NestJS DI container
- **Guards and Interceptors**: Cross-cutting concerns
- **DTOs and Validation**: Input validation and transformation
- **Exception Filters**: Centralized error handling

### Code Quality
- **TypeScript**: Full type safety throughout
- **ESLint + Prettier**: Code formatting and linting
- **Unit Tests**: Test all services and controllers
- **E2E Tests**: Integration testing

## Monitoring & Health Checks

### Health Check Endpoint
```typescript
@Controller('health')
export class HealthController {
  @Get()
  checkHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
    };
  }
}
```

### Logging Integration
```typescript
import { Logger } from '@nestjs/common';

@Injectable()
export class ProcessService {
  private readonly logger = new Logger(ProcessService.name);

  async createTask(createTaskDto: CreateTaskDto) {
    this.logger.log(`Creating task: ${createTaskDto.prompt}`);
    // Implementation
  }
}
```

## Deployment Checklist

- [ ] Configuration files created for all environments
- [ ] Environment variables configured
- [ ] SSL certificates installed (production)
- [ ] Health check endpoint implemented
- [ ] Logging configured
- [ ] Docker images built and tested
- [ ] Authentication properly configured
- [ ] Performance testing completed
- [ ] Security audit performed

## Future Enhancements

### Advanced Features
- **WebSocket Fallback**: For bidirectional communication when needed
- **Multi-tenant Support**: Separate workspaces per user
- **Task Scheduling**: Cron-like task automation
- **Plugin System**: Extensible architecture
- **Advanced Analytics**: Task performance metrics

### Scalability
- **Microservices**: Break into smaller services
- **Message Queues**: Redis or RabbitMQ integration
- **Load Balancing**: Multiple instance support
- **Database Integration**: Persistent task history
- **Kubernetes**: Container orchestration

---

**Note**: This NestJS-based implementation provides a more robust, scalable foundation using Server-Sent Events for real-time communication. The modular architecture and type-safe configuration make it easier to maintain and extend.