const fs = require('fs');
const path = require('path');

// 定义目录结构
const dirs = [
  'src/monitor',
  'src/monitor/dto',
  'src/monitor/entities'
];

// 定义基础文件内容
const baseFiles = {
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

// 定义测试文件内容
const testFiles = {
  'src/monitor/monitor.controller.spec.ts': `import { Test, TestingModule } from '@nestjs/testing'
import { MonitorController } from './monitor.controller'
import { MonitorService } from './monitor.service'
import { EventType } from './dto/create-monitor-event.dto'

describe('MonitorController', () => {
  let controller: MonitorController
  let service: MonitorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MonitorController],
      providers: [MonitorService],
    }).compile()

    controller = module.get<MonitorController>(MonitorController)
    service = module.get<MonitorService>(MonitorService)
  })

  it('should be defined', () => {
    expect(controller).toBeDefined()
  })

  describe('create', () => {
    it('should create a monitor event', async () => {
      const createDto = {
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: { message: 'test error' },
      }

      const result = await controller.create(createDto)

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.data.eventType).toBe(EventType.ERROR)
      expect(result.data.projectName).toBe('test-project')
    })
  })

  describe('createBatch', () => {
    it('should create multiple monitor events', async () => {
      const createDtos = [
        {
          eventType: EventType.ERROR,
          projectName: 'test-project',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: { message: 'error 1' },
        },
        {
          eventType: EventType.PERFORMANCE,
          projectName: 'test-project',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: { fps: 60 },
        },
      ]

      const result = await controller.createBatch(createDtos)

      expect(result.success).toBe(true)
      expect(result.data).toHaveLength(2)
      expect(result.count).toBe(2)
    })
  })

  describe('findAll', () => {
    it('should return all events with pagination', async () => {
      // Create some test events first
      await controller.create({
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      })

      const result = await controller.findAll({})

      expect(result.success).toBe(true)
      expect(result.data).toBeDefined()
      expect(result.total).toBeGreaterThanOrEqual(1)
    })

    it('should filter events by projectName', async () => {
      await controller.create({
        eventType: EventType.ERROR,
        projectName: 'project-a',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      })
      await controller.create({
        eventType: EventType.ERROR,
        projectName: 'project-b',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      })

      const result = await controller.findAll({ projectName: 'project-a' })

      expect(result.success).toBe(true)
      expect(result.data.every(e => e.projectName === 'project-a')).toBe(true)
    })
  })

  describe('findOne', () => {
    it('should return a single event by id', async () => {
      const created = await controller.create({
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      })

      const result = await controller.findOne(created.data.id)

      expect(result.success).toBe(true)
      expect(result.data.id).toBe(created.data.id)
    })

    it('should return error when event not found', async () => {
      const result = await controller.findOne('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Event not found')
    })
  })

  describe('remove', () => {
    it('should delete an event by id', async () => {
      const created = await controller.create({
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      })

      const result = await controller.remove(created.data.id)

      expect(result.success).toBe(true)
      expect(result.message).toBe('Event deleted successfully')
    })

    it('should return error when event not found', async () => {
      const result = await controller.remove('non-existent-id')

      expect(result.success).toBe(false)
      expect(result.message).toBe('Event not found')
    })
  })

  describe('getStatistics', () => {
    it('should return statistics', async () => {
      await controller.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'project-a',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.PERFORMANCE,
          projectName: 'project-a',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'project-b',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: {},
        },
      ])

      const result = await controller.getStatistics({})

      expect(result.success).toBe(true)
      expect(result.data.total).toBeGreaterThanOrEqual(3)
      expect(result.data.byType[EventType.ERROR]).toBeGreaterThanOrEqual(2)
      expect(result.data.byType[EventType.PERFORMANCE]).toBeGreaterThanOrEqual(1)
    })
  })

  describe('getHealth', () => {
    it('should return health status', () => {
      const result = controller.getHealth()

      expect(result.success).toBe(true)
      expect(result.status).toBe('ok')
      expect(result.timestamp).toBeDefined()
    })
  })
})
`,

  'src/monitor/monitor.service.spec.ts': `import { Test, TestingModule } from '@nestjs/testing'
import { MonitorService } from './monitor.service'
import { EventType } from './dto/create-monitor-event.dto'

describe('MonitorService', () => {
  let service: MonitorService

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [MonitorService],
    }).compile()

    service = module.get<MonitorService>(MonitorService)
  })

  it('should be defined', () => {
    expect(service).toBeDefined()
  })

  describe('create', () => {
    it('should create a monitor event with generated id', async () => {
      const createDto = {
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: { message: 'test error' },
      }

      const result = await service.create(createDto)

      expect(result).toBeDefined()
      expect(result.id).toBeDefined()
      expect(result.eventType).toBe(EventType.ERROR)
      expect(result.createdAt).toBeInstanceOf(Date)
    })

    it('should add event to internal storage', async () => {
      const createDto = {
        eventType: EventType.ERROR,
        projectName: 'test-project',
        appId: 'test-app',
        userId: 'user-123',
        timestamp: Date.now(),
        data: {},
      }

      const created = await service.create(createDto)
      const found = await service.findOne(created.id)

      expect(found).toBeDefined()
      expect(found.id).toBe(created.id)
    })
  })

  describe('createBatch', () => {
    it('should create multiple events', async () => {
      const createDtos = [
        {
          eventType: EventType.ERROR,
          projectName: 'test-project',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.PERFORMANCE,
          projectName: 'test-project',
          appId: 'test-app',
          userId: 'user-123',
          timestamp: Date.now(),
          data: {},
        },
      ]

      const result = await service.createBatch(createDtos)

      expect(result).toHaveLength(2)
      expect(result[0].id).toBeDefined()
      expect(result[1].id).toBeDefined()
      expect(result[0].id).not.toBe(result[1].id)
    })
  })

  describe('findAll', () => {
    beforeEach(async () => {
      // Clear events before each test
      await service.createBatch([])
    })

    it('should return paginated results', async () => {
      await service.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
      ])

      const result = await service.findAll({ page: 1, pageSize: 2 })

      expect(result.data).toHaveLength(2)
      expect(result.total).toBeGreaterThanOrEqual(3)
    })

    it('should filter by projectName', async () => {
      await service.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'project-a',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'project-b',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
      ])

      const result = await service.findAll({ projectName: 'project-a' })

      expect(result.data.every(e => e.projectName === 'project-a')).toBe(true)
    })

    it('should filter by eventType', async () => {
      await service.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.PERFORMANCE,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
      ])

      const result = await service.findAll({ eventType: EventType.ERROR })

      expect(result.data.every(e => e.eventType === EventType.ERROR)).toBe(true)
    })

    it('should filter by time range', async () => {
      const now = Date.now()
      await service.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: now - 10000,
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'test',
          appId: 'app1',
          userId: 'user1',
          timestamp: now,
          data: {},
        },
      ])

      const result = await service.findAll({ startTime: now - 5000 })

      expect(result.data.length).toBeGreaterThanOrEqual(1)
      expect(result.data.every(e => e.timestamp >= now - 5000)).toBe(true)
    })
  })

  describe('findOne', () => {
    it('should return event by id', async () => {
      const created = await service.create({
        eventType: EventType.ERROR,
        projectName: 'test',
        appId: 'app1',
        userId: 'user1',
        timestamp: Date.now(),
        data: {},
      })

      const found = await service.findOne(created.id)

      expect(found).toBeDefined()
      expect(found.id).toBe(created.id)
    })

    it('should return null when event not found', async () => {
      const found = await service.findOne('non-existent-id')

      expect(found).toBeNull()
    })
  })

  describe('remove', () => {
    it('should remove event by id', async () => {
      const created = await service.create({
        eventType: EventType.ERROR,
        projectName: 'test',
        appId: 'app1',
        userId: 'user1',
        timestamp: Date.now(),
        data: {},
      })

      const removed = await service.remove(created.id)

      expect(removed).toBe(true)

      const found = await service.findOne(created.id)
      expect(found).toBeNull()
    })

    it('should return false when event not found', async () => {
      const removed = await service.remove('non-existent-id')

      expect(removed).toBe(false)
    })
  })

  describe('getStatistics', () => {
    it('should return correct statistics', async () => {
      await service.createBatch([
        {
          eventType: EventType.ERROR,
          projectName: 'project-a',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.ERROR,
          projectName: 'project-a',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
        {
          eventType: EventType.PERFORMANCE,
          projectName: 'project-b',
          appId: 'app1',
          userId: 'user1',
          timestamp: Date.now(),
          data: {},
        },
      ])

      const stats = await service.getStatistics({})

      expect(stats.total).toBeGreaterThanOrEqual(3)
      expect(stats.byType[EventType.ERROR]).toBeGreaterThanOrEqual(2)
      expect(stats.byType[EventType.PERFORMANCE]).toBeGreaterThanOrEqual(1)
      expect(stats.byProject['project-a']).toBeGreaterThanOrEqual(2)
      expect(stats.byProject['project-b']).toBeGreaterThanOrEqual(1)
    })
  })
})
`
};

console.log('=== 创建 Monitor 模块及测试文件 ===\n');

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

// 2. 创建基础文件
console.log('\n步骤 2: 创建基础模块文件...');
Object.entries(baseFiles).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✓ 已创建: ${filePath}`);
});

// 3. 创建测试文件
console.log('\n步骤 3: 创建测试文件...');
Object.entries(testFiles).forEach(([filePath, content]) => {
  const fullPath = path.join(__dirname, filePath);
  fs.writeFileSync(fullPath, content, 'utf8');
  console.log(`  ✓ 已创建: ${filePath}`);
});

console.log('\n=== 所有文件创建完成! ===\n');

// 4. 显示创建的文件列表
console.log('创建的文件列表:');
console.log('\n基础模块文件:');
Object.keys(baseFiles).forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

console.log('\n测试文件:');
Object.keys(testFiles).forEach((file, index) => {
  console.log(`  ${index + 1}. ${file}`);
});

console.log('\n下一步操作:');
console.log('  1. 更新 src/app.module.ts 导入 MonitorModule');
console.log('  2. 运行: pnpm test 执行测试');
console.log('  3. 运行: pnpm run lint 检查代码格式');
console.log('  4. 运行: pnpm run build 构建项目\n');
