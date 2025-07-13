# MyAgent: An Open-Source AI Agent Framework

MyAgent is a comprehensive, open-source framework built with Next.js, Genkit, and ShadCN UI for creating, managing, and deploying sophisticated AI agents. It provides a full-featured dashboard for agent creation, workflow composition, testing, and analytics, making it an ideal starting point for building complex AI-powered applications.

The backend leverages Google's Genkit for orchestrating AI model interactions and a simple file-based JSON database for easy setup and prototyping, which can be swapped for a production database.

## Features

- **Agent Management**: A full CRUD interface to create, edit, and delete AI agents with customizable properties like models (Gemini, GPT), system prompts, tools, and memory.
- **Workflow Composer**: A visual, node-based editor to chain multiple agents and delay steps together, creating complex workflows to achieve a larger goal.
- **Tool Integration**:
    - **Genkit Tools**: Define custom TypeScript functions that AI agents can use to perform specific actions (e.g., `calculator`).
    - **MCP Tools**: Connect external tools running as separate processes via the Model Context Protocol (MCP), managed through a dedicated UI.
- **Knowledge Base (RAG)**: Upload text documents to provide a knowledge base that your agents can use for Retrieval-Augmented Generation (RAG).
- **Agent Testing Suite**:
    - **Text Chat**: A standard chat interface to test agent responses, with a view of execution history.
    - **Realtime Voice Chat**: A voice-enabled interface for testing conversational agents, featuring speech-to-text and text-to-speech capabilities.
- **Analytics Dashboard**: Visualize agent performance, including total runs, success rates, latency, and token usage, with charts and a log of recent executions.
- **File-Based Database**: Uses a simple `db.json` file for all data persistence, making the project easy to run locally without a database setup.

---

## Getting Started

### Prerequisites

- Node.js (v18 or later)
- npm or yarn

### Installation & Running the App

1.  **Install dependencies**:
    ```bash
    npm install
    ```

2.  **Set up environment variables**:
    Create a `.env` file in the root of the project and add your API keys for the AI models you intend to use:
    ```.env
    GOOGLE_API_KEY="your-google-api-key"
    OPENAI_API_KEY="your-openai-api-key"
    ```

3.  **Run the development server**:
    This command starts the Next.js application.
    ```bash
    npm run dev
    ```

4.  **Run the Genkit development server (Optional)**:
    To use the Genkit developer UI for inspecting flows and traces, run this in a separate terminal:
    ```bash
    npm run genkit:watch
    ```

The application will be available at `http://localhost:3000`.

---

## Project Structure

The project is organized to separate concerns, making it modular and easy to navigate.

```
.
├── prisma/
│   └── db.json            # File-based database
├── public/
│   └── ...                # Static assets
├── src/
│   ├── agents/            # Agent definitions
│   │   └── my-agent/
│   │       └── index.ts
│   ├── ai/                # Genkit configuration and flows
│   │   ├── flows/         # Genkit flows (e.g., run-agent.ts)
│   │   └── tools/         # Genkit tool definitions (e.g., calculator)
│   ├── app/               # Next.js App Router: pages and API routes
│   │   ├── (dashboard)/   # Main UI pages (dashboard, composer, etc.)
│   │   └── api/           # API endpoints for agents, workflows, etc.
│   ├── components/        # Reusable React components (UI and custom)
│   ├── lib/               # Core application logic and utilities
│   │   ├── actions.ts     # Server Actions for running agents/workflows
│   │   ├── db.ts          # Database adapter (currently for db.json)
│   │   └── types.ts       # All TypeScript type definitions
│   └── tools/             # File-based MCP tool server definitions
│       └── calculator/
│           └── index.ts
└── package.json
```

---

## Core Concepts Explained

### 1. Agents

An **Agent** is the fundamental building block of the framework. It's an AI entity with a specific role, defined by its configuration.

