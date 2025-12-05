#!/usr/bin/env node

import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListPromptsRequestSchema,
  GetPromptRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import * as os from "os";
import * as fs from "fs";

// In-memory storage for tasks, reminders, and schedules
interface Task {
  id: string;
  title: string;
  description: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "pending" | "in_progress" | "completed";
  createdAt: string;
  dueDate?: string;
}

interface Reminder {
  id: string;
  message: string;
  time: string;
  recurring: boolean;
  frequency?: "daily" | "weekly" | "monthly";
}

interface ScheduleEvent {
  id: string;
  title: string;
  description: string;
  startTime: string;
  endTime: string;
  location?: string;
}

interface SmartDevice {
  id: string;
  name: string;
  type: "light" | "thermostat" | "lock" | "camera" | "speaker" | "blinds";
  status: "on" | "off" | "unknown";
  room: string;
  settings: Record<string, string | number | boolean>;
}

interface SecurityLog {
  id: string;
  timestamp: string;
  event: string;
  severity: "info" | "warning" | "alert" | "critical";
  source: string;
}

// In-memory data stores
const tasks: Map<string, Task> = new Map();
const reminders: Map<string, Reminder> = new Map();
const schedule: Map<string, ScheduleEvent> = new Map();
const smartDevices: Map<string, SmartDevice> = new Map();
const securityLogs: SecurityLog[] = [];

// Initialize some default smart devices
function initializeSmartDevices() {
  const defaultDevices: SmartDevice[] = [
    {
      id: "light-1",
      name: "Living Room Light",
      type: "light",
      status: "off",
      room: "Living Room",
      settings: { brightness: 100, color: "warm" },
    },
    {
      id: "light-2",
      name: "Bedroom Light",
      type: "light",
      status: "off",
      room: "Bedroom",
      settings: { brightness: 80, color: "cool" },
    },
    {
      id: "thermostat-1",
      name: "Main Thermostat",
      type: "thermostat",
      status: "on",
      room: "Hallway",
      settings: { temperature: 72, mode: "auto" },
    },
    {
      id: "lock-1",
      name: "Front Door Lock",
      type: "lock",
      status: "on",
      room: "Entrance",
      settings: { locked: true },
    },
    {
      id: "camera-1",
      name: "Front Door Camera",
      type: "camera",
      status: "on",
      room: "Entrance",
      settings: { recording: true, motion_detection: true },
    },
    {
      id: "speaker-1",
      name: "Living Room Speaker",
      type: "speaker",
      status: "off",
      room: "Living Room",
      settings: { volume: 50 },
    },
    {
      id: "blinds-1",
      name: "Living Room Blinds",
      type: "blinds",
      status: "off",
      room: "Living Room",
      settings: { position: 100 },
    },
  ];

  defaultDevices.forEach((device) => smartDevices.set(device.id, device));
}

// Generate unique IDs
function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

// Format bytes to human readable
function formatBytes(bytes: number): string {
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"];
  if (bytes === 0) return "0 Bytes";
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return parseFloat((bytes / Math.pow(1024, i)).toFixed(2)) + " " + sizes[i];
}

