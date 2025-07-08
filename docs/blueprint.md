# **App Name**: MyAgent

## Core Features:

- Agent Definition: Define agent roles, prompts, toolsets, memory settings and LLM backend using simple, declarative configuration.
- Tool Integration: Use provided tool integrations like a calculator, weather API, web search and file system reader tool.
- Memory Management: Allow agents to read from short-term (conversation history) and long-term (vector store-based) memory.
- LLM Abstraction Tool: Provide an interface for LLM abstraction (LLMProvider) to generate agent responses based on prompts, memories, and tool outputs. The agent uses reasoning to decide when to incorporate pieces of information using tools in its output.
- Customization Hooks: Provide hooks for customizing pre/post processing steps for cleaning the memory.
- Agent Execution Graph: Visually display prompts, tool invocations, memory reads/writes, and final LLM responses. 
- CLI Tooling: Scaffold a new MyAgent project using a CLI tool that includes options to select LLM provider, memory backend and tool examples.

## Style Guidelines:

- Primary color: Deep blue (#3F51B5), conveying intelligence and stability.
- Background color: Light gray (#F0F2F5), offering a clean and unobtrusive backdrop.
- Accent color: Violet (#7E57C2), adding a touch of sophistication and highlighting interactive elements.
- Body and headline font: 'Inter', a grotesque-style sans-serif font that provides a modern, machined and neutral feel that ensures readability and clarity, making it a solid choice for both headlines and body text.
- Code font: 'Source Code Pro' for displaying code snippets.
- Use minimalist and clear icons that represent agent actions and tool functions.
- Subtle animations to indicate loading states and transitions between agent steps.