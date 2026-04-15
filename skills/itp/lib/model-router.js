/**
 * Model Router - 模型路由器
 * 根据任务复杂度智能选择最优模型，节省成本
 */

class ModelRouter {
  constructor() {
    // 模型配置
    this.models = {
      'claude-haiku': {
        tier: 'fast',
        costPer1K: 0.25,
        speed: 'fast',
        capabilities: ['simple_qa', 'translation', 'basic_summary'],
        maxTokens: 4096,
        costOptimization: true
      },
      'claude-sonnet': {
        tier: 'balanced',
        costPer1K: 3.00,
        speed: 'medium',
        capabilities: ['code', 'analysis', 'writing', 'creative'],
        maxTokens: 8192,
        costOptimization: true
      },
      'claude-opus': {
        tier: 'powerful',
        costPer1K: 15.00,
        speed: 'slow',
        capabilities: ['complex_coding', 'complex_reasoning', 'creative_writing', 'detailed_analysis'],
        maxTokens: 128000,
        costOptimization: false
      }
    };

    // 任务到模型映射
    this.taskModelMapping = {
      // 低复杂度任务 -> Haiku
      'translation': 'claude-haiku',
      'summarization': 'claude-haiku',
      'simple_qa': 'claude-haiku',
      'general': 'claude-haiku',

      // 中等复杂度 -> Sonnet
      'data_analysis': 'claude-sonnet',
      'code_generation': 'claude-sonnet',
      'creative_writing': 'claude-sonnet',

      // 高复杂度 -> Opus
      'creative_writing:high': 'claude-opus',
      'code_generation:high': 'claude-opus',
      'data_analysis:high': 'claude-opus'
    };

    // 保存路由历史
    this.routingHistory = [];
  }

  /**
   * 根据分析结果选择最优模型
   */
  decide(analysis) {
    const taskType = analysis.taskType;
    const complexity = analysis.complexity;
    const tokenEstimate = analysis.estimatedTokens;

    // 确定基础模型
    let selectedModel = this.selectBaseModel(taskType, complexity);

    // 考虑token限制进行模型调整
    selectedModel = this.adjustForTokenLimit(selectedModel, tokenEstimate);

    // 考虑成本优化
    const costOptimized = this.optimizeForCost(selectedModel, analysis);

    // 生成路由决策
    const decision = {
      model: costOptimized.model,
      originalModel: selectedModel,
      modelTier: this.models[costOptimized.model].tier,
      reasoning: this.generateReasoning(taskType, complexity, tokenEstimate, costOptimized),
      estimatedCost: this.calculateCost(costOptimized.model, tokenEstimate),
      costSavings: costOptimized.savings,
      estimatedDuration: this.estimateDuration(costOptimized.model, complexity),
      fallback: this.getFallbackModel(costOptimized.model)
    };

    // 记录路由历史
    this.routingHistory.push({
      timestamp: new Date().toISOString(),
      taskType,
      complexity,
      decision
    });

    return decision;
  }

  /**
   * 选择基础模型
   */
  selectBaseModel(taskType, complexity) {
    // 高复杂度强制使用Opus
    if (complexity === 'high') {
      const complexKey = `${taskType}:high`;
      return this.taskModelMapping[complexKey] || 'claude-opus';
    }

    // 检查任务映射
    if (this.taskModelMapping[taskType]) {
      return this.taskModelMapping[taskType];
    }

    // 根据复杂度默认选择
    const complexityDefaults = {
      low: 'claude-haiku',
      medium: 'claude-sonnet',
      high: 'claude-opus'
    };

    return complexityDefaults[complexity] || 'claude-sonnet';
  }

  /**
   * 根据token限制调整模型
   */
  adjustForTokenLimit(model, tokenEstimate) {
    if (!tokenEstimate) return model;

    const neededTokens = tokenEstimate.total || tokenEstimate;
    const modelMaxTokens = this.models[model]?.maxTokens || 4096;

    // 如果需要大量token，升级到支持更多token的模型
    if (neededTokens > modelMaxTokens * 0.8) {
      // 升级优先级
      const upgradePath = {
        'claude-haiku': 'claude-sonnet',
        'claude-sonnet': 'claude-opus',
        'claude-opus': 'claude-opus'
      };
      return upgradePath[model] || model;
    }

    return model;
  }

