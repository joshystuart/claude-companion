# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Claude Code Companion is a remote monitoring and control system for Claude Code sessions that leverages Claude's native hooks system. It's a three-package monorepo structure designed to provide real-time visibility and control over AI-powered development workflows from any device.

## Architecture

### Three-Package Structure
- **./agent**: NPM-installable hook installer that integrates with Claude Code
- **./server**: NestJS API server with real-time streaming capabilities  
- **./client**: React SPA dashboard for monitoring and controlling sessions

### Key Components
- **Hooks Integration**: Uses Claude Code's hooks system (PreToolUse, PostToolUse, Stop, Notification) for monitoring and control
- **Communication Flow**: Agent → Server (HTTP POST), Server → Client (SSE), Client → Server (REST API)
- **Remote Commands**: Approval, context injection, and session control capabilities

## Current State

This is an early-stage project with only documentation files present. The actual package implementations are not yet created.

## Development Commands

Since no package.json or build configuration exists yet, standard development commands will need to be established once the packages are implemented. Based on the .gitignore file, this project expects:

- Node.js/npm ecosystem
- Build output in `dist/` or `build/` directories  
- NestJS CLI usage (`.nest-cli.json` ignored)
- CDK for infrastructure (`cdk.out/` ignored)

## Key Implementation Notes

- Uses Claude Code hooks system as the core integration mechanism
- Command queue architecture enables bidirectional communication without wrapping Claude's process
- Mobile-responsive design required for remote monitoring use case
- Authentication and multi-agent coordination capabilities needed
- Hook execution must be <2 seconds to avoid slowing Claude Code

## Documentation Structure

Primary documentation is in `docs/claude-code-companion.md` which contains the complete project specification, architecture details, and development roadmap.


## CRITICAL WORKFLOW - ALWAYS FOLLOW THIS!

### Research → Plan → Implement
**NEVER JUMP STRAIGHT TO CODING!** Always follow this sequence:
1. **Research**: Explore the codebase, understand existing patterns
2. **Plan**: Create a detailed implementation plan and verify it with me
3. **Implement**: Execute the plan with validation checkpoints

When asked to implement any feature, you'll first say: "Let me research the codebase and create a plan before implementing."

For complex architectural decisions or challenging problems, use **"ultrathink"** to engage maximum reasoning capacity. Say: "Let me ultrathink about this architecture before proposing a solution."

### USE MULTIPLE AGENTS!
*Leverage subagents aggressively* for better results:

* Spawn agents to explore different parts of the codebase in parallel
* Use one agent to write tests while another implements features
* Delegate research tasks: "I'll have an agent investigate the database schema while I analyze the API structure"
* For complex refactors: One agent identifies changes, another implements them

Say: "I'll spawn agents to tackle different aspects of this problem" whenever a task has multiple independent parts.

### Reality Checkpoints
**Stop and validate** at these moments:
- After implementing a complete feature
- Before starting a new major component
- When something feels wrong
- Before declaring "done"
- **WHEN VALIDATION FAILS WITH ERRORS** ❌

### CRITICAL: Validation Failures Are BLOCKING
**When validation reports ANY issues (exit code non-zero), you MUST:**
1. **STOP IMMEDIATELY** - Do not continue with other tasks
2. **FIX ALL ISSUES** - Address every ❌ issue until everything is GREEN
3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5. **NEVER IGNORE** - There are NO warnings, only requirements

**Recovery Protocol:**
- When interrupted by a validation failure, maintain awareness of your original task
- After fixing all issues and verifying the fix, continue where you left off
- Use the todo list to track both the fix and your original task

## NodeJS and NestJS Specific Rules

### FORBIDDEN - NEVER DO THESE:
- **NO any type** - use proper TypeScript types!
- **NO console.log()** in production code - use proper logging!
- **NO** keeping old and new code together
- **NO** migration functions or compatibility layers
- **NO** versioned function names (processV2, handleNew)
- **NO** custom exception hierarchies without good reason
- **NO** TODOs in final code
- **NO** direct database calls outside of DAOs
- **NO** business logic in controllers
- **NO** excessive services (prefer use-case pattern)
- **NO** usage of process.env anywhere, ever! Use the nestjs-typed-config approach instead.

> **AUTOMATED ENFORCEMENT**: ESLint and validation hooks will BLOCK commits that violate these rules.  
> When you see `❌ VALIDATION ERROR`, you MUST fix it immediately!

### Required Standards:
- **Delete** old code when replacing it
- **Meaningful names**: `userId` not `id`, `createUserDto` not `dto`
- **Early returns** to reduce nesting
- **Proper dependency injection**: Use NestJS DI container
- **DTOs for validation**: All input validation through class-validator DTOs
- **Use-case pattern**: Controllers → Use-Cases → DAOs, minimize services
- **Proper error handling**: Use NestJS exception filters and built-in exceptions
- **Type safety**: Leverage TypeScript fully, no `any` types
- **Async/await**: Use promises properly, handle errors
- **Use-case composition**: Use-cases can call other use-cases for abstraction
- **Config**: if any config is needed, never use `process.env` directly. Use the `nestjs-typed-config` library to manage configurations.

### Project Structure Adherence:
```
api/
├── src/                # Main application code
│   ├── config/         # Environment specific configurations
│   ├── interactors/    # Use cases and high level business logic
│   ├── libs/           # Lower level libraries and common functionality
│   └── test/           # Unit test helpers and fixtures
```