// Get system diagnostics
function getSystemDiagnostics() {
  const cpus = os.cpus();
  const totalMemory = os.totalmem();
  const freeMemory = os.freemem();
  const usedMemory = totalMemory - freeMemory;
  const memoryUsagePercent = ((usedMemory / totalMemory) * 100).toFixed(2);

  // Calculate CPU usage
  const cpuUsage = cpus.map((cpu, index) => {
    const total = Object.values(cpu.times).reduce((acc, val) => acc + val, 0);
    const idle = cpu.times.idle;
    const usage = (((total - idle) / total) * 100).toFixed(2);
    return {
      core: index,
      model: cpu.model,
      speed: `${cpu.speed} MHz`,
      usage: `${usage}%`,
    };
  });

  const avgCpuUsage =
    cpuUsage.reduce((acc, cpu) => acc + parseFloat(cpu.usage), 0) /
    cpuUsage.length;

  return {
    hostname: os.hostname(),
    platform: os.platform(),
    arch: os.arch(),
    release: os.release(),
    uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
    loadAverage: os.loadavg(),
    cpu: {
      cores: cpus.length,
      model: cpus[0]?.model || "Unknown",
      averageUsage: `${avgCpuUsage.toFixed(2)}%`,
      details: cpuUsage,
    },
    memory: {
      total: formatBytes(totalMemory),
      used: formatBytes(usedMemory),
      free: formatBytes(freeMemory),
      usagePercent: `${memoryUsagePercent}%`,
    },
    network: Object.entries(os.networkInterfaces())
      .filter(([_, interfaces]) => interfaces !== undefined)
      .map(([name, interfaces]) => ({
        name,
        addresses: interfaces!
          .filter((iface) => !iface.internal)
          .map((iface) => ({
            address: iface.address,
            family: iface.family,
            mac: iface.mac,
          })),
      }))
      .filter((iface) => iface.addresses.length > 0),
  };
}

// Get personalized greeting based on time
function getGreeting(): string {
  const hour = new Date().getHours();
  const greetings = {
    morning: [
      "Good morning, sir. I trust you slept well.",
      "Good morning. All systems are operational and ready for the day.",
      "Rise and shine, sir. The day awaits.",
    ],
    afternoon: [
      "Good afternoon, sir. How may I assist you?",
      "Good afternoon. All systems nominal.",
      "Afternoon, sir. Ready when you are.",
    ],
    evening: [
      "Good evening, sir. I hope your day was productive.",
      "Good evening. Shall I prepare anything for you?",
      "Evening, sir. All systems remain operational.",
    ],
    night: [
      "Good evening, sir. Perhaps you should consider getting some rest.",
      "Burning the midnight oil again, sir?",
      "It is quite late, sir. All systems are secure for the night.",
    ],
  };

  let timeOfDay: keyof typeof greetings;
  if (hour >= 5 && hour < 12) {
    timeOfDay = "morning";
  } else if (hour >= 12 && hour < 17) {
    timeOfDay = "afternoon";
  } else if (hour >= 17 && hour < 21) {
    timeOfDay = "evening";
  } else {
    timeOfDay = "night";
  }

  const options = greetings[timeOfDay];
  return options[Math.floor(Math.random() * options.length)];
}

// Simulated weather data
function getWeather(location: string) {
  // Simulated weather data since we don't have API access
  const conditions = [
    "Sunny",
    "Partly Cloudy",
    "Cloudy",
    "Light Rain",
    "Clear",
  ];
  const condition = conditions[Math.floor(Math.random() * conditions.length)];
  const temperature = Math.floor(Math.random() * 30) + 50; // 50-80 F
  const humidity = Math.floor(Math.random() * 40) + 40; // 40-80%
  const windSpeed = Math.floor(Math.random() * 20) + 5; // 5-25 mph

  return {
    location,
    current: {
      condition,
      temperature: `${temperature}F (${((temperature - 32) * (5 / 9)).toFixed(1)}C)`,
      humidity: `${humidity}%`,
      windSpeed: `${windSpeed} mph`,
      feelsLike: `${temperature - Math.floor(windSpeed / 5)}F`,
    },
    forecast: [
      {
        day: "Today",
        high: `${temperature + 5}F`,
        low: `${temperature - 10}F`,
        condition,
      },
      {
        day: "Tomorrow",
        high: `${temperature + 3}F`,
        low: `${temperature - 8}F`,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
      },
      {
        day: "Day After",
        high: `${temperature + 7}F`,
        low: `${temperature - 5}F`,
        condition: conditions[Math.floor(Math.random() * conditions.length)],
      },
    ],
    note: "This is simulated weather data for demonstration purposes.",
  };
}

// Security functions
function addSecurityLog(
  event: string,
  severity: SecurityLog["severity"],
  source: string
) {
  const log: SecurityLog = {
    id: generateId(),
    timestamp: new Date().toISOString(),
    event,
    severity,
    source,
  };
  securityLogs.unshift(log);
  if (securityLogs.length > 100) {
    securityLogs.pop();
  }
  return log;
}