  /**
   * 成本优化
   */
  optimizeForCost(model, analysis) {
    const config = analysis._config?.model_routing || {};

    if (!config.cost_optimization) {
      return { model, savings: 0, reason: '成本优化已禁用' };
    }

    const taskType = analysis.taskType;
    const complexity = analysis.complexity;
    const currentCost = this.models[model].costPer1K;

    // 策略1: 低复杂度任务降级
    if (complexity === 'low' && model !== 'claude-haiku') {
      const savings = currentCost - this.models['claude-haiku'].costPer1K;
      return {
        model: 'claude-haiku',
        savings: savings.toFixed(2),
        reason: '低复杂度任务使用轻量级模型'
      };
    }

    // 策略2: 特定任务的可降本执行
    const downgradeableTasks = ['summarization', 'translation', 'simple_qa'];
    if (downgradeableTasks.includes(taskType) && model === 'claude-sonnet') {
      const savings = currentCost - this.models['claude-haiku'].costPer1K;
      return {
        model: 'claude-haiku',
        savings: savings.toFixed(2),
        reason: `${taskType} 任务可使用轻量级模型处理`
      };
    }

    // 策略3: 高性价比代码任务
    if (taskType === 'code_generation' && complexity === 'medium' && model === 'claude-opus') {
      const savings = currentCost - this.models['claude-sonnet'].costPer1K;
      return {
        model: 'claude-sonnet',
        savings: savings.toFixed(2),
        reason: '中等复杂度代码任务可使用Sonnet高效处理'
      };
    }

    return { model, savings: 0, reason: '当前模型配置为最优' };
  }

  /**
   * 计算预估成本
   */
  calculateCost(model, tokenEstimate) {
    const tokens = tokenEstimate?.total || 1000;
    const costPer1K = this.models[model]?.costPer1K || 3.00;
    return (tokens / 1000 * costPer1K).toFixed(4);
  }

  /**
   * 估算执行时长
   */
  estimateDuration(model, complexity) {
    const baseTimes = {
      'claude-haiku': { low: '5s', medium: '15s', high: '30s' },
      'claude-sonnet': { low: '5s', medium: '10s', high: '25s' },
      'claude-opus': { low: '10s', medium: '30s', high: '60s+' }
    };

    const modelTimes = baseTimes[model] || baseTimes['claude-sonnet'];
    return modelTimes[complexity] || modelTimes.medium;
  }

  /**
   * 获取降级备用模型
   */
  getFallbackModel(model) {
    const fallbacks = {
      'claude-haiku': null,  // 无法降级
      'claude-sonnet': 'claude-haiku',
      'claude-opus': 'claude-sonnet'
    };
    return fallbacks[model];
  }

  /**
   * 生成路由决策说明
   */
  generateReasoning(taskType, complexity, tokenEstimate, optimization) {
    const reasons = [];

    reasons.push(`任务类型: ${taskType}, 复杂度: ${complexity}`);

    if (tokenEstimate?.total) {
      reasons.push(`预计Token: ${tokenEstimate.total}`);
    }

    if (optimization.savings > 0) {
      reasons.push(`成本优化: 节省 $${optimization.savings}/1K tokens`);
    }

    return reasons.join('; ');
  }

  /**
   * 获取路由历史
   */
  getRoutingHistory(limit = 50) {
    return this.routingHistory.slice(-limit);
  }

  /**
   * 获取成本统计
   */
  getCostStatistics() {
    const stats = {
      totalRoutings: this.routingHistory.length,
      modelDistribution: {},
      estimatedTotalSavings: 0
    };

    for (const entry of this.routingHistory) {
      const model = entry.decision.model;
      stats.modelDistribution[model] = (stats.modelDistribution[model] || 0) + 1;

      if (entry.decision.costSavings) {
        stats.estimatedTotalSavings += parseFloat(entry.decision.costSavings);
      }
    }

    return stats;
  }
}

module.exports = ModelRouter;
