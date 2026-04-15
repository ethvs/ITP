# ITP - Intelligent Task Pipeline for Hermes Agent

## 概述

ITP 是一个 Hermes Agent 原生技能，实现 **四层阶段任务流水线** + **六维质量门控** + **智能模型路由**。

**核心愿景**：让 Agent 实现"说一句就搞定"的闭环体验。

## 快速开始

```bash
# 克隆仓库
git clone https://github.com/ethvs/ITP.git
cd ITP

# 安装依赖
npm install

# 运行测试
npm test
```

## 目录结构

```
ITP/
├── README.md              # 本文件
├── package.json           # 项目配置
├── test-itp.js            # 测试脚本
├── src/                   # [可选] Hermes框架兼容层
│   ├── skill-loader.js
│   └── skill-executor.js
└── skills/
    └── itp/               # 🎯 ITP 技能核心
        ├── SKILL.md       # 技能元数据
        ├── index.js       # 主执行入口
        ├── README.md      # 技能说明
        └── lib/           # 核心模块
            ├── intent-analyzer.js
            ├── task-executor.js
            ├── quality-gate.js
            └── ...
```

## 安装到 Hermes Agent

将 `skills/itp` 文件夹复制到您的 Hermes 技能目录：

```bash
cp -r skills/itp /path/to/hermes/skills/
```

## 使用方法

### 作为 Hermes 技能使用

```javascript
const skillExecutor = require('./src/skill-executor');

const result = await skillExecutor.execute('itp', {
  message: '帮我写一本科幻小说'
});
```

### 直接调用

```javascript
const itp = require('./skills/itp');

// 执行完整流水线
const result = await itp({ message: '帮我写代码' });

// 或调用具体接口
const intent = await itp.analyze_intent({ message: '分析数据' });
const quality = await itp.quality_check(content);
const checkpoints = await itp.list_checkpoints();
```

## 核心功能

### 四层流水线 (T1-T4)
- **T1 🔍 Analysis** - 需求分析、意图识别
- **T2 ⚙️ Creation** - 核心内容生成
- **T3 ✨ Polishing** - DeAI 抛光处理
- **T4 📦 Delivery** - 格式化交付

### 六维质量门控
| 维度 | 阈值 |
|------|------|
| Completeness | ≥ 90% |
| AI Score | ≤ 5% |
| Logic Consistency | ≥ 90% |
| Fluency | ≥ 90% |
| Format Compliance | ≥ 95% |
| Boundary Coverage | ≥ 80% |

### 智能模型路由
- 简单任务 → Claude Haiku
- 常规任务 → Claude Sonnet
- 复杂任务 → Claude Opus

## 配置

```yaml
# ~/.hermes/config.yaml
itp_enhancement:
  enabled: true
  quality_gate:
    enabled: true
    auto_polish: true
  checkpoint:
    auto_save_steps: 5
```

## API 参考

见 [skills/itp/README.md](skills/itp/README.md) 获取详细 API 文档。

## 许可证

MIT
