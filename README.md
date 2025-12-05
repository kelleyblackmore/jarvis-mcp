# JARVIS MCP

A JARVIS-inspired MCP (Model Context Protocol) server that provides personal assistant capabilities similar to the AI assistant from Iron Man. This server enables AI models to interact with system information, manage tasks, control simulated smart home devices, and more.

## Features

### Core Capabilities

- **Personal Assistant Greetings**: Time-aware greetings that adapt to the time of day
- **System Diagnostics**: Real-time CPU, memory, and network monitoring
- **Time and Date Utilities**: Multi-timezone time display and formatting

### Task Management

- Create, list, and update tasks with priorities (low, medium, high, critical)
- Track task status (pending, in_progress, completed)
- Set due dates for tasks

### Calendar and Scheduling

- Add events to the schedule with start/end times and locations
- List events for specific dates
- Track upcoming appointments

### Reminders

- Create one-time or recurring reminders
- Support for daily, weekly, and monthly recurring reminders
- List all active reminders

### Smart Home Control (Simulated)

- Control lights, thermostats, locks, cameras, speakers, and blinds
- Adjust device settings (brightness, temperature, etc.)
- View device status by room or type

### Security Features

- Security status overview with lock and camera status
- Security logging with severity levels
- Lockdown mode to secure all entry points

### Utilities

- Mathematical calculations
- Unit conversions (temperature, length, weight)
- Weather information (simulated)
- Daily briefing combining all features

## Installation

```bash
npm install jarvis-mcp
```

Or clone and build from source:

```bash
git clone https://github.com/kelleyblackmore/jarvis-mcp.git
cd jarvis-mcp
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "jarvis": {
      "command": "node",
      "args": ["/path/to/jarvis-mcp/dist/index.js"]
    }
  }
}
```

### With MCP Inspector

```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### As a Standalone Server

```bash
npm start
```

## Available Tools

| Tool | Description |
|------|-------------|
| `jarvis_greet` | Get a personalized greeting based on time of day |
| `jarvis_status` | Get comprehensive system status (CPU, memory, network) |
| `jarvis_time` | Get current date and time in various formats |
| `jarvis_weather` | Get weather conditions (simulated) |
| `jarvis_task_create` | Create a new task |
| `jarvis_task_list` | List tasks with optional filtering |
| `jarvis_task_update` | Update task status or priority |
| `jarvis_reminder_create` | Create a reminder |
| `jarvis_reminder_list` | List active reminders |
| `jarvis_schedule_add` | Add an event to the schedule |
| `jarvis_schedule_list` | List scheduled events |
| `jarvis_smart_home_list` | List smart home devices |
| `jarvis_smart_home_control` | Control smart home devices |
| `jarvis_security_status` | Get security system status |
| `jarvis_security_lockdown` | Initiate security lockdown |
| `jarvis_calculate` | Perform mathematical calculations |
| `jarvis_convert` | Convert between units |
| `jarvis_daily_briefing` | Get a comprehensive daily briefing |

## Available Prompts

- `morning_briefing` - Get a comprehensive morning briefing
- `security_check` - Run a security check
- `system_diagnostic` - Request a full system diagnostic

## Example Interactions

### Get a Greeting

```
JARVIS, greet me.
> "Good morning, sir. I trust you slept well."
```

### Check System Status

```
JARVIS, system status.
> System Status Report:
> - CPU: 4 cores, 12.5% average usage
> - Memory: 8 GB total, 4.2 GB used (52.5%)
> - Uptime: 48.5 hours
```

### Create a Task

```
JARVIS, create a task to review the Mark 42 schematics with high priority.
> Task created: "Review Mark 42 schematics" (Priority: high)
```

### Control Smart Home

```
JARVIS, turn on the living room lights.
> Device updated: Living Room Light - Status: on
```

### Security Lockdown

```
JARVIS, initiate security lockdown.
> Security lockdown initiated. All doors locked. All cameras activated.
```

## Development

### Build

```bash
npm run build
```

### Watch Mode

```bash
npm run dev
```

### Run Tests

```bash
npm test
```

### Lint

```bash
npm run lint
```

## Architecture

The server is built using the MCP TypeScript SDK and implements:

- **Tools**: 18 different tools for various JARVIS-like functionalities
- **Prompts**: Pre-defined interaction patterns for common use cases
- **In-Memory Storage**: Tasks, reminders, schedules, and device states are stored in memory

## License

MIT
