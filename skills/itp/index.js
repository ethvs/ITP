/**
 * ITP Skill - Intelligent Task Pipeline
 * 让 Hermes Agent 实现高质量、可控、可靠、自进化的复杂任务自动化
 *
 * 核心架构: Pre → Execution → Post → Resilience
 * - Pre-Execution Layer: 意图分析、透明报告、模型路由
 * - Execution Layer: 四层阶段生产线 (T1-T4)
 * - Post-Execution Layer: 六维质量门控、DeAI Polish
 * - Resilience Layer: 检查点管理、结果缓存
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// 加载子模块
const IntentAnalyzer = require('./lib/intent-analyzer');
const TaskExecutor = require('./lib/task-executor');
const QualityGate = require('./lib/quality-gate');
const CheckpointManager = require('./lib/checkpoint-manager');
const ModelRouter = require('./lib/model-router');
const ConfigManager = require('./lib/config-manager');
const StageTracker = require('./lib/stage-tracker');

class ITPSkill {
  constructor() {
    this.name = 'ITP';
    this.version = '1.0.0';
    this.configManager = new ConfigManager();
    this.intentAnalyzer = new IntentAnalyzer();
    this.modelRouter = new ModelRouter();
    this.taskExecutor = new TaskExecutor();
    this.qualityGate = new QualityGate();
    this.checkpointManager = new CheckpointManager();
    this.stageTracker = new StageTracker();

    // 当前执行上下文
    this.currentContext = null;
    this.currentTask = null;
  }

  /**
   * 主执行入口
   * @param {Object} context - 执行上下文
   * @returns {Promise<Object>} 执行结果
   */
  async execute(context) {
    const config = this.configManager.getConfig();
    const startTime = Date.now();

    console.log(`\n═══════════════════════════════════════════`);
    console.log(`  ITP Skill v${this.version} - 智能任务流水线`);
    console.log(`═══════════════════════════════════════════\n`);

    try {
      // ========== Pre-Execution Layer ==========
      // T1: 需求分析阶段
      const stage1Result = await this.executeTier1(context, config);
      if (!stage1Result.success) {
        return this.buildErrorResult(stage1Result.error, 'T1');
      }

      // 显示透明报告（如果配置启用）
      if (config.transparency?.show_before_execution !== false) {
        await this.showTransparencyReport(stage1Result.analysis);
      }

      // ========== Execution Layer ==========
      // T2: 核心创建阶段
      const stage2Result = await this.executeTier2(stage1Result, config);
      if (!stage2Result.success) {
        await this.createCheckpoint('T2_FAILED', stage2Result);
        return this.buildErrorResult(stage2Result.error, 'T2');
      }

      // 自动保存检查点
      await this.autoSaveCheckpoint(config);

      // T3: 抛光优化阶段
      const stage3Result = await this.executeTier3(stage2Result, config);
      if (!stage3Result.success) {
        await this.createCheckpoint('T3_FAILED', stage3Result);
        return this.buildErrorResult(stage3Result.error, 'T3');
      }

      // T4: 交付阶段
      const stage4Result = await this.executeTier4(stage3Result, config);

      // ========== Post-Execution Layer ==========
      // 质量门控检查
      const qualityResult = await this.runQualityGate(stage4Result, config);

      // 如果质量未通过且启用了自动抛光
      if (!qualityResult.passed && config.quality_gate?.auto_polish) {
        const polishedResult = await this.runAutoPolish(stage4Result, qualityResult, config);
        return this.buildSuccessResult(polishedResult, startTime, qualityResult);
      }

      return this.buildSuccessResult(stage4Result, startTime, qualityResult);

    } catch (error) {
      console.error(`[ITP] 执行失败: ${error.message}`);
      // 异常时保存检查点
      await this.createCheckpoint('EXCEPTION', { error: error.message });
      return this.buildErrorResult(error.message, 'EXECUTION');
    }
  }

  /**
   * T1: 需求分析阶段 (Analysis)
   */
  async executeTier1(context, config) {
    console.log(`\n[🔍 T1] 需求分析阶段`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      // 深度意图分析
      const analysis = await this.intentAnalyzer.analyze(context);

      // 模型路由决策
      const routing = this.modelRouter.decide(analysis);

      // 生成四层阶段计划
      const plan = this.stageTracker.generatePlan(analysis);

      console.log(`✓ 任务类型: ${analysis.taskType}`);
      console.log(`✓ 复杂度: ${analysis.complexity}`);
      console.log(`✓ 推荐模型: ${routing.model}`);
      const estTokens = typeof analysis.estimatedTokens === 'object'
      ? (analysis.estimatedTokens.total || 'N/A')
      : (analysis.estimatedTokens || 'N/A');
    console.log(`✓ 预估 Token: ${estTokens}`);
      const estDuration = typeof analysis.estimatedDuration === 'object'
      ? (analysis.estimatedDuration.minutes || 'N/A')
      : (analysis.estimatedDuration || 'N/A');
    console.log(`✓ 预估时长: ${estDuration}`);

      return {
        success: true,
        analysis,
        routing,
        plan,
        stage: 'T1'
      };
    } catch (error) {
      return {
        success: false,
        error: `T1 分析失败: ${error.message}`,
        stage: 'T1'
      };
    }
  }

  /**
   * T2: 核心创建阶段 (Creation)
   */
  async executeTier2(stage1Result, config) {
    console.log(`\n[⚙️ T2] 核心创建阶段`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const { analysis, plan } = stage1Result;

      // 执行核心生成任务
      const result = await this.taskExecutor.executeCreation(analysis, plan);

      console.log(`✓ 创建完成: ${result.contentType || 'content'}`);
      console.log(`✓ 输出长度: ${result.contentLength || 'N/A'} 字符`);

      return {
        success: true,
        content: result.content,
        metadata: result.metadata,
        stage: 'T2',
        parentStage: stage1Result
      };
    } catch (error) {
      return {
        success: false,
        error: `T2 创建失败: ${error.message}`,
        stage: 'T2'
      };
    }
  }

  /**
   * T3: 抛光优化阶段 (Polishing)
   */
  async executeTier3(stage2Result, config) {
    console.log(`\n[✨ T3] 抛光优化阶段`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const { content, metadata } = stage2Result;

      // DeAI Polish: 去AI感处理
      const polished = await this.taskExecutor.polishContent(content, metadata);

      // 确保传入 checkLogic 的是字符串内容
      const contentForCheck = typeof polished === 'string' ? polished : JSON.stringify(polished);

      // 逻辑一致性检查
      const logicCheck = await this.qualityGate.checkLogic(contentForCheck);

      console.log(`✓ 抛光优化完成`);
      console.log(`✓ 逻辑检查: ${logicCheck.consistent ? '通过' : '需复查'}`);

      return {
        success: true,
        content: polished,
        metadata,
        logicCheck,
        stage: 'T3',
        parentStage: stage2Result
      };
    } catch (error) {
      return {
        success: false,
        error: `T3 抛光失败: ${error.message}`,
        stage: 'T3'
      };
    }
  }

  /**
   * T4: 交付阶段 (Delivery)
   */
  async executeTier4(stage3Result, config) {
    console.log(`\n[📦 T4] 交付阶段`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    try {
      const { content, metadata } = stage3Result;

      // 格式化输出
      const formatted = await this.taskExecutor.formatOutput(content, metadata);

      // 生成交付物元数据
      const artifactMeta = {
        contentType: metadata.contentType || 'text',
        createdAt: new Date().toISOString(),
        stage: 'T4',
        id: this.generateTaskId()
      };

      console.log(`✓ 格式化完成`);
      console.log(`✓ 交付物 ID: ${artifactMeta.id}`);

      return {
        success: true,
        content: formatted,
        metadata: artifactMeta,
        stage: 'T4',
        parentStage: stage3Result
      };
    } catch (error) {
      return {
        success: false,
        error: `T4 交付失败: ${error.message}`,
        stage: 'T4'
      };
    }
  }

  /**
   * 质量门控检查
   */
  async runQualityGate(stage4Result, config) {
    console.log(`\n[🔒 质量门控]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    const result = await this.qualityGate.evaluate(stage4Result, {
      thresholds: config.quality_gate?.thresholds || {}
    });

    // 显示质量报告
    this.displayQualityReport(result);

    return result;
  }

  /**
   * 自动抛光迭代
   */
  async runAutoPolish(content, qualityResult, config) {
    const maxIterations = config.quality_gate?.max_iterations || 3;
    let currentContent = content;
    let iteration = 0;

    console.log(`\n[🔄 自动抛光]`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    while (iteration < maxIterations && !qualityResult.passed) {
      iteration++;
      console.log(`\n迭代 ${iteration}/${maxIterations}...`);

      const improvements = this.qualityGate.generateImprovements(qualityResult);
      currentContent = await this.taskExecutor.applyImprovements(currentContent, improvements);

      // 重新检查质量
      qualityResult = await this.qualityGate.evaluate({ content: currentContent });

      if (qualityResult.passed) {
        console.log(`✓ 质量检查通过（迭代 ${iteration} 次）`);
        break;
      }
    }

    if (!qualityResult.passed) {
      console.log(`⚠ 达到最大迭代次数，质量未完全达标`);
    }

    return currentContent;
  }

  /**
   * 显示透明报告
   */
  async showTransparencyReport(analysis) {
    console.log(`\n╔═══════════════════════════════════════════╗`);
    console.log(`║         ITP 执行透明报告                  ║`);
    console.log(`╠═══════════════════════════════════════════╣`);

    if (analysis.taskType) {
      console.log(`║ 任务类型: ${analysis.taskType.padEnd(30)} ║`);
    }
    if (analysis.complexity) {
      console.log(`║ 复杂度: ${analysis.complexity.padEnd(32)} ║`);
    }
    if (analysis.estimatedTokens) {
      console.log(`║ 预估 Token: ${String(analysis.estimatedTokens).padEnd(29)} ║`);
    }
    if (analysis.estimatedDuration) {
      console.log(`║ 预估时长: ${String(analysis.estimatedDuration).padEnd(30)} ║`);
    }
    if (analysis.risks && analysis.risks.length > 0) {
      console.log(`╠═══════════════════════════════════════════╣`);
      console.log(`║ 风险预警:                                 ║`);
      analysis.risks.forEach(risk => {
        const line = risk.length > 39 ? risk.substring(0, 36) + '...' : risk;
        console.log(`║   • ${line.padEnd(37)} ║`);
      });
    }

    console.log(`╚═══════════════════════════════════════════╝`);
  }

  /**
   * 显示质量报告
   */
  displayQualityReport(result) {
    const scores = result.scores || {};
    const thresholds = {
      completeness: 90,
      aiScore: 5,
      logicConsistency: 90,
      fluency: 90,
      formatCompliance: 95,
      boundaryCoverage: 80
    };

    console.log(`\n质量评分:`);
    Object.entries(scores).forEach(([key, value]) => {
      const threshold = thresholds[key] || 80;
      const passed = key === 'aiScore' ? value <= threshold : value >= threshold;
      const icon = passed ? '✓' : '✗';
      const bar = this.generateScoreBar(value);
      console.log(`  ${icon} ${key.padEnd(20)} ${String(value).padStart(3)}% ${bar}`);
    });

    const status = result.passed ? '通过 ✓' : '未通过 ✗';
    console.log(`\n质量门控: ${status}`);
  }

  /**
   * 生成评分条形图
   */
  generateScoreBar(score) {
    const filled = Math.floor(score / 10);
    const empty = 10 - filled;
    return `[${'█'.repeat(filled)}${'░'.repeat(empty)}]`;
  }

  /**
   * 自动保存检查点
   */
  async autoSaveCheckpoint(config) {
    const steps = config.checkpoint?.auto_save_steps || 5;
    const currentStep = this.stageTracker.getCurrentStep();

    if (currentStep % steps === 0) {
      await this.createCheckpoint(`STEP_${currentStep}`);
    }
  }

  /**
   * 创建检查点
   */
  async createCheckpoint(label, data = {}) {
    const checkpoint = {
      checkpoint_id: this.generateCheckpointId(),
      created_at: new Date().toISOString(),
      label,
      stage: this.stageTracker.getCurrentStage(),
      step: this.stageTracker.getCurrentStep(),
      ...data
    };

    return this.checkpointManager.save(checkpoint);
  }

  /**
   * 从检查点恢复
   */
  async resumeCheckpoint(checkpointId) {
    const checkpoint = await this.checkpointManager.load(checkpointId);
    if (!checkpoint) {
      throw new Error(`检查点未找到: ${checkpointId}`);
    }

    console.log(`\n[🔄 恢复检查点: ${checkpointId}]`);
    console.log(`阶段: ${checkpoint.stage}`);
    console.log(`步骤: ${checkpoint.step}`);

    return checkpoint;
  }

  /**
   * 生成检查点列表
   */
  async listCheckpoints() {
    return this.checkpointManager.list();
  }

  /**
   * 构建成功结果
   */
  buildSuccessResult(result, startTime, qualityResult) {
    const duration = Date.now() - startTime;

    return {
      success: true,
      content: result.content || result,
      metadata: {
        ...result.metadata,
        duration,
        quality: qualityResult
      },
      iitpStats: {
        duration,
        stages: ['T1', 'T2', 'T3', 'T4'],
        qualityPassed: qualityResult.passed
      }
    };
  }

  /**
   * 构建错误结果
   */
  buildErrorResult(error, stage) {
    return {
      success: false,
      error,
      failedAt: stage,
      recoverySuggestion: this.getRecoverySuggestion(stage)
    };
  }

  /**
   * 获取恢复建议
   */
  getRecoverySuggestion(stage) {
    const suggestions = {
      T1: '请检查输入参数是否完整，或尝试手动指定任务类型',
      T2: '内容生成阶段失败，可能需要简化任务或提供更多上下文',
      T3: '抛光阶段失败，可尝试禁用自动抛光或手动优化',
      T4: '交付阶段失败，检查输出格式配置',
      EXECUTION: '执行过程中发生异常，可尝试从上一个检查点恢复：/checkpoint list'
    };
    return suggestions[stage] || '请查看错误日志以获取更多信息';
  }

  /**
   * 生成任务ID
   */
  generateTaskId() {
    return `task_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
  }

  /**
   * 生成检查点ID
   */
  generateCheckpointId() {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * ============ 导出接口 ============
   */

  // 意图分析
  async analyze_intent(context) {
    return this.intentAnalyzer.analyze(context);
  }

  // 质量检查
  async quality_check(content, options = {}) {
    return this.qualityGate.evaluate({ content }, options);
  }

  // 创建检查点
  async create_checkpoint(label, data) {
    return this.createCheckpoint(label, data);
  }

  // 恢复检查点
  async resume_checkpoint(checkpointId) {
    return this.resumeCheckpoint(checkpointId);
  }

  // 阶段进度报告
  async stage_progress_report() {
    return this.stageTracker.getProgressReport();
  }

  // 执行完整流水线
  async execute_task_pipeline(context) {
    return this.execute(context);
  }
}

// 导出技能实例
const itpSkill = new ITPSkill();

// 默认导出: 主执行函数
module.exports = async (context) => {
  return itpSkill.execute(context);
};

//具名导出所有接口
module.exports.ITPSkill = ITPSkill;
module.exports.analyze_intent = (context) => itpSkill.analyze_intent(context);
module.exports.quality_check = (content, options) => itpSkill.quality_check(content, options);
module.exports.create_checkpoint = (label, data) => itpSkill.create_checkpoint(label, data);
module.exports.resume_checkpoint = (checkpointId) => itpSkill.resume_checkpoint(checkpointId);
module.exports.stage_progress_report = () => itpSkill.stage_progress_report();
module.exports.execute_task_pipeline = (context) => itpSkill.execute_task_pipeline(context);
module.exports.list_checkpoints = () => itpSkill.listCheckpoints();
