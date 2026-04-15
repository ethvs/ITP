/**
 * Stage Tracker - 阶段追踪器
 * 四层阶段进度追踪和透明报告
 */

class StageTracker {
  constructor() {
    this.currentStage = null;
    this.currentStep = 0;
    this.stages = {
      T1: { id: 'T1', name: '需求分析', emoji: '🔍', status: 'pending' },
      T2: { id: 'T2', name: '核心创建', emoji: '⚙️', status: 'pending' },
      T3: { id: 'T3', name: '质量优化', emoji: '✨', status: 'pending' },
      T4: { id: 'T4', name: '交付输出', emoji: '📦', status: 'pending' }
    };
    this.stageResults = new Map();
    this.stageStartTimes = new Map();
    this.stageDurations = new Map();
  }

  /**
   * 生成四层阶段计划
   */
  generatePlan(analysis) {
    const stages = [];
    const complexity = analysis.complexity;

    // T1 必包含
    stages.push({
      id: 'T1',
      name: '需求分析',
      emoji: '🔍',
      tasks: [
        '深度意图理解',
        '任务类型识别',
        '约束条件提取'
      ],
      status: 'pending',
      duration: '1-3 分钟',
      dependencies: []
    });

    // T2 必包含
    stages.push({
      id: 'T2',
      name: '核心创建',
      emoji: '⚙️',
      tasks: analysis.subtasks || ['内容生成', '核心功能实现'],
      status: 'pending',
      duration: complexity === 'high' ? '5-15 分钟' : '2-5 分钟',
      dependencies: ['T1']
    });

    // T3 根据复杂度决定是否包含
    if (complexity !== 'low') {
      stages.push({
        id: 'T3',
        name: '质量优化',
        emoji: '✨',
        tasks: [
          'DeAI Polish 处理',
          '逻辑一致性检查',
          '流畅度优化'
        ],
        status: 'pending',
        duration: '2-5 分钟',
        dependencies: ['T2'],
        optional: complexity === 'low'
      });
    }

    // T4 必包含
    const t4Dependencies = complexity === 'low' ? ['T2'] : ['T3'];
    stages.push({
      id: 'T4',
      name: '交付输出',
      emoji: '📦',
      tasks: [
        '格式化输出',
        '元数据生成',
        '结果验证'
      ],
      status: 'pending',
      duration: '1-2 分钟',
      dependencies: t4Dependencies
    });

    return stages;
  }

  /**
   * 开始阶段
   */
  startStage(stageId) {
    this.currentStage = stageId;
    this.stages[stageId].status = 'in_progress';
    this.stageStartTimes.set(stageId, Date.now());
    this.currentStep++;
  }

  /**
   * 完成阶段
   */
  completeStage(stageId, result = null) {
    this.stages[stageId].status = 'completed';

    if (this.stageStartTimes.has(stageId)) {
      const duration = Date.now() - this.stageStartTimes.get(stageId);
      this.stageDurations.set(stageId, duration);
    }

    if (result) {
      this.stageResults.set(stageId, result);
    }

    this.currentStep++;
  }

  /**
   * 阶段失败
   */
  failStage(stageId, error) {
    this.stages[stageId].status = 'failed';
    this.stageResults.set(stageId, { error });
  }

  /**
   * 获取当前阶段
   */
  getCurrentStage() {
    return this.currentStage;
  }

  /**
   * 获取当前步骤
   */
  getCurrentStep() {
    return this.currentStep;
  }

  /**
   * 获取进度报告
   */
  getProgressReport() {
    const totalStages = Object.keys(this.stages).length;
    const completedStages = Object.values(this.stages).
                                    filter(s => s.status === 'completed').length;
    const inProgressStages = Object.values(this.stages).
                                     filter(s => s.status === 'in_progress').length;

    const progressBar = this.generateProgressBar(completedStages, totalStages);

    return {
      currentStage: this.currentStage,
      currentStep: this.currentStep,
      completed: completedStages,
      total: totalStages,
      percentage: Math.round((completedStages / totalStages) * 100),
      progressBar,
      stages: Object.values(this.stages).map(s => ({
        id: s.id,
        name: s.name,
        emoji: s.emoji,
        status: s.status,
        duration: this.stageDurations.get(s.id)
          ? `${(this.stageDurations.get(s.id) / 1000).toFixed(1)}s`
          : 'N/A'
      })),
      status: this.buildStatusEmoji()
    };
  }

  /**
   * 生成进度条
   */
  generateProgressBar(completed, total) {
    const filled = Math.round((completed / total) * 10);
    const empty = 10 - filled;
    const bar = '█'.repeat(filled) + '░'.repeat(empty);
    const percentage = Math.round((completed / total) * 100);
    return `[${bar}] ${percentage}%`;
  }

  /**
   * 获取阶段图标
   */
  getEmoji(status) {
    const emojis = {
      pending: '⏳',
      in_progress: '▶️',
      completed: '✅',
      failed: '❌'
    };
    return emojis[status] || '⬜';
  }