## Implementation Standards

### Our code is complete when:
- Code is formatted (`npm run format`)
- All linters pass with zero issues (`npm run lint`)
- All tests pass (`npm run test`)
- Feature works end-to-end
- Old code is deleted
- JSDoc on all exported functions/classes
- Proper TypeScript types (no `any`)

### Survey Before Implementing - CRITICAL!
**Before writing ANY new code:**
1. **Search existing patterns**: Look for similar functionality in the codebase
2. **Check shared libraries**: Review `libs/` directories for reusable utilities
3. **Use established utilities**: Prefer existing helpers over new implementations
4. **Follow existing conventions and patterns**: Match patterns used elsewhere
5. **Check fixture builders**: Look in `/tests` directories before creating test data

### Testing Strategy
- **Unit tests**: Jest with comprehensive coverage
- **Integration tests**: Database and external service mocking
- **Functional/E2E tests**: Full API testing with `npm run test:e2e`, do not mock!
- **Test permissions**: Create, modify, and run tests without asking
- **Update existing tests**: Modify tests to match code changes
- **Complex business logic**: Write tests first
- **Simple CRUD**: Write tests after
- **Hot paths**: Add performance tests

### NestJS Architecture Patterns
- **Controllers**: Handle HTTP requests, delegate to use-cases
- **Use-Cases / Interactors**: Business logic, orchestrate DAOs and other use-cases
- **DAOs**: Data access layer, Prisma operations
- **Services**: Keep to minimum, only for framework-level concerns
- **DTOs**: Input validation with `class-validator` and `class-transformer`
- **Guards**: Authentication and authorization
- **Interceptors**: Cross-cutting concerns (logging, transforms)
- **Filters**: Exception handling
- **Pipes**: Validation and transformation
- **Modules**: Organize related components

## Config
Never use `process.env` directly. Use the `nestjs-typed-config` library to manage configurations.

The way this works is that you create a config dto that defines all configurable properties, and then you inject this config into your services or controllers.

### Configuration Example

#### Setup the Config DTO
We create the configuration as a DTO that will be used to validate and transform the environment variables. The `nestjs-typed-config` library will handle loading these values from the environment files into these DTOs.

eg: `stripe.config.ts`

```typescript
import { IsOptional, IsString } from 'class-validator';

export class StripeConfig {
  @IsString()
  @IsOptional()
  public readonly apiKey?: string;

  @IsString()
  @IsOptional()
  public readonly webhookSecret?: string;
}
```

Then attach it to the main App config DTO: `app.config.ts`

```typescript
import { StripeConfig } from '@dismissible/stripe';

export class AppConfig {
    @IsNumber()
    @Type(() => Number)
    public readonly port!: number;
    
    // Add the Stripe configuration to the AppConfig
    @ValidateNested()
    @Type(() => StripeConfig)
    public readonly stripe!: StripeConfig;
}
```

The config values are then defined within the environment files in `api/src/config/`:

Filename: `api/src/config/.env.local.env`

```yaml
port: 3000

stripe:
  apiKey: 'your-stripe-api-key'
  webhookSecret: 'your-stripe-webhook-secret'
```

#### Consuming the Stripe Configuration
Consuming the Stripe configuration in a service or controller is done via dependency injection. Here's an example of 
how to set up a Stripe service that uses the configuration eg: `stripe.service.ts`

```typescript
@Injectable()
export class StripeService {
    private readonly stripe: Stripe;

    constructor(private readonly config: StripeConfig) {
        this.stripe = new Stripe(config.apiKey, {
            typescript: true,
        });
    }
    // etc...
}
```

## Testing Standards

### Unit Tests

- *Never use the Test.createTestingModule for services*, always inject mocks directly.
    - The only exception is for controllers, where you can use `Test.createTestingModule` since there's so many decorators and providers that need to be set up that serve core functionality.
- Mocks should be created using `ts-jest-mocker` using `mock()` function.
- Always inject mocks and services directly into the class being tested.
- Test negative cases as well as positive ones.

eg. example setup using `ts-jest-mocker`:

```typescript
describe('AccountService', () => {
    let service: AccountService;
    let dynamoDbService: jest.Mocked<DynamoDbService>;
    let accountFactory: jest.Mocked<AccountFactory>;
    let dateService: jest.Mocked<DateService>;
    let accountConfig: AccountConfig;

    const mockAccountData = {
        // mock data
    };

    beforeEach(() => {
        dynamoDbService = mock<DynamoDbService>();
        accountFactory = mock<AccountFactory>();
        dateService = mock<DateService>();

        dateService.getCurrentIsoDate.mockReturnValue('2023-01-01T00:00:00.000Z');

        accountConfig = {
            tableName: 'TestAccounts',
        };

        service = new AccountService(
            accountConfig,
            dynamoDbService,
            accountFactory,
            dateService,
        );
    });
});
```

### End to End (e2e) Tests
- Use `npm run test:e2e` to run all E2E tests
- Never mock external services in E2E tests if it can be avoided
- Use real database connections, but ensure the database is reset to a known state before each test run
- Use fixtures to set up initial data for E2E tests
- Use the `test/helpers` directory to create reusable test utilities and fixtures
- Always hit the actual API endpoints, not mocked ones
