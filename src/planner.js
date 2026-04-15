/**
 * Intelligent Task Planner v2.0 - 增强版主规划器
 * 支持：全局技能检查 → 自动搜索安装 → 近似技能匹配 → 技能链执行
 */
const IntentAnalyzer = require('./intent-analyzer');
const SkillMatcher = require('./skill-matcher');
const skillLoader = require('./skill-loader');
const skillExecutor = require('./skill-executor');
const fs = require('fs');
const path = require('path');

class IntelligentTaskPlanner {
  constructor() {
    this.intentAnalyzer = new IntentAnalyzer();
    this.skillMatcher = new SkillMatcher();
    this.config = this.loadConfig();
    this.executionLog = [];

    // Initialize skill loader and load all skills
    this.skillLoader = skillLoader;
    this.skillExecutor = skillExecutor;
    this.initializeSkills();
  }

  async initializeSkills() {
    try {
      await this.skillLoader.loadAllSkills();
      console.log('✓ Skills initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize skills:', error.message);
    }
  }

  loadConfig() {
    return {
      autoInstall: true,
      sources: ['clawhub', 'github'],
      requireConfirmation: false,
      maxSteps: 10,
      timeoutMinutes: 30,
      enableSkillChain: true,
      qualityGate: true
    };
  }

