---
name: ITP
description: |
  ITP — 带脑子的调度器 + 带质检的生产线 + 带记忆的管家。
  让 Hermes Agent 实现高质量、可控、可靠、自进化的复杂任务自动化，
  接近"说一句就搞定"的闭环体验。
version: 1.0.0
platforms: [macos, linux, windows]
author: User + Hermes Learning Loop
license: MIT

# Hermes 原生元数据
metadata:
  hermes:
    tags: [productivity, quality-gate, stage-tracking, checkpoint, self-evolving]
    category: automation
    requires_toolsets: [todo, delegate_task, execute_code, file]
    fallback_for_toolsets: [creative, code]
    related_skills: [novel-generator, story-cog, chart-generator]

config:
  - key: itp_enhancement.enabled
    description: "总开关，默认 true"
    default: true
  - key: itp_enhancement.quality_gate.enabled
    description: "质量门控开关"
    default: true
  - key: itp_enhancement.stage_tracking.enabled
    description: "四层阶段标记"
    default: true
  - key: itp_enhancement.checkpoint.auto_save_steps
    description: "每 N 步自动保存检查点，默认 5"
    default: 5
  - key: itp_enhancement.model_routing.enabled
    description: "智能模型路由，默认 true"
    default: true
  - key: itp_enhancement.transparency.show_before_execution
    description: "执行前显示透明报告，默认 true"
    default: true

# 触发机制（自动激活）
triggers:
  - type: intent
    patterns:
      - "^(帮我|请帮我|生成|创建一个|分析|处理|优化|开发|写一篇)"
      - "(小说|代码|脚本|报告|数据分析|网站|复杂|多步骤|长任务|多任务)"
    description: "检测到复杂、多步骤、高价值任务时自动激活 ITP 模式"

# 依赖声明
dependencies:
  toolsets:
    - todo
    - delegate_task
    - execute_code
    - file
  skills:
    - optional: novel-generator
    - optional: story-cog
    - optional: character-profile-cn

# 导出接口（供 Agent 调用）
exports:
  - name: analyze_intent
    description: "深度意图分析，返回四层阶段计划"
  - name: quality_check
    description: "六维质量门控评估"
  - name: create_checkpoint
    description: "创建任务检查点"
  - name: resume_checkpoint
    description: "从检查点恢复任务"
  - name: stage_progress_report
    description: "生成当前阶段透明报告"
  - name: execute_task_pipeline
    description: "执行完整四层阶段任务流水线"

execute:
  module: index.js
---

# ITP Skill

## 核心愿景

将 Hermes Agent 升级为 **"带脑子的调度器 + 带质检的生产线 + 带记忆的管家"** 多重角色合一的高度自主智能任务自动化引擎。

用户仅通过自然语言描述需求，系统就能自主理解意图、匹配技能、规划路径、执行全流程、质检优化、保存检查点，并输出高质量结果。

长期使用下，通过 Hermes Learning Loop 持续自进化，越用越懂用户。

## 设计哲学（零侵入增强）

- **增强而非替换**：不修改 Hermes 同步执行循环，不拦截 Agent 核心流程
- **全部后置处理**：质量门控、DeAI Polish 等作为 Post-Processor
- **配置驱动**：所有行为通过 `~/.hermes/config.yaml` 的 `itp_enhancement` 节控制
- **上下文压缩感知**：所有状态通过 todo format_for_injection 注入
- **自进化闭环**：复杂任务后自动提炼为子技能

## 四层阶段任务流水线

**T1 🔍 Analysis**：需求分析、意图确认、资料收集、约束定义
**T2 ⚙️ Creation**：核心内容/代码/数据生成，使用 delegate_task 拆分子任务
**T3 ✨ Polishing**：质量提升、去AI感、逻辑/格式检查
**T4 📦 Delivery**：格式化输出、Artifact 保存、元数据生成

## 六维质量门控

- Completeness ≥ 90%
- AI Score ≤ 5%
- Logic Consistency ≥ 90%
- Fluency ≥ 90%
- Format Compliance ≥ 95%
- Boundary Coverage（代码/分析任务）

## 使用方式

1. **自动激活**：复杂任务时自动触发
2. **手动激活**：说"使用 ITP 模式执行……"
3. **恢复任务**：使用 /resume <id> 或 /checkpoint list
