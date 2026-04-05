const fs = require('fs');
const path = require('path');

// 定义目录结构
const dirs = [
  'src/monitor',
  'src/monitor/dto',
  'src/monitor/entities'
];

// 定义文件内容
const files = {
  'src/monitor/dto/create-monitor-event.dto.ts': `export enum EventType {
  ERROR = 'error',
  PERFORMANCE = 'performance',
  BEHAVIOR = 'behavior',
  EXCEPTION = 'exception',
}

export class CreateMonitorEventDto {
  eventType: EventType
  projectName: string
  appId: string
  userId: string
  timestamp: number
  data: Record<string, any>
  userAgent?: string
  url?: string
  sessionId?: string
}
`,
  
  'src/monitor/dto/query-monitor.dto.ts': `import { EventType } from './create-monitor-event.dto'

export class QueryMonitorDto {
  projectName?: string
  appId?: string
  userId?: string
  eventType?: EventType
  startTime?: number
  endTime?: number
  page?: number
  pageSize?: number
}
`,
  
  'src/monitor/entities/monitor-event.entity.ts': `import { EventType } from '../dto/create-monitor-event.dto'

export class MonitorEvent {
  id: string
  eventType: EventType
  projectName: string
  appId: string
  userId: string
  timestamp: number
  data: Record<string, any>
  userAgent?: string
  url?: string
  sessionId?: string
  createdAt: Date
}
`,
  
  'src/monitor/monitor.service.ts': `import { Injectable } from '@nestjs/common'
import { CreateMonitorEventDto } from './dto/create-monitor-event.dto'
import { QueryMonitorDto } from './dto/query-monitor.dto'
import { MonitorEvent } from './entities/monitor-event.entity'

@Injectable()
export class MonitorService {
  private events: MonitorEvent[] = []

  async create(createMonitorEventDto: CreateMonitorEventDto): Promise<MonitorEvent> {
    const event: MonitorEvent = {
      id: this.generateId(),
      ...createMonitorEventDto,
      createdAt: new Date(),
    }
    this.events.push(event)
    return event
  }

  async createBatch(createMonitorEventDtos: CreateMonitorEventDto[]): Promise<MonitorEvent[]> {
    const events = createMonitorEventDtos.map((dto) => ({
      id: this.generateId(),
      ...dto,
      createdAt: new Date(),
    }))
    this.events.push(...events)
    return events
  }

  async findAll(query: QueryMonitorDto): Promise<{ data: MonitorEvent[], total: number }> {
    let filtered = [...this.events]

    if (query.projectName) {
      filtered = filtered.filter(e => e.projectName === query.projectName)
    }
    if (query.appId) {
      filtered = filtered.filter(e => e.appId === query.appId)
    }
    if (query.userId) {
      filtered = filtered.filter(e => e.userId === query.userId)
    }
    if (query.eventType) {
      filtered = filtered.filter(e => e.eventType === query.eventType)
    }
    if (query.startTime) {
      filtered = filtered.filter(e => e.timestamp >= query.startTime)
    }
    if (query.endTime) {
      filtered = filtered.filter(e => e.timestamp <= query.endTime)
    }

    const total = filtered.length
    const page = query.page || 1
    const pageSize = query.pageSize || 10
    const start = (page - 1) * pageSize
    const data = filtered.slice(start, start + pageSize)

    return { data, total }
  }

  async findOne(id: string): Promise<MonitorEvent | null> {
    return this.events.find(e => e.id === id) || null
  }

  async remove(id: string): Promise<boolean> {
    const index = this.events.findIndex(e => e.id === id)
    if (index !== -1) {
      this.events.splice(index, 1)
      return true
    }
    return false
  }

  async getStatistics(query: QueryMonitorDto) {
    const { data } = await this.findAll(query)
    
    const stats = {
      total: data.length,
      byType: {} as Record<string, number>,
      byProject: {} as Record<string, number>,
    }

    data.forEach((event) => {
      stats.byType[event.eventType] = (stats.byType[event.eventType] || 0) + 1
      stats.byProject[event.projectName] = (stats.byProject[event.projectName] || 0) + 1
    })

    return stats
  }

  private generateId(): string {
    return \`\${Date.now()}-\${Math.random().toString(36).substring(2, 9)}\`
  }
}
`,
  
  'src/monitor/monitor.controller.ts': `import { Body, Controller, Delete, Get, Param, Post, Query } from '@nestjs/common'
import { MonitorService } from './monitor.service'
import { CreateMonitorEventDto } from './dto/create-monitor-event.dto'
import { QueryMonitorDto } from './dto/query-monitor.dto'

@Controller('monitor')
export class MonitorController {
  constructor(private readonly monitorService: MonitorService) {}

  @Post('events')
  async create(@Body() createMonitorEventDto: CreateMonitorEventDto) {
    const event = await this.monitorService.create(createMonitorEventDto)
    return {
      success: true,
      data: event,
    }
  }

  @Post('events/batch')
  async createBatch(@Body() createMonitorEventDtos: CreateMonitorEventDto[]) {
    const events = await this.monitorService.createBatch(createMonitorEventDtos)
    return {
      success: true,
      data: events,
      count: events.length,
    }
  }

  @Get('events')
  async findAll(@Query() query: QueryMonitorDto) {
    const result = await this.monitorService.findAll(query)
    return {
      success: true,
      ...result,
    }
  }

  @Get('events/:id')
  async findOne(@Param('id') id: string) {
    const event = await this.monitorService.findOne(id)
    if (!event) {
      return {
        success: false,
        message: 'Event not found',
      }
    }
    return {
      success: true,
      data: event,
    }
  }

  @Delete('events/:id')
  async remove(@Param('id') id: string) {
    const removed = await this.monitorService.remove(id)
    if (!removed) {
      return {
        success: false,
        message: 'Event not found',
      }
    }
    return {
      success: true,
      message: 'Event deleted successfully',
    }
  }

  @Get('statistics')
  async getStatistics(@Query() query: QueryMonitorDto) {
    const stats = await this.monitorService.getStatistics(query)
    return {
      success: true,
      data: stats,
    }
  }

  @Get('health')
  getHealth() {
    return {
      success: true,
      status: 'ok',
      timestamp: Date.now(),
    }
  }
}
`,
  
  'src/monitor/monitor.module.ts': `import { Module } from '@nestjs/common'
import { MonitorController } from './monitor.controller'
import { MonitorService } from './monitor.service'

@Module({
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {}
`
};

console.log('=== 创建 Monitor 模块 ===\n');

// 1. 创建目录
console.log('步骤 1: 创建目录结构...');
dirs.forEach(dir => {
  const fullPath = path.join(__dirname, dir);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    console.log(`  ✓ 已创建: ${dir}`);
  } else {
    console.log(`  - 已存在: ${dir}`);
  }
});

console.log('\n步骤 2: 创建文件...');
// 2. 创建文件
Object.entries(files).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✓ 已创建: ${filePath}`);
});

console.log('\n=== 所有文件创建完成! ===\n');

// 3. 显示创建的文件列表
console.log('创建的文件列表:');
Object.keys(files).forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

console.log('\n下一步操作:');
console.log('  1. 更新 src/app.module.ts 导入 MonitorModule');
console.log('  2. 运行: pnpm run lint 检查代码格式');
console.log('  3. 运行: pnpm run build 构建项目');
console.log('  4. 运行: pnpm run start:dev 启动开发服务器\n');
