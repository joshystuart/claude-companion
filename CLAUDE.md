# Development Partnership

We're building production-quality NestJS code together. Your role is to create maintainable, efficient solutions while catching potential issues early.

When you seem stuck or overly complex, I'll redirect you - my guidance helps you stay on track.

## AUTOMATED CHECKS ARE MANDATORY
**ALL validation issues are BLOCKING - EVERYTHING must be ✅ GREEN!**  
No errors. No formatting issues. No linting problems. Zero tolerance.  
These are not suggestions. Fix ALL issues before continuing.

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

Run: `npm run format && npm run lint && npm run test`

> Why: You can lose track of what's actually working. These checkpoints prevent cascading failures.

### CRITICAL: Validation Failures Are BLOCKING
**When validation reports ANY issues (exit code non-zero), you MUST:**
1. **STOP IMMEDIATELY** - Do not continue with other tasks
2. **FIX ALL ISSUES** - Address every ❌ issue until everything is ✅ GREEN
3. **VERIFY THE FIX** - Re-run the failed command to confirm it's fixed
4. **CONTINUE ORIGINAL TASK** - Return to what you were doing before the interrupt
5. **NEVER IGNORE** - There are NO warnings, only requirements

**Recovery Protocol:**
- When interrupted by a validation failure, maintain awareness of your original task
- After fixing all issues and verifying the fix, continue where you left off
- Use the todo list to track both the fix and your original task

## Working Memory Management

### When context gets long:
- Re-read this CLAUDE.md file
- Summarize progress in a PROGRESS.md file
- Document current state before major changes

### Maintain TODO.md:

For each new prompt/task, create a `TODO-{00}-{feature-name}.md` in the `./docs/todo` directory to define the plan, track tasks and progress.

It should follow this template:

```markdown
# Feature Name

## Overview

## Issue Analysis

## Plan

## Implementation Steps

## Expected Outcome

## Current Task
- [ ] What we're doing RIGHT NOW

## Completed  
- [x] What's actually done and tested

## Next Steps
- [ ] What comes next
```

## NestJS-Specific Rules

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
- ✅ Code is formatted (`npm run format`)
- ✅ All linters pass with zero issues (`npm run lint`)
- ✅ All tests pass (`npm run test`)
- ✅ Feature works end-to-end
- ✅ Old code is deleted
- ✅ JSDoc on all exported functions/classes
- ✅ Proper TypeScript types (no `any`)

### Survey Before Implementing - CRITICAL!
**Before writing ANY new code:**
1. **Search existing patterns**: Look for similar functionality in the codebase
2. **Check shared libraries**: Review `libs/` directories for reusable utilities
3. **Use established utilities**: Prefer existing helpers over new implementations
4. **Follow existing conventions**: Match patterns used elsewhere
5. **Check fixture builders**: Look in `/tests` directories before creating test data

Examples:
- Check for existing validation patterns in other DTOs
- Follow the same error handling patterns used throughout
- Use established logging patterns from existing services

### Testing Strategy
- **Unit tests**: Jest with comprehensive coverage
- **Integration tests**: Database and external service mocking
- **Functional/E2E tests**: Full API testing with `npm run test:e2e`
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

### Stripe Configuration Example

#### Setup the Stripe Configuration
We create the Stripe configuration as a DTO that will be used to validate and transform the environment variables. The `nestjs-typed-config` library will handle loading these values from the environment files into these DTOs.

Filename: `stripe.config.ts`

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

Filename: `app.config.ts`

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
Consuming the Stripe configuration in a service or controller is done via dependency injection. Here's an example of how to set up a Stripe service that uses the configuration:

Filename: `stripe.service.ts`

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

## Database & DynamoDb Standards

We have a generic DynamoDb service that handles all database operations. You should never directly interact with the DynamoDb SDK in your code. Instead, use the provided service to perform all database operations. If an generic operation is missing, add it to the DynamoDbService, not directly within your other services or controllers.

### Database Operations:
```bash
# Always ensure database is running
npm run db:start

# Setup tables
npm run db:setup
```

## Problem-Solving Together

When you're stuck or confused:
1. **Stop** - Don't spiral into complex solutions
2. **Delegate** - Consider spawning agents for parallel investigation
3. **Ultrathink** - For complex problems, say "I need to ultrathink through this challenge"
4. **Survey** - Check existing patterns in the codebase
5. **Simplify** - The simple solution following existing patterns is usually correct
6. **Ask** - "I see two approaches: [A] vs [B]. Which do you prefer?"

My insights on better approaches are valued - please ask for them!

## Performance & Security

### **Measure First**:
- No premature optimization
- Use NestJS built-in performance monitoring
- Profile database queries with Prisma

### **Security Always**:
- Validate all inputs with DTOs and class-validator
- Use proper authentication guards
- Sanitize database queries (Prisma handles this)
- Use environment variables for secrets
- Implement rate limiting where appropriate

## Development Commands Reference

### Essential Commands:
```bash
# Development servers
npm run start:dev

# Code quality (RUN THESE REGULARLY!)
npm run format           # Format code
npm run lint            # Lint code
npm run test            # Run tests
npm run validate        # Format check + lint + test

# CRITICAL: After any server/libs/ changes
npm run build           # Build to verify libs changes don't break apps

# Build
npm run build          # Build all packages
```

### Testing Commands:
```bash
npm run test                           # All tests
npm run test:e2e                      # Functional/E2E tests
```

## Communication Protocol

### Progress Updates:
```
✓ Implemented user authentication (all tests passing)
✓ Added booking validation DTOs
✗ Found issue with transaction rollback - investigating
```

### Suggesting Improvements:
"The current approach works, but I notice [observation].
Would you like me to [specific improvement]?"

## Working Together

- This is always a feature branch - no backwards compatibility needed
- When in doubt, we choose clarity over cleverness
- **Follow existing project conventions** - they're established for good reasons
- **REMINDER**: If this file hasn't been referenced in 30+ minutes, RE-READ IT!

### Key Principles:
1. **Survey before implementing** - always check existing patterns first
2. **Use established libraries** - prefer what's already available
3. **Maintain consistency** - follow the same patterns used elsewhere
4. **Type safety first** - leverage TypeScript fully
5. **Test thoroughly** - create and update tests as needed
6. **Format always** - use `npm run format` on all changes

Avoid complex abstractions or "clever" code. The simple, obvious solution following existing project patterns is probably better, and my guidance helps you stay focused on what matters.

## Environment & Stack
- **Node.js**: Always use >= 22.0.0
- **Package Manager**: npm
- **Database**: DynamoDB
- **Testing**: Jest with NestJS and React Testing Library
- **Validation**: `class-validator` and `class-transformer` with DTOs
- **Documentation**: JSDoc for all exported functions

Remember: **Strongly think about and use the conventions already laid out in the project**. If you think there is a better convention or industry standard, prompt me about it.