- **Definition File**: Each agent is defined in its own folder under `src/agents/[agent-name]/index.ts`.
- **Key Properties**:
    - `name`: The unique identifier for the agent.
    - `description`: A human-readable summary of its purpose.
    - `model`: The underlying AI model to use (e.g., `gemini-1.5-pro`, `gpt-4o`).
    - `systemPrompt`: The core instructions defining the agent's personality and role.
    - `tools`: An array of tool names (strings) that the agent is allowed to use.
    - `enableMemory`: A boolean that, when true, allows the agent to remember conversation history within a session.
    - `realtime`: A boolean that designates the agent for use in the voice chat interface.

### 2. Tools (Capabilities)

Tools give agents the ability to interact with the outside world or perform complex calculations. This framework supports two types of tools.

#### a. Genkit Tools (`src/ai/tools/`)

These are TypeScript functions defined directly within the project.

- **Definition**: Defined in `src/ai/tools/definitions.ts` using Genkit's `ai.defineTool`.
- **Schema**: Each tool has a Zod schema for its inputs and outputs, which the AI uses to understand how to call the tool and what to expect in return.
- **Example**: The `calculator` tool takes an operation and two numbers and returns the result.
- **Usage**: To make a Genkit tool available to an agent, add its name to the `tools` array in the agent's definition file.

#### b. MCP Tools (`src/tools/`)

These are external processes that expose their capabilities over the **Model Context Protocol (MCP)**. This is useful for integrating tools written in other languages (e.g., Python scripts).

- **Management UI**: The "MCP Tools" page in the dashboard allows you to manage the configuration of these external tool servers.
- **Definition**: Each tool is defined by a file in `src/tools/[tool-name]/index.ts`, which specifies the command and arguments needed to start its server.
- **Discovery**: When an agent needs a tool, the framework checks if an MCP tool server with that name is enabled and running, allowing the agent to use it.

### 3. Workflows (`src/app/composer/page.tsx`)

The **Composer** is a visual interface for orchestrating multiple agents to achieve a complex goal.

- **Nodes**: A workflow consists of nodes. The primary node types are **Agent Step** and **Delay Step**.
- **Execution Flow**: You can chain agent steps together. The output of one agent is passed as context to the next agent in the sequence.
- **Goal**: Each workflow has a high-level goal that provides the initial context for the first agent in the chain.

### 4. Database (`src/lib/db.ts`)

For simplicity and portability, the project uses a single JSON file (`prisma/db.json`) as its database.

- **Adapter**: The `src/lib/db.ts` file acts as a database adapter, mimicking the API of a standard ORM like Prisma.
- **How it Works**: It reads from and writes to `db.json` for all data operations (workflows, logs, conversations).
- **Switching to Production**: To use a production database like PostgreSQL or MySQL, you would only need to replace the implementation in `src/lib/db.ts` with your chosen database client (e.g., `node-postgres`, `mysql2`) while keeping the function signatures the same. No other part of the application would need to change.

### 5. API Routes (`src/app/api/`)

The application's backend logic is exposed via Next.js API Routes.

- `/api/agents`: Manages CRUD operations for agents.
- `/api/agents/[agentName]`: The core endpoint for running an agent. It supports streaming for real-time responses.
- `/api/workflows`: Manages CRUD operations for workflows.
- `/api/knowledge`: Handles document uploads and deletions for the RAG knowledge base.
- `/api/speech`: Converts text to audio for the voice agent.

---

## How to Extend the Framework

### Adding a New Agent

1.  Click the "Create Agent" button on the dashboard.
2.  Fill out the form with the agent's properties. This will automatically create a new folder and definition file in `src/agents/`.

### Adding a New Genkit Tool

1.  Open `src/ai/tools/definitions.ts`.
2.  Define a new tool using `ai.defineTool`, providing a name, description, and Zod schemas for input/output.
3.  Implement the tool's logic in the async callback function.
4.  Export the new tool.
5.  Open `src/ai/tools/index.ts` and add your new tool to the `allDefinedTools` array.
6.  You can now assign this tool to any agent via the "Edit Agent" UI.

### Adding a New Page

1.  Create a new folder inside `src/app/`. For example, `src/app/my-new-page/`.
2.  Add a `page.tsx` file inside the new folder.
3.  Build your page using React and the included ShadCN UI components.
4.  Add a link to your new page in the main navigation bar in `src/app/page.tsx`.