  /**
   * 构建状态表情
   */
  buildStatusEmoji() {
    let status = '';

    for (const [id, stage] of Object.entries(this.stages)) {
      status += this.getEmoji(stage.status) + ' ';
    }

    return status.trim();
  }

  /**
   * 显示进度（控制台输出）
   */
  displayProgress() {
    const report = this.getProgressReport();

    console.log('\n╔═══════════════════════════════════════════╗');
    console.log('║          📊 任务进度报告                  ║');
    console.log('╠═══════════════════════════════════════════╣');
    console.log(`║ 总体进度: ${report.progressBar.padEnd(32)} ║`);
    console.log(`║ 当前阶段: ${report.currentStage?.padEnd(30) || '未开始'.padEnd(30)} ║`);
    console.log(`║ 完成步骤: ${String(`${report.completed}/${report.total}`).padEnd(30)} ║`);
    console.log('╠═══════════════════════════════════════════╣');

    for (const stage of report.stages) {
      const emoji = this.getEmoji(stage.status);
      const name = `${stage.emoji} ${stage.name}`;
      const duration = stage.status === 'completed' ? `(${stage.duration})` : '';
      const line = `${emoji} ${name} ${duration}`;
      console.log(`║ ${line.padEnd(41)} ║`);
    }

    console.log('╚═══════════════════════════════════════════╝');
  }

  /**
   * 获取Todo格式的阶段状态
   */
  getTodoFormat() {
    const todos = [];

    for (const [id, stage] of Object.entries(this.stages)) {
      todos.push({
        id,
        content: `${stage.emoji} ${stage.name}`,
        status: stage.status === 'completed' ? 'completed' :
                stage.status === 'in_progress' ? 'in_progress' : 'pending',
        stage: `tier_${id.toLowerCase()}_${this.getStageType(id)}`
      });
    }

    return { todos };
  }

  /**
   * 获取阶段类型
   */
  getStageType(id) {
    const types = {
      T1: 'analysis',
      T2: 'creation',
      T3: 'polishing',
      T4: 'delivery'
    };
    return types[id] || 'general';
  }

  /**
   * 压缩用于上下文注入的格式
   */
  formatForInjection() {
    const stages = Object.values(this.stages);
    const completed = stages.filter(s => s.status === 'completed').length;
    const total = stages.length;

    // 紧凑格式: T1✓T2✓T3▶T4○
    let compact = '';
    for (const stage of stages) {
      compact += stage.id;
      if (stage.status === 'completed') compact += '✓';
      else if (stage.status === 'in_progress') compact += '▶';
      else compact += '○';
    }

    return {
      compact,
      summary: `ITP[${completed}/${total}]:${compact}`,
      stages: Object.fromEntries(
        Object.entries(this.stages).map(([id, s]) => [id, s.status[0]])
      )
    };
  }

  /**
   * 从检查点恢复状态
   */
  restoreFromCheckpoint(checkpoint) {
    if (checkpoint.completedStages) {
      for (const stageId of checkpoint.completedStages) {
        if (this.stages[stageId]) {
          this.stages[stageId].status = 'completed';
        }
      }
    }

    this.currentStage = checkpoint.current_stage || null;
    this.currentStep = checkpoint.step || 0;

    if (checkpoint.todo_state) {
      for (const todo of checkpoint.todo_state) {
        if (this.stages[todo.id]) {
          this.stages[todo.id].status = todo.status;
        }
      }
    }
  }

  /**
   * 转换为检查点数据
   */
  toCheckpoint() {
    return {
      current_stage: this.currentStage,
      step: this.currentStep,
      completed_stages: Object.entries(this.stages)
        .filter(([_, s]) => s.status === 'completed')
        .map(([id, _]) => id),
      todo_state: this.getTodoFormat().todos,
      stage_durations: Object.fromEntries(this.stageDurations)
    };
  }

  /**
   * 重置状态
   */
  reset() {
    this.currentStage = null;
    this.currentStep = 0;

    for (const stage of Object.values(this.stages)) {
      stage.status = 'pending';
    }

    this.stageResults.clear();
    this.stageStartTimes.clear();
    this.stageDurations.clear();
  }

  /**
   * 获取摘要信息
   */
  getSummary() {
    const completedStages = Object.values(this.stages)
      .filter(s => s.status === 'completed')
      .map(s => `${s.emoji} ${s.name}`);

    const totalDuration = Array.from(this.stageDurations.values())
      .reduce((sum, d) => sum + d, 0);

    return {
      completedStages,
      totalStages: Object.keys(this.stages).length,
      totalDuration: totalDuration > 0 ? `${(totalDuration / 1000).toFixed(1)}s` : 'N/A',
      currentStage: this.currentStage
        ? `${this.stages[this.currentStage].emoji} ${this.stages[this.currentStage].name}`
        : '未开始'
    };
  }
}

module.exports = StageTracker;
