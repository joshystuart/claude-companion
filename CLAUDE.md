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