/**
 * Intent Analyzer - 意图分析器
 * T1 阶段核心组件：深度解析用户意图，生成四层阶段计划
 */

class IntentAnalyzer {
  constructor() {
    // 任务类型模式
    this.taskPatterns = {
      creative_writing: {
        keywords: ['小说', '故事', '文章', '写作', '创作', '写', '生成', '创作'],
        subtypes: ['novel', 'story', 'article', 'poetry', 'script'],
        complexity: 'high'
      },
      code_generation: {
        keywords: ['代码', '程序', '脚本', '函数', '类', '开发', '实现', '写'],
        subtypes: ['function', 'class', 'script', 'module', 'project'],
        complexity: 'high'
      },
      data_analysis: {
        keywords: ['分析', '数据', '统计', '图表', '可视化', '报告'],
        subtypes: ['exploratory', 'statistical', 'visualization', 'report'],
        complexity: 'medium'
      },
      translation: {
        keywords: ['翻译', '转成', '转译', '翻译为', '译成'],
        subtypes: ['text', 'document', 'code'],
        complexity: 'low'
      },
      summarization: {
        keywords: ['总结', '摘要', '概括', '提炼'],
        subtypes: ['brief', 'detailed', 'bullet'],
        complexity: 'low'
      },
      general: {
        keywords: [],
        subtypes: ['general'],
        complexity: 'low'
      }
    };

    // 复杂度指标
    this.complexityIndicators = {
      high: ['复杂', '多步骤', '长', '完整', '详细', '深度', '全面'],
      medium: ['分析', '优化', '改进', '完善'],
      low: ['简单', '快速', '简要', '简述']
    };

    // 风险关键词
    this.riskKeywords = {
      file_overwrite: ['覆盖', '替换', '修改', '更新'],
      token_limit: ['长文', '长篇小说', '大文件', '大量数据'],
      circular_dependency: ['循环', '递归', '自引用'],
      permission: ['删除', '移除', '清空', '重置']
    };
  }