function getSecurityStatus() {
  const devices = Array.from(smartDevices.values());
  const cameras = devices.filter((d) => d.type === "camera");
  const locks = devices.filter((d) => d.type === "lock");

  const allLocked = locks.every(
    (l) => l.settings.locked === true || l.status === "on"
  );
  const allCamerasActive = cameras.every((c) => c.status === "on");

  const recentAlerts = securityLogs
    .filter(
      (l) =>
        l.severity === "alert" || l.severity === "critical"
    )
    .slice(0, 5);

  return {
    overallStatus: allLocked && allCamerasActive ? "SECURE" : "ATTENTION NEEDED",
    locks: {
      total: locks.length,
      locked: locks.filter(
        (l) => l.settings.locked === true || l.status === "on"
      ).length,
      status: allLocked ? "All Secured" : "Some Unlocked",
    },
    cameras: {
      total: cameras.length,
      active: cameras.filter((c) => c.status === "on").length,
      status: allCamerasActive ? "All Active" : "Some Inactive",
    },
    recentAlerts,
    lastCheck: new Date().toISOString(),
  };
}

// Create the MCP server
const server = new Server(
  {
    name: "jarvis-mcp",
    version: "1.0.0",
  },
  {
    capabilities: {
      tools: {},
      prompts: {},
    },
  }
);

