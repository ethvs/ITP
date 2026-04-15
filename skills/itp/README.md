# ITP Skill - Intelligent Task Pipeline

## 概述

ITP（Intelligent Task Pipeline）是一个 Hermes Agent 原生技能，实现了 **"带脑子的调度器 + 带质检的生产线 + 带记忆的管家"** 多重角色合一的高度自主智能任务自动化引擎。

## 核心特性

### 四层阶段任务流水线
- **T1 🔍 Analysis**：需求分析、意图确认、资料收集
- **T2 ⚙️ Creation**：核心内容/代码/数据生成
- **T3 ✨ Polishing**：质量提升、去AI感、逻辑检查
- **T4 📦 Delivery**：格式化输出、元数据生成

### 六维质量门控
- Completeness（完整性）≥ 90%
- AI Score（AI痕迹）≤ 5%
- Logic Consistency（逻辑一致性）≥ 90%
- Fluency（流畅度）≥ 90%
- Format Compliance（格式规范）≥ 95%
- Boundary Coverage（边界覆盖）≥ 80%

### 智能模型路由
根据任务复杂度自动选择最优模型：
- 简单任务 → Claude Haiku（节省成本）
- 常规任务 → Claude Sonnet（平衡）
- 复杂任务 → Claude Opus（高质量）

### 检查点管理
- 自动保存执行状态
- 支持 `/resume <id>` 恢复
- 30天自动清理过期检查点

## 目录结构

```
skills/itp/
├── SKILL.md              # 技能元数据定义
├── index.js              # 主执行入口
├── README.md             # 使用说明
├── lib/
│   ├── config-manager.js      # 配置管理
│   ├── intent-analyzer.js     # 意图分析
│   ├── task-executor.js       # 任务执行
│   ├── quality-gate.js        # 质量门控
│   ├── checkpoint-manager.js  # 检查点管理
│   ├── model-router.js        # 模型路由
│   └── stage-tracker.js       # 阶段追踪
├── templates/
│   └── task_templates.yaml    # 任务类型模板
└── checkpoints/              # 检查点存储
```

## 使用方法

### 自动激活
检测到复杂任务时自动触发：
```
"帮我写一篇关于人工智能的小说"
"开发一个数据分析脚本"
```

### 手动激活
```
"使用 ITP 模式执行..."
```

### 代码调用
```javascript
const skillExecutor = require('./src/skill-executor');

// 执行 ITP 技能
const result = await skillExecutor.execute('itp', {
  message: '帮我写一本科幻小说'
});
```

### 检查点操作
```javascript
const itp = require('./skills/itp');

// 列出检查点
const checkpoints = await itp.list_checkpoints();

// 从检查点恢复
const checkpoint = await itp.resume_checkpoint('<id>');

// 查看阶段进度
const report = await itp.stage_progress_report();
```

## 配置

在 `~/.hermes/config.yaml` 中配置：

```yaml
itp_enhancement:
  enabled: true
  auto_activate: true
  quality_gate:
    enabled: true
    auto_polish: true
    max_iterations: 3
  stage_tracking:
    enabled: true
    show_progress_bar: true
  model_routing:
    enabled: true
    cost_optimization: true
  checkpoint:
    auto_save_steps: 5
    retention_days: 30
```

## 导出接口

| 接口 | 描述 |
|------|------|
| `execute(context)` | 执行完整流水线 |
| `analyze_intent(context)` | 深度意图分析 |
| `quality_check(content, options)` | 六维质量评估 |
| `create_checkpoint(label, data)` | 创建检查点 |
| `resume_checkpoint(id)` | 恢复检查点 |
| `list_checkpoints()` | 列出所有检查点 |
| `stage_progress_report()` | 获取进度报告 |
| `execute_task_pipeline(context)` | 执行完整流水线别名 |

## 测试

运行测试：
```bash
node test-itp.js
```

## 许可证

MIT