  /**
   * 分析用户意图
   * @param {Object} context - 包含用户输入的上下文
   * @returns {Object} 分析结果
   */
  async analyze(context) {
    const input = this.extractInput(context);

    // 1. 任务类型识别
    const taskType = this.identifyTaskType(input);

    // 2. 复杂度评估
    const complexity = this.assessComplexity(input, taskType);

    // 3. 子任务分解
    const subtasks = this.decomposeTask(input, taskType);

    // 4. Token 预估
    const estimatedTokens = this.estimateTokens(input, complexity);

    // 5. 时长预估
    const estimatedDuration = this.estimateDuration(complexity, subtasks.length);

    // 6. 风险检测
    const risks = this.detectRisks(input, context);

    // 7. 生成四层阶段计划
    const stagePlan = this.generateStagePlan(taskType, complexity, subtasks);

    // 8. 提取关键约束
    const constraints = this.extractConstraints(input);

    return {
      originalInput: input,
      taskType: taskType.type,
      subtype: taskType.subtype,
      confidence: taskType.confidence,
      complexity: complexity.level,
      complexityScore: complexity.score,
      subtasks,
      estimatedTokens,
      estimatedDuration,
      risks,
      stagePlan,
      constraints,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 提取用户输入
   */
  extractInput(context) {
    if (typeof context === 'string') {
      return context;
    }

    if (context.message || context.input || context.prompt) {
      return context.message || context.input || context.prompt;
    }

    if (context.userMessage) {
      return context.userMessage;
    }

    return JSON.stringify(context);
  }

  /**
   * 识别任务类型
   */
  identifyTaskType(input) {
    const inputLower = input.toLowerCase();
    let bestMatch = { type: 'general', subtype: 'general', confidence: 0 };

    for (const [type, config] of Object.entries(this.taskPatterns)) {
      let score = 0;

      // 关键词匹配
      for (const keyword of config.keywords) {
        if (inputLower.includes(keyword.toLowerCase())) {
          score += 10;
        }
      }

      // 位置加权（关键词出现在开头权重更高）
      for (const keyword of config.keywords) {
        const index = inputLower.indexOf(keyword.toLowerCase());
        if (index === 0) {
          score += 20;
        } else if (index > 0 && index < 50) {
          score += 10;
        }
      }

      // 子类型识别
      let detectedSubtype = config.subtypes[0];
      if (type === 'creative_writing') {
        if (inputLower.includes('小说')) detectedSubtype = 'novel';
        else if (inputLower.includes('故事')) detectedSubtype = 'story';
        else if (inputLower.includes('诗')) detectedSubtype = 'poetry';
        else if (inputLower.includes('剧本')) detectedSubtype = 'script';
      } else if (type === 'code_generation') {
        if (inputLower.includes('函数')) detectedSubtype = 'function';
        else if (inputLower.includes('类')) detectedSubtype = 'class';
        else if (inputLower.includes('脚本')) detectedSubtype = 'script';
        else if (inputLower.includes('项目')) detectedSubtype = 'project';
      }

      // 标准化置信度 (0-100)
      const confidence = Math.min(100, score * 2);

      if (confidence > bestMatch.confidence) {
        bestMatch = { type, subtype: detectedSubtype, confidence };
      }
    }

    return bestMatch;
  }

  /**
   * 评估复杂度
   */
  assessComplexity(input, taskType) {
    const inputLower = input.toLowerCase();
    let score = 0;
    let level = taskType.type === 'general' ? 'low' : taskType.complexity;

    // 基于复杂度指标加分
    for (const [lvl, keywords] of Object.entries(this.complexityIndicators)) {
      for (const keyword of keywords) {
        if (inputLower.includes(keyword)) {
          score += lvl === 'high' ? 30 : (lvl === 'medium' ? 15 : -10);
        }
      }
    }

    // 输入长度影响
    const charCount = input.length;
    if (charCount > 500) score += 20;
    if (charCount > 1000) score += 30;

    // 任务类型基础分
    const baseScores = { creative_writing: 70, code_generation: 75, data_analysis: 60, translation: 30, summarization: 25, general: 20 };
    score += baseScores[taskType.type] || 20;

    // 确定复杂度等级
    if (score >= 80) level = 'high';
    else if (score >= 50) level = 'medium';
    else level = 'low';

    return { level, score: Math.min(100, Math.max(0, score)) };
  }

  /**
   * 任务分解
   */
  decomposeTask(input, taskType) {
    const tasks = [];
    const inputLower = input.toLowerCase();

    // 根据任务类型进行分解
    switch (taskType.type) {
      case 'creative_writing':
        tasks.push('分析故事主题和风格');
        tasks.push('设计人物角色');
        tasks.push('构建情节大纲');
        if (inputLower.includes('章节') || inputLower.includes('长篇')) {
          tasks.push('分章节内容生成');
        }
        tasks.push('内容整合与润色');
        break;

      case 'code_generation':
        tasks.push('理解需求和约束');
        tasks.push('设计代码结构');
        tasks.push('实现核心功能');
        tasks.push('添加错误处理');
        tasks.push('代码优化与测试');
        break;

      case 'data_analysis':
        tasks.push('数据理解与清洗');
        tasks.push('探索性分析');
        tasks.push('统计分析/建模');
        if (inputLower.includes('图表') || inputLower.includes('可视化')) {
          tasks.push('可视化生成');
        }
        tasks.push('报告撰写');
        break;

      default:
        tasks.push('理解用户意图');
        tasks.push('信息收集/处理');
        tasks.push('内容生成');
        tasks.push('格式化输出');
    }

    return tasks;
  }

  /**
   * 估算 Token 数量
   */
estimateTokens(input, complexity) {
    const inputLength = input.length;
    // 中文大约 1 token per 2 chars, English ~4 chars per token
    const inputTokens = Math.ceil(inputLength / 2);

    // 基于复杂度估算输出
    const outputMultipliers = { low: 2, medium: 5, high: 10 };
    const outputTokens = inputTokens * (outputMultipliers[complexity.level] || 3);

    // 预留系统开销
    const overhead = 1000;

    return {
      input: inputTokens,
      output: Math.ceil(outputTokens),
      total: inputTokens + Math.ceil(outputTokens) + overhead,
      maxPossible: inputTokens + Math.ceil(outputTokens * 2) + overhead
    };
  }

  /**
   * 估算执行时长
   */
  estimateDuration(complexity, subtaskCount) {
    const baseMinutes = { low: 1, medium: 3, high: 8 };
    const perSubtaskMinutes = { low: 0.5, medium: 1.5, high: 3 };

    const base = baseMinutes[complexity.level] || 2;
    const perTask = perSubtaskMinutes[complexity.level] || 1;
    const estimatedMinutes = base + (subtaskCount * perTask);

    return {
      minutes: Math.ceil(estimatedMinutes),
      range: `${Math.ceil(estimatedMinutes * 0.7)}-${Math.ceil(estimatedMinutes * 1.3)} 分钟`,
      detail: `${estimatedMinutes.toFixed(1)} 分钟（${subtaskCount} 个子任务）`
    };
  }

  /**
   * 检测潜在风险
   */
  detectRisks(input, context) {
    const risks = [];
    const inputLower = input.toLowerCase();

    // 检查文件覆盖风险
    for (const keyword of this.riskKeywords.file_overwrite) {
      if (inputLower.includes(keyword)) {
        risks.push({
          type: 'file_overwrite',
          level: 'warning',
          message: '检测到可能涉及文件覆盖操作，请确认不会误删重要数据',
          suggestion: '建议先备份文件或使用版本控制'
        });
        break;
      }
    }

    // 检查 Token 超限风险
    for (const keyword of this.riskKeywords.token_limit) {
      if (inputLower.includes(keyword)) {
        risks.push({
          type: 'token_limit',
          level: 'info',
          message: '长任务可能超出单次处理的 Token 限制',
          suggestion: '将任务拆分为多个子任务，或使用流式处理'
        });
        break;
      }
    }

    // 检查循环依赖风险
    for (const keyword of this.riskKeywords.circular_dependency) {
      if (inputLower.includes(keyword)) {
        risks.push({
          type: 'circular_dependency',
          level: 'warning',
          message: '涉及递归或循环逻辑，需确保终止条件正确',
          suggestion: '仔细检查边界条件和递归深度'
        });
        break;
      }
    }

    // 检查权限风险
    for (const keyword of this.riskKeywords.permission) {
      if (inputLower.includes(keyword)) {
        risks.push({
          type: 'permission',
          level: 'critical',
          message: '涉及删除、清空等危险操作',
          suggestion: '请再次确认具体操作范围，建议先用只读模式验证'
        });
        break;
      }
    }

    return risks;
  }

  /**
   * 生成四层阶段计划
   */
  generateStagePlan(taskType, complexity, subtasks) {
    const stages = [];

    // T1: Analysis
    stages.push({
      id: 'T1',
      name: '需求分析',
      emoji: '🔍',
      tasks: [
        '深度意图理解',
        '任务类型识别',
        '约束条件提取',
        '依赖关系分析'
      ],
      estimatedTime: '1-3 分钟',
      dependencies: []
    });

    // T2: Creation
    const t2Tasks = subtasks.map((t, i) => `${i + 1}. ${t}`);
    stages.push({
      id: 'T2',
      name: '核心创建',
      emoji: '⚙️',
      tasks: t2Tasks,
      estimatedTime: complexity.level === 'high' ? '5-15 分钟' : '2-5 分钟',
      dependencies: ['T1']
    });

    // T3: Polishing
    if (complexity.level !== 'low') {
      stages.push({
        id: 'T3',
        name: '质量优化',
        emoji: '✨',
        tasks: [
          'DeAI Polish: 去AI感',
          '逻辑一致性检查',
          '格式规范化',
          '流畅度优化'
        ],
        estimatedTime: '2-5 分钟',
        dependencies: ['T2'],
        optional: complexity.level === 'low'
      });
    }

    // T4: Delivery
    stages.push({
      id: 'T4',
      name: '交付输出',
      emoji: '📦',
      tasks: [
        '格式化最终结果',
        '生成元数据',
        '创建交付物',
        '生成摘要报告'
      ],
      estimatedTime: '1-2 分钟',
      dependencies: complexity.level === 'high' ? ['T3'] : ['T2']
    });

    return stages;
  }

  /**
   * 提取关键约束
   */
  extractConstraints(input) {
    const constraints = {
      length: null,
      format: null,
      style: null,
      deadline: null,
      others: []
    };

    const inputLower = input.toLowerCase();

    // 长度约束
    const lengthMatch = input.match(/(\d+)\s*(字|词|句|段|行|字符|token)s?/i);
    if (lengthMatch) {
      constraints.length = {
        value: parseInt(lengthMatch[1]),
        unit: lengthMatch[2]
      };
    }

    // 格式约束
    const formatKeywords = {
      json: ['json'],
      markdown: ['markdown', 'md'],
      yaml: ['yaml', 'yml'],
      csv: ['csv'],
      html: ['html'],
      code: ['代码', 'code']
    };

    for (const [format, keywords] of Object.entries(formatKeywords)) {
      for (const keyword of keywords) {
        if (inputLower.includes(keyword.toLowerCase())) {
          constraints.format = format;
          break;
        }
      }
      if (constraints.format) break;
    }

    // 风格约束
    if (inputLower.includes('正式') || inputLower.includes('professional')) {
      constraints.style = 'formal';
    } else if (inputLower.includes('随意') || inputLower.includes('casual')) {
      constraints.style = 'casual';
    } else if (inputLower.includes('幽默') || inputLower.includes('funny')) {
      constraints.style = 'humorous';
    }

    return constraints;
  }
}

module.exports = IntentAnalyzer;