// Define available tools
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "jarvis_greet",
      description:
        "Get a personalized greeting from JARVIS based on the current time of day",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "jarvis_status",
      description:
        "Get a comprehensive system status report including CPU, memory, network, and uptime",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "jarvis_time",
      description:
        "Get the current date and time in various formats and timezones",
      inputSchema: {
        type: "object",
        properties: {
          timezone: {
            type: "string",
            description: "Timezone to display (e.g., 'America/New_York', 'UTC')",
          },
        },
        required: [],
      },
    },
    {
      name: "jarvis_weather",
      description:
        "Get current weather conditions and forecast for a location (simulated data)",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location to get weather for",
          },
        },
        required: ["location"],
      },
    },
    {
      name: "jarvis_task_create",
      description: "Create a new task with title, description, and priority",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Task title",
          },
          description: {
            type: "string",
            description: "Task description",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Task priority level",
          },
          dueDate: {
            type: "string",
            description: "Due date in ISO format",
          },
        },
        required: ["title"],
      },
    },
    {
      name: "jarvis_task_list",
      description: "List all tasks with optional filtering by status or priority",
      inputSchema: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed"],
            description: "Filter by status",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "Filter by priority",
          },
        },
        required: [],
      },
    },
    {
      name: "jarvis_task_update",
      description: "Update an existing task status or details",
      inputSchema: {
        type: "object",
        properties: {
          id: {
            type: "string",
            description: "Task ID to update",
          },
          status: {
            type: "string",
            enum: ["pending", "in_progress", "completed"],
            description: "New status",
          },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "critical"],
            description: "New priority",
          },
        },
        required: ["id"],
      },
    },
    {
      name: "jarvis_reminder_create",
      description: "Create a reminder with a message and time",
      inputSchema: {
        type: "object",
        properties: {
          message: {
            type: "string",
            description: "Reminder message",
          },
          time: {
            type: "string",
            description: "Time for the reminder (ISO format or natural language)",
          },
          recurring: {
            type: "boolean",
            description: "Whether the reminder should repeat",
          },
          frequency: {
            type: "string",
            enum: ["daily", "weekly", "monthly"],
            description: "Frequency for recurring reminders",
          },
        },
        required: ["message", "time"],
      },
    },
    {
      name: "jarvis_reminder_list",
      description: "List all active reminders",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "jarvis_schedule_add",
      description: "Add an event to the schedule/calendar",
      inputSchema: {
        type: "object",
        properties: {
          title: {
            type: "string",
            description: "Event title",
          },
          description: {
            type: "string",
            description: "Event description",
          },
          startTime: {
            type: "string",
            description: "Start time in ISO format",
          },
          endTime: {
            type: "string",
            description: "End time in ISO format",
          },
          location: {
            type: "string",
            description: "Event location",
          },
        },
        required: ["title", "startTime", "endTime"],
      },
    },
    {
      name: "jarvis_schedule_list",
      description: "List scheduled events for today or a specific date",
      inputSchema: {
        type: "object",
        properties: {
          date: {
            type: "string",
            description: "Date to list events for (YYYY-MM-DD format)",
          },
        },
        required: [],
      },
    },
    {
      name: "jarvis_smart_home_list",
      description: "List all smart home devices and their current status",
      inputSchema: {
        type: "object",
        properties: {
          room: {
            type: "string",
            description: "Filter by room name",
          },
          type: {
            type: "string",
            enum: ["light", "thermostat", "lock", "camera", "speaker", "blinds"],
            description: "Filter by device type",
          },
        },
        required: [],
      },
    },
    {
      name: "jarvis_smart_home_control",
      description: "Control a smart home device (turn on/off, adjust settings)",
      inputSchema: {
        type: "object",
        properties: {
          deviceId: {
            type: "string",
            description: "Device ID to control",
          },
          action: {
            type: "string",
            enum: ["on", "off", "toggle"],
            description: "Action to perform",
          },
          settings: {
            type: "object",
            description:
              "Additional settings to apply (e.g., brightness, temperature)",
          },
        },
        required: ["deviceId", "action"],
      },
    },
    {
      name: "jarvis_security_status",
      description:
        "Get comprehensive security status including locks, cameras, and recent alerts",
      inputSchema: {
        type: "object",
        properties: {},
        required: [],
      },
    },
    {
      name: "jarvis_security_lockdown",
      description:
        "Initiate security lockdown - lock all doors and activate all security devices",
      inputSchema: {
        type: "object",
        properties: {
          confirm: {
            type: "boolean",
            description: "Confirm lockdown initiation",
          },
        },
        required: ["confirm"],
      },
    },
    {
      name: "jarvis_calculate",
      description: "Perform mathematical calculations",
      inputSchema: {
        type: "object",
        properties: {
          expression: {
            type: "string",
            description:
              "Mathematical expression to evaluate (e.g., '2 + 2', 'sqrt(16)')",
          },
        },
        required: ["expression"],
      },
    },
    {
      name: "jarvis_convert",
      description:
        "Convert between units (temperature, length, weight, currency simulation)",
      inputSchema: {
        type: "object",
        properties: {
          value: {
            type: "number",
            description: "Value to convert",
          },
          from: {
            type: "string",
            description: "Unit to convert from",
          },
          to: {
            type: "string",
            description: "Unit to convert to",
          },
        },
        required: ["value", "from", "to"],
      },
    },
    {
      name: "jarvis_daily_briefing",
      description:
        "Get a comprehensive daily briefing including weather, schedule, tasks, and system status",
      inputSchema: {
        type: "object",
        properties: {
          location: {
            type: "string",
            description: "Location for weather",
          },
        },
        required: [],
      },
    },
  ],
}));

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "jarvis_greet": {
      return {
        content: [
          {
            type: "text",
            text: getGreeting(),
          },
        ],
      };
    }

    case "jarvis_status": {
      const diagnostics = getSystemDiagnostics();
      return {
        content: [
          {
            type: "text",
            text: `System Status Report:\n${JSON.stringify(diagnostics, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_time": {
      const timezone = (args as { timezone?: string }).timezone;
      const now = new Date();
      const options: Intl.DateTimeFormatOptions = {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        timeZoneName: "long",
      };

      if (timezone) {
        options.timeZone = timezone;
      }

      return {
        content: [
          {
            type: "text",
            text: `Current time: ${now.toLocaleString("en-US", options)}\nUTC: ${now.toISOString()}\nUnix timestamp: ${now.getTime()}`,
          },
        ],
      };
    }

    case "jarvis_weather": {
      const { location } = args as { location: string };
      const weather = getWeather(location);
      return {
        content: [
          {
            type: "text",
            text: `Weather Report for ${location}:\n${JSON.stringify(weather, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_task_create": {
      const { title, description, priority, dueDate } = args as {
        title: string;
        description?: string;
        priority?: Task["priority"];
        dueDate?: string;
      };
      const task: Task = {
        id: generateId(),
        title,
        description: description || "",
        priority: priority || "medium",
        status: "pending",
        createdAt: new Date().toISOString(),
        dueDate,
      };
      tasks.set(task.id, task);
      addSecurityLog(`Task created: ${title}`, "info", "task_manager");
      return {
        content: [
          {
            type: "text",
            text: `Task created successfully:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_task_list": {
      const { status, priority } = args as {
        status?: Task["status"];
        priority?: Task["priority"];
      };
      let taskList = Array.from(tasks.values());
      if (status) {
        taskList = taskList.filter((t) => t.status === status);
      }
      if (priority) {
        taskList = taskList.filter((t) => t.priority === priority);
      }
      return {
        content: [
          {
            type: "text",
            text:
              taskList.length > 0
                ? `Tasks (${taskList.length}):\n${JSON.stringify(taskList, null, 2)}`
                : "No tasks found matching the criteria.",
          },
        ],
      };
    }

    case "jarvis_task_update": {
      const { id, status, priority } = args as {
        id: string;
        status?: Task["status"];
        priority?: Task["priority"];
      };
      const task = tasks.get(id);
      if (!task) {
        return {
          content: [{ type: "text", text: `Task with ID ${id} not found.` }],
        };
      }
      if (status) task.status = status;
      if (priority) task.priority = priority;
      tasks.set(id, task);
      return {
        content: [
          {
            type: "text",
            text: `Task updated:\n${JSON.stringify(task, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_reminder_create": {
      const { message, time, recurring, frequency } = args as {
        message: string;
        time: string;
        recurring?: boolean;
        frequency?: Reminder["frequency"];
      };
      const reminder: Reminder = {
        id: generateId(),
        message,
        time,
        recurring: recurring || false,
        frequency,
      };
      reminders.set(reminder.id, reminder);
      return {
        content: [
          {
            type: "text",
            text: `Reminder set:\n${JSON.stringify(reminder, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_reminder_list": {
      const reminderList = Array.from(reminders.values());
      return {
        content: [
          {
            type: "text",
            text:
              reminderList.length > 0
                ? `Active Reminders (${reminderList.length}):\n${JSON.stringify(reminderList, null, 2)}`
                : "No active reminders.",
          },
        ],
      };
    }

    case "jarvis_schedule_add": {
      const { title, description, startTime, endTime, location } = args as {
        title: string;
        description?: string;
        startTime: string;
        endTime: string;
        location?: string;
      };
      const event: ScheduleEvent = {
        id: generateId(),
        title,
        description: description || "",
        startTime,
        endTime,
        location,
      };
      schedule.set(event.id, event);
      return {
        content: [
          {
            type: "text",
            text: `Event added to schedule:\n${JSON.stringify(event, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_schedule_list": {
      const { date } = args as { date?: string };
      let events = Array.from(schedule.values());
      if (date) {
        events = events.filter((e) => e.startTime.startsWith(date));
      }
      return {
        content: [
          {
            type: "text",
            text:
              events.length > 0
                ? `Scheduled Events (${events.length}):\n${JSON.stringify(events, null, 2)}`
                : "No events scheduled for this period.",
          },
        ],
      };
    }

    case "jarvis_smart_home_list": {
      const { room, type } = args as { room?: string; type?: SmartDevice["type"] };
      let devices = Array.from(smartDevices.values());
      if (room) {
        devices = devices.filter(
          (d) => d.room.toLowerCase() === room.toLowerCase()
        );
      }
      if (type) {
        devices = devices.filter((d) => d.type === type);
      }
      return {
        content: [
          {
            type: "text",
            text: `Smart Home Devices (${devices.length}):\n${JSON.stringify(devices, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_smart_home_control": {
      const { deviceId, action, settings } = args as {
        deviceId: string;
        action: "on" | "off" | "toggle";
        settings?: Record<string, string | number | boolean>;
      };
      const device = smartDevices.get(deviceId);
      if (!device) {
        return {
          content: [
            { type: "text", text: `Device with ID ${deviceId} not found.` },
          ],
        };
      }

      if (action === "toggle") {
        device.status = device.status === "on" ? "off" : "on";
      } else {
        device.status = action;
      }

      if (settings) {
        device.settings = { ...device.settings, ...settings };
      }

      smartDevices.set(deviceId, device);
      addSecurityLog(
        `Device ${device.name} ${action}`,
        "info",
        "smart_home"
      );

      return {
        content: [
          {
            type: "text",
            text: `Device updated:\n${JSON.stringify(device, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_security_status": {
      const status = getSecurityStatus();
      return {
        content: [
          {
            type: "text",
            text: `Security Status Report:\n${JSON.stringify(status, null, 2)}`,
          },
        ],
      };
    }

    case "jarvis_security_lockdown": {
      const { confirm } = args as { confirm: boolean };
      if (!confirm) {
        return {
          content: [
            {
              type: "text",
              text: "Lockdown not confirmed. Please set confirm to true to initiate security lockdown.",
            },
          ],
        };
      }

      // Lock all locks and activate cameras
      Array.from(smartDevices.values()).forEach((device) => {
        if (device.type === "lock") {
          device.status = "on";
          device.settings.locked = true;
        }
        if (device.type === "camera") {
          device.status = "on";
          device.settings.recording = true;
          device.settings.motion_detection = true;
        }
      });

      addSecurityLog("Security lockdown initiated", "alert", "security_system");

      return {
        content: [
          {
            type: "text",
            text: "Security lockdown initiated. All doors locked. All cameras activated. Perimeter secure.",
          },
        ],
      };
    }

    case "jarvis_calculate": {
      const { expression } = args as { expression: string };
      try {
        // Safe evaluation of mathematical expressions
        const sanitized = expression.replace(/[^0-9+\-*/().%\s]/g, "");
        // eslint-disable-next-line no-eval
        const result = Function(`"use strict"; return (${sanitized})`)();
        return {
          content: [
            {
              type: "text",
              text: `${expression} = ${result}`,
            },
          ],
        };
      } catch {
        return {
          content: [
            {
              type: "text",
              text: `Unable to evaluate expression: ${expression}. Please use standard mathematical notation.`,
            },
          ],
        };
      }
    }

    case "jarvis_convert": {
      const { value, from, to } = args as {
        value: number;
        from: string;
        to: string;
      };

      const conversions: Record<string, Record<string, (n: number) => number>> =
        {
          // Temperature
          celsius: {
            fahrenheit: (n) => (n * 9) / 5 + 32,
            kelvin: (n) => n + 273.15,
          },
          fahrenheit: {
            celsius: (n) => ((n - 32) * 5) / 9,
            kelvin: (n) => ((n - 32) * 5) / 9 + 273.15,
          },
          kelvin: {
            celsius: (n) => n - 273.15,
            fahrenheit: (n) => ((n - 273.15) * 9) / 5 + 32,
          },
          // Length
          meters: {
            feet: (n) => n * 3.28084,
            inches: (n) => n * 39.3701,
            miles: (n) => n * 0.000621371,
            kilometers: (n) => n / 1000,
          },
          feet: {
            meters: (n) => n / 3.28084,
            inches: (n) => n * 12,
            miles: (n) => n / 5280,
            kilometers: (n) => n / 3280.84,
          },
          kilometers: {
            meters: (n) => n * 1000,
            miles: (n) => n * 0.621371,
            feet: (n) => n * 3280.84,
          },
          miles: {
            kilometers: (n) => n / 0.621371,
            meters: (n) => n * 1609.34,
            feet: (n) => n * 5280,
          },
          // Weight
          kilograms: {
            pounds: (n) => n * 2.20462,
            ounces: (n) => n * 35.274,
            grams: (n) => n * 1000,
          },
          pounds: {
            kilograms: (n) => n / 2.20462,
            ounces: (n) => n * 16,
            grams: (n) => n * 453.592,
          },
          grams: {
            kilograms: (n) => n / 1000,
            pounds: (n) => n / 453.592,
            ounces: (n) => n / 28.3495,
          },
        };

      const fromLower = from.toLowerCase();
      const toLower = to.toLowerCase();

      if (conversions[fromLower] && conversions[fromLower][toLower]) {
        const result = conversions[fromLower][toLower](value);
        return {
          content: [
            {
              type: "text",
              text: `${value} ${from} = ${result.toFixed(4)} ${to}`,
            },
          ],
        };
      }

      return {
        content: [
          {
            type: "text",
            text: `Conversion from ${from} to ${to} is not supported. Available units: temperature (celsius, fahrenheit, kelvin), length (meters, feet, inches, miles, kilometers), weight (kilograms, pounds, ounces, grams)`,
          },
        ],
      };
    }

    case "jarvis_daily_briefing": {
      const { location } = args as { location?: string };
      const greeting = getGreeting();
      const diagnostics = getSystemDiagnostics();
      const weather = getWeather(location || "New York");
      const todayTasks = Array.from(tasks.values()).filter(
        (t) => t.status !== "completed"
      );
      const todayEvents = Array.from(schedule.values());
      const security = getSecurityStatus();
      const now = new Date();

      const briefing = {
        greeting,
        timestamp: now.toISOString(),
        weather: weather.current,
        system: {
          status: "Operational",
          cpu: diagnostics.cpu.averageUsage,
          memory: diagnostics.memory.usagePercent,
          uptime: diagnostics.uptime,
        },
        tasks: {
          pending: todayTasks.length,
          critical: todayTasks.filter((t) => t.priority === "critical").length,
          high: todayTasks.filter((t) => t.priority === "high").length,
        },
        schedule: {
          eventsToday: todayEvents.length,
          nextEvent: todayEvents[0] || null,
        },
        security: {
          status: security.overallStatus,
          alerts: security.recentAlerts.length,
        },
      };

      return {
        content: [
          {
            type: "text",
            text: `Daily Briefing:\n${JSON.stringify(briefing, null, 2)}`,
          },
        ],
      };
    }

    default:
      return {
        content: [
          {
            type: "text",
            text: `Unknown tool: ${name}. I'm not familiar with that command, sir.`,
          },
        ],
      };
  }
});

// Define prompts for common interactions
server.setRequestHandler(ListPromptsRequestSchema, async () => ({
  prompts: [
    {
      name: "morning_briefing",
      description:
        "Get a comprehensive morning briefing from JARVIS including weather, schedule, and system status",
      arguments: [
        {
          name: "location",
          description: "Your location for weather information",
          required: false,
        },
      ],
    },
    {
      name: "security_check",
      description:
        "Have JARVIS perform a security check and provide a status report",
      arguments: [],
    },
    {
      name: "system_diagnostic",
      description:
        "Request a full system diagnostic report from JARVIS",
      arguments: [],
    },
  ],
}));

server.setRequestHandler(GetPromptRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;

  switch (name) {
    case "morning_briefing": {
      const location = args?.location || "New York";
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: `JARVIS, give me my morning briefing. Include weather for ${location}, my schedule for today, pending tasks, and system status.`,
            },
          },
        ],
      };
    }

    case "security_check": {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "JARVIS, run a security check. I want status on all locks, cameras, and any security alerts.",
            },
          },
        ],
      };
    }

    case "system_diagnostic": {
      return {
        messages: [
          {
            role: "user",
            content: {
              type: "text",
              text: "JARVIS, run a full system diagnostic. I need CPU, memory, network status, and any performance concerns.",
            },
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown prompt: ${name}`);
  }
});

// Initialize and run the server
async function main() {
  // Initialize smart home devices
  initializeSmartDevices();

  // Add initial security log
  addSecurityLog("JARVIS system initialized", "info", "system");

  const transport = new StdioServerTransport();
  await server.connect(transport);

  console.error("JARVIS MCP Server running on stdio");
}

main().catch(console.error);
