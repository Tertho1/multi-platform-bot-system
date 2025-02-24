# API Documentation

## REST API Endpoints

### Discord Bot Endpoints

#### POST /webhook/discord
Handles Discord webhook events.

**Request Headers:**
- `x-signature-timestamp`: Discord signature timestamp
- `x-signature-ed25519`: Discord signature

**Request Body:**
```json
{
  "type": 1,
  "token": "verification_token",
  "member": {},
  "data": {}
}
```

### Telegram Bot Endpoints

#### POST /webhook/telegram
Handles Telegram webhook events.

**Request Headers:**
- `x-telegram-bot-api-secret-token`: Webhook secret token

**Request Body:**
```json
{
  "update_id": 123456789,
  "message": {
    "message_id": 123,
    "from": {},
    "chat": {},
    "text": "message text"
  }
}
```

### Meta Platform Endpoints

#### POST /webhook/meta
Handles Meta platform (WhatsApp, Facebook, Instagram) webhook events.

**Request Headers:**
- `x-hub-signature-256`: Meta webhook signature

**Request Body:**
```json
{
  "object": "whatsapp_business_account",
  "entry": [{
    "id": "WHATSAPP_BUSINESS_ACCOUNT_ID",
    "changes": []
  }]
}
```

### CSV Export Endpoint

#### GET /export/csv
Generates and returns CSV export of interaction data.

**Query Parameters:**
- `platform`: Platform to export data for
- `startDate`: Start date for export (ISO format)
- `endDate`: End date for export (ISO format)
- `type`: Type of data to export

## Lambda Functions

### discordBot.handler
Processes Discord events and interactions.

**Event Format:**
```javascript
{
  body: string, // JSON string of Discord webhook payload
  headers: {
    'x-signature-timestamp': string,
    'x-signature-ed25519': string
  }
}
```

### telegramBot.handler
Processes Telegram bot events.

**Event Format:**
```javascript
{
  body: string, // JSON string of Telegram update
  headers: {
    'x-telegram-bot-api-secret-token': string
  }
}
```

### metaBot.handler
Processes Meta platform events.

**Event Format:**
```javascript
{
  body: string, // JSON string of Meta webhook payload
  headers: {
    'x-hub-signature-256': string
  }
}
```

### csvExport.handler
Handles CSV export requests.

**Event Format:**
```javascript
{
  queryStringParameters: {
    platform: string,
    startDate: string,
    endDate: string,
    type: string
  }
}
```

## Utility Functions

### MonitoringSystem
System health monitoring utilities.

```javascript
class MonitoringSystem {
  static async performHealthCheck(): Promise<HealthCheckResult>
  static async checkPerformanceDegradation(): Promise<void>
}
```

### BackupSystem
Data backup and restoration utilities.

```javascript
class BackupSystem {
  async performBackup(): Promise<BackupMetadata>
  async generateReport(): Promise<WeeklyReport>
}
```

### TicketManager
Ticket management system.

```javascript
class TicketManager {
  static async createTicket(ticketData: TicketData): Promise<TicketData>
  static async addResponse(ticketId: string, response: TicketResponse): Promise<void>
  static async updateStatus(ticketId: string, status: string): Promise<void>
}
```

## Type Definitions

### Common Types
```typescript
interface SystemMetrics {
  cpuUsage: number;
  memoryUsage: number;
  latency: number;
  errorRate: number;
  uptime: number;
}

interface HealthCheckResult {
  healthy: boolean;
  metrics: SystemMetrics;
  services: Record<string, boolean>;
  issues: string[];
}

interface PlatformResult {
  platform: string;
  healthy: boolean;
  responseTime: number;
  issues?: string[];
}
```

### Platform-Specific Types
```typescript
interface MetaWebhookEvent {
  object: string;
  entry: Array<{
    id: string;
    time: number;
    changes: Array<{
      value: any;
      field: string;
    }>;
  }>;
}

interface TelegramUpdate {
  update_id: number;
  message?: {
    message_id: number;
    from: any;
    chat: any;
    text?: string;
  };
}

interface DiscordInteraction {
  type: number;
  token: string;
  member: any;
  data: any;
}
```