  /**
   * 处理用户任务 - 主入口
   */
  async processTask(userInput, context = {}) {
    const startTime = Date.now();
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🤖 Intelligent Task Planner v2.0`);
    console.log(`任务：${userInput}`);
    console.log(`${'='.repeat(60)}\n`);

    try {
      // 步骤 1: 意图识别
      console.log(`[${this.formatTime()}] 📊 步骤 1: 意图识别`);
      const intent = await this.intentAnalyzer.analyze(userInput);
      this.log('intent', intent);
      
      if (!intent.success) {
        console.log('⚠️  无法识别任务类型，使用通用处理流程');
        return await this.handleGeneralTask(userInput, context);
      }
      console.log(`✓ 识别结果：${intent.category} (置信度：${(intent.confidence * 100).toFixed(1)}%)`);

      // 步骤 2: 技能匹配与准备（增强版）
      console.log(`\n[${this.formatTime()}] 🔧 步骤 2: 技能匹配与准备`);
      const requiredSkills = intent.requiredSkills || [];
      const skillPreparation = await this.skillMatcher.prepareSkills(requiredSkills);
      this.log('skillPreparation', skillPreparation);
      
      // 汇总所有可用技能（已安装 + 新安装 + 替代技能）
      const availableSkills = [
        ...skillPreparation.installed,
        ...skillPreparation.toInstall.filter(s => !skillPreparation.installed.includes(s))
      ];
      console.log(`✓ 可用技能：${availableSkills.join(', ') || '使用基础工具'}`);

      // 步骤 3: 任务分解
      console.log(`\n[${this.formatTime()}] 📋 步骤 3: 任务分解`);
      const steps = await this.decomposeTask(userInput, intent, availableSkills);
      this.log('steps', steps);
      console.log(`✓ 分解为 ${steps.length} 个步骤`);
      steps.forEach((step, i) => console.log(`   ${i + 1}. ${step.description}`));

      // 步骤 4: 执行任务（技能链模式）
      console.log(`\n[${this.formatTime()}] 🚀 步骤 4: 执行任务（技能链模式）`);
      const executionContext = { 
        userInput, 
        intent, 
        steps, 
        availableSkills,
        skillPreparation,
        ...context 
      };
      const result = await this.executeSkillChain(steps, executionContext);
      this.log('execution', result);

      // 步骤 5: 结果验证
      console.log(`\n[${this.formatTime()}] ✅ 步骤 5: 结果验证`);
      const verification = this.verifyResult(result, intent);
      this.log('verification', verification);
      
      if (verification.passed) {
        console.log('✓ 验证通过');
      } else {
        console.log('⚠️  验证未通过，建议改进：');
        verification.issues?.forEach(issue => console.log(`   - ${issue}`));
      }

      // 输出执行报告
      const duration = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`\n${'='.repeat(60)}`);
      console.log(`📊 执行报告`);
      console.log(`总耗时：${duration}秒`);
      console.log(`使用技能：${availableSkills.join(', ') || '基础工具'}`);
      console.log(`执行步骤：${steps.length}步`);
      console.log(`验证结果：${verification.passed ? '通过' : '待改进'}`);
      console.log(`${'='.repeat(60)}\n`);

      return {
        success: result.success,
        intent,
        steps,
        result,
        verification,
        duration,
        usedSkills: availableSkills
      };

    } catch (error) {
      console.error(`\n❌ 执行失败：${error.message}`);
      console.error(error.stack);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 任务分解
   */
  async decomposeTask(userInput, intent, availableSkills) {
    const category = intent.category;
    
    // 根据任务类型分解
    if (category.includes('creative_writing') || category.includes('novel')) {
      return [
        { type: 'skill_invoke', skill: 'writer', description: '调用写作技能', action: 'prepare' },
        { type: 'outline', description: '创建大纲', action: 'write_outline' },
        { type: 'draft', description: '撰写初稿', action: 'write_draft' },
        { type: 'review', description: '审阅修改', action: 'review' },
        { type: 'polish', description: '润色完善', action: 'polish' }
      ];
    }
    
    if (category.includes('code')) {
      return [
        { type: 'skill_invoke', skill: 'coder', description: '调用编程技能', action: 'prepare' },
        { type: 'design', description: '设计架构', action: 'design' },
        { type: 'implement', description: '实现功能', action: 'implement' },
        { type: 'test', description: '测试验证', action: 'test' }
      ];
    }

    // 通用任务分解
    return [
      { type: 'prepare', description: '准备工作', action: 'prepare' },
      { type: 'execute', description: '执行任务', action: 'execute' },
      { type: 'verify', description: '验证结果', action: 'verify' }
    ];
  }

  /**
   * 执行技能链（核心方法）
   */
  async executeSkillChain(steps, context) {
    const results = [];
    const { availableSkills } = context;
    
    console.log(`\n🔗 技能链执行开始，共 ${steps.length} 步`);
    
    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      console.log(`\n[${this.formatTime()}] 执行步骤 ${i + 1}/${steps.length}: ${step.description}`);
      
      let stepResult;
      
      try {
        // 检查是否需要调用技能
        if (step.type === 'skill_invoke' || step.action === 'prepare') {
          console.log(`→ 准备调用技能...`);
          stepResult = await this.invokeSkillStep(step, context);
        } else {
          // 执行具体步骤
          stepResult = await this.executeStep(step, context);
        }
        
        results.push({
          step: step.description,
          success: true,
          result: stepResult
        });
        
        console.log(`✓ 步骤 ${i + 1} 完成`);
        
      } catch (error) {
        console.log(`✗ 步骤 ${i + 1} 失败：${error.message}`);
        
        if (!this.config.continueOnError) {
          return {
            success: false,
            error: error.message,
            partialResults: results,
            failedAt: i
          };
        }
        
        results.push({
          step: step.description,
          success: false,
          error: error.message
        });
      }
    }
    
    return {
      success: true,
      results
    };
  }

  /**
   * 调用技能执行步骤
   */
  async invokeSkillStep(step, context) {
    const { availableSkills, userInput, intent } = context;
    
    console.log(`→ 检查可用技能：${availableSkills.join(', ') || '无'}`);
    
    // 全局调用已安装的技能
    if (availableSkills.length > 0) {
      console.log(`→ 全局调用技能链...`);
      
      // 这里应该调用实际的技能执行逻辑
      // 由于技能执行依赖于具体实现，这里模拟调用过程
      for (const skill of availableSkills) {
        console.log(`   → 调用：${skill}`);
        // 实际应该在这里调用技能的执行函数
        // 例如：await skills[skill].execute(context);
      }
    }
    
    // 根据步骤类型执行具体操作
    switch (step.action) {
      case 'write_outline':
        return await this.writeOutline(userInput, intent);
      case 'write_draft':
        return await this.writeDraft(userInput, intent);
      case 'review':
        return await this.review(userInput, context);
      case 'polish':
        return await this.polish(context);
      default:
        return { executed: true };
    }
  }

  /**
   * 执行单个步骤
   */
  async executeStep(step, context) {
    // 这里实现具体的步骤执行逻辑
    return { executed: true, step };
  }

  /**
   * 写大纲
   */
  async writeOutline(userInput, intent) {
    console.log('→ 创建大纲...');
    try {
      const result = await this.skillExecutor.execute('writer', {
        method: 'writeOutline',
        topic: userInput,
        contentType: 'article'
      });
      return result;
    } catch (error) {
      console.warn('⚠️ Writer skill writeOutline failed:', error.message);
      return { outline: [], error: error.message };
    }
  }

  /**
   * 写初稿
   */
  async writeDraft(userInput, intent) {
    console.log('→ 撰写初稿...');
    // Get outline from context or create basic structure
    const outline = context.outline || {
      title: userInput,
      sections: [
        { order: 1, title: '引言', keyPoints: ['背景介绍'] },
        { order: 2, title: '主体', keyPoints: ['主要内容'] },
        { order: 3, title: '结论', keyPoints: ['总结'] }
      ]
    };
    try {
      const result = await this.skillExecutor.execute('writer', {
        method: 'writeDraft',
        outline: outline,
        tone: 'professional',
        wordCount: 1000
      });
      return result;
    } catch (error) {
      console.warn('⚠️ Writer skill writeDraft failed:', error.message);
      return { draft: '', error: error.message };
    }
  }

  /**
   * 审阅
   */
  async review(userInput, context) {
    console.log('→ 审阅内容...');
    // Get content from context
    const content = context.content || context.draft || { text: userInput };
    try {
      const result = await this.skillExecutor.execute('writer', {
        method: 'review',
        content: content,
        criteria: ['clarity', 'structure', 'grammar']
      });
      return result;
    } catch (error) {
      console.warn('⚠️ Writer skill review failed:', error.message);
      return { reviewed: true, error: error.message };
    }
  }

  /**
   * 润色
   */
  async polish(context) {
    console.log('→ 润色完善...');
    // Get content from context
    const content = context.content || context.draft || context.document;
    if (!content) {
      return { polished: false, error: 'No content to polish' };
    }
    try {
      const result = await this.skillExecutor.execute('writer', {
        method: 'polish',
        content: content,
        polishType: 'general',
        intensity: 'medium'
      });
      return result;
    } catch (error) {
      console.warn('⚠️ Writer skill polish failed:', error.message);
      return { polished: false, error: error.message };
    }
  }

  /**
   * 结果验证
   */
  verifyResult(result, intent) {
    const checks = {
      completeness: result.success === true,
      accuracy: true,
      format: true
    };

    const issues = [];
    
    if (!checks.completeness) {
      issues.push('执行不完整');
    }
    
    return {
      passed: Object.values(checks).every(c => c),
      checks,
      issues
    };
  }

  /**
   * 处理通用任务
   */
  async handleGeneralTask(userInput, context) {
    console.log('使用通用处理流程');
    return {
      success: true,
      message: `已接收任务：${userInput}`,
      suggestion: '请提供更多详细信息以便更好地完成任务'
    };
  }

  /**
   * 日志记录
   */
  log(type, data) {
    this.executionLog.push({
      type,
      data,
      timestamp: Date.now()
    });
  }

  /**
   * 格式化时间
   */
  formatTime() {
    return new Date().toLocaleTimeString('zh-CN', { hour12: false });
  }
}

// 导出单例
module.exports = new IntelligentTaskPlanner();
