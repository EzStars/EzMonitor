const fs = require('node:fs')
const path = require('node:path')
const process = require('node:process')

console.log('=== Monitor 模块验证 ===\n')

// 需要检查的文件列表
const requiredFiles = [
  'src/monitor/monitor.module.ts',
  'src/monitor/monitor.controller.ts',
  'src/monitor/monitor.service.ts',
  'src/monitor/dto/create-monitor-event.dto.ts',
  'src/monitor/dto/query-monitor.dto.ts',
  'src/monitor/entities/monitor-event.entity.ts',
]

let allExist = true
const missingFiles = []

console.log('检查文件是否存在...\n')

requiredFiles.forEach((file, index) => {
  const fullPath = path.join(__dirname, file)
  const exists = fs.existsSync(fullPath)

  if (exists) {
    const stats = fs.statSync(fullPath)
    console.log(`✓ [${index + 1}/${requiredFiles.length}] ${file} (${stats.size} bytes)`)
  }
  else {
    console.log(`✗ [${index + 1}/${requiredFiles.length}] ${file} - 缺失!`)
    allExist = false
    missingFiles.push(file)
  }
})

console.log(`\n${'='.repeat(60)}\n`)

if (allExist) {
  console.log('✓ 所有文件检查通过！')
  console.log('\n下一步操作：')
  console.log('  1. 更新 src/app.module.ts:')
  console.log('     - 添加: import { MonitorModule } from \'./monitor/monitor.module\'')
  console.log('     - 在 imports 数组中添加: MonitorModule')
  console.log('  2. 运行: pnpm run lint')
  console.log('  3. 运行: pnpm run build')
  console.log('  4. 运行: pnpm run start:dev')
  console.log('  5. 测试: curl http://localhost:3000/monitor/health\n')
}
else {
  console.log(`✗ 发现 ${missingFiles.length} 个文件缺失！`)
  console.log('\n缺失的文件：')
  missingFiles.forEach(file => console.log(`  - ${file}`))
  console.log('\n请运行以下命令重新创建文件：')
  console.log('  node setup-monitor-v2.js\n')
  process.exit(1)
}

// 检查 app.module.ts 是否已更新
console.log('检查 app.module.ts 配置...\n')

const appModulePath = path.join(__dirname, 'src/app.module.ts')
if (fs.existsSync(appModulePath)) {
  const appModuleContent = fs.readFileSync(appModulePath, 'utf8')
  const hasImport = appModuleContent.includes('MonitorModule')

  if (hasImport) {
    console.log('✓ app.module.ts 已正确导入 MonitorModule')
  }
  else {
    console.log('⚠ app.module.ts 尚未导入 MonitorModule')
    console.log('  请参考 src/app.module.NEW.ts 进行更新\n')
  }
}
else {
  console.log('⚠ 找不到 src/app.module.ts')
}

console.log(`\n${'='.repeat(60)}`)
console.log('\n验证完成！')
