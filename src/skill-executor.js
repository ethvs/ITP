/**
 * Skill Executor v1.0
 * 统一技能执行接口 - 负责调用已加载的技能并管理执行上下文
 */

const skillLoader = require('./skill-loader');

class SkillExecutor {
  constructor() {
    this.executionHistory = new Map();
    this.maxHistoryPerSkill = 100;
    this.defaultTimeout = 30000; // 30秒
  }

  /**
   * 统一执行接口 - 执行指定技能
   * @param {string} skillName - 技能名称
   * @param {Object} context - 执行上下文
   * @param {Object} options - 执行选项
   * @returns {Promise<Object>} 执行结果
   */
  async execute(skillName, context = {}, options = {}) {
    const startTime = Date.now();
    const executionId = this.generateExecutionId();

    console.log(`[SkillExecutor] 开始执行技能: ${skillName} (ID: ${executionId})`);

    try {
      // 1. 获取技能
      const skill = skillLoader.getSkill(skillName);
      if (!skill) {
        throw new Error(`技能未找到: ${skillName}`);
      }

      // 2. 验证执行器
      if (!skill.executor) {
        throw new Error(`技能 ${skillName} 没有可执行模块`);
      }

      // 3. 准备执行上下文
      const enrichedContext = this.enrichContext(context, skill, executionId);

      // 4. 执行前钩子
      await this.beforeExecute(skill, enrichedContext, options);

      // 5. 执行技能
      const timeout = options.timeout || this.defaultTimeout;
      const result = await this.runWithTimeout(
        () => this.invokeSkillExecutor(skill, enrichedContext),
        timeout
      );

      // 6. 验证结果
      const validatedResult = this.validateResult(result);

      // 7. 执行后钩子
      await this.afterExecute(skill, enrichedContext, validatedResult);

      // 8. 记录历史
      this.recordExecution(skillName, {
        executionId,
        success: true,
        duration: Date.now() - startTime,
        result: validatedResult
      });

      console.log(`[SkillExecutor] ✓ 技能执行成功: ${skillName} (${Date.now() - startTime}ms)`);

      return {
        success: true,
        skill: skillName,
        executionId,
        duration: Date.now() - startTime,
        result: validatedResult,
        metadata: {
          name: skill.metadata?.name || skillName,
          version: skill.metadata?.version || '1.0.0',
          category: skill.metadata?.category || 'general'
        }
      };

    } catch (error) {
      // 记录失败
      this.recordExecution(skillName, {
        executionId,
        success: false,
        duration: Date.now() - startTime,
        error: error.message
      });

      console.error(`[SkillExecutor] ✗ 技能执行失败: ${skillName} - ${error.message}`);

      return {
        success: false,
        skill: skillName,
        executionId,
        duration: Date.now() - startTime,
        error: error.message,
        errorType: error.name || 'ExecutionError',
        suggestions: this.generateErrorSuggestions(error, skillName)
      };
    }
  }

  /**
   * 调用技能执行器
   */
  async invokeSkillExecutor(skill, context) {
    const executor = skill.executor;

    // 支持多种导出格式
    if (typeof executor === 'function') {
      // 默认导出的函数
      return await executor(context);
    } else if (executor.execute && typeof executor.execute === 'function') {
      // 带有 execute 方法的对象
      return await executor.execute(context);
    } else if (executor.default && typeof executor.default === 'function') {
      // ES Module default 导出
      return await executor.default(context);
    } else {
      throw new Error(`技能 ${skill.name} 没有有效的执行方法`);
    }
  }

  /**
   * 超时执行包装器
   */
  runWithTimeout(fn, timeout) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`执行超时 (${timeout}ms)`));
      }, timeout);

      Promise.resolve(fn())
        .then(result => {
          clearTimeout(timer);
          resolve(result);
        })
        .catch(error => {
          clearTimeout(timer);
          reject(error);
        });
    });
  }

  /**
   * 增强执行上下文
   */
  enrichContext(context, skill, executionId) {
    return {
      ...context,
      _skill: {
        name: skill.name,
        path: skill.path,
        metadata: skill.metadata
      },
      _execution: {
        id: executionId,
        timestamp: Date.now()
      }
    };
  }

  /**
   * 执行前钩子
   */
  async beforeExecute(skill, context, options) {
    // 可以扩展：权限检查、资源分配等
    if (skill.metadata?.hooks?.beforeExecute) {
      await skill.metadata.hooks.beforeExecute(context);
    }
  }

  /**
   * 执行后钩子
   */
  async afterExecute(skill, context, result) {
    // 可以扩展：资源释放、事件通知等
    if (skill.metadata?.hooks?.afterExecute) {
      await skill.metadata.hooks.afterExecute(context, result);
    }
  }

  /**
   * 验证执行结果
   */
  validateResult(result) {
    // 确保返回值是对象
    if (result === null || result === undefined) {
      return { value: null };
    }
    if (typeof result !== 'object') {
      return { value: result };
    }
    return result;
  }

  /**
   * 批量执行多个技能
   * @param {Array} skills - 技能列表 [{name, context, options}]
   * @param {Object} batchOptions - 批量选项
   * @returns {Promise<Array>} 执行结果列表
   */
  async executeBatch(skills, batchOptions = {}) {
    const { sequential = false, stopOnError = false } = batchOptions;
    const results = [];

    if (sequential) {
      // 顺序执行
      for (const skillConfig of skills) {
        const result = await this.execute(
          skillConfig.name,
          skillConfig.context || {},
          skillConfig.options || {}
        );
        results.push(result);

        if (!result.success && stopOnError) {
          break;
        }
      }
    } else {
      // 并行执行
      const promises = skills.map(skillConfig =>
        this.execute(
          skillConfig.name,
          skillConfig.context || {},
          skillConfig.options || {}
        )
      );
      const settledResults = await Promise.allSettled(promises);

      for (const [index, settled] of settledResults.entries()) {
        if (settled.status === 'fulfilled') {
          results.push(settled.value);
        } else {
          results.push({
            success: false,
            skill: skills[index]?.name || 'unknown',
            error: settled.reason?.message || '执行失败',
            errorType: 'BatchExecutionError'
          });
        }
      }
    }

    return results;
  }

  /**
   * 执行技能链
   * @param {Array} chain - 技能链定义
   * @param {Object} initialContext - 初始上下文
   * @returns {Promise<Object>} 链执行结果
   */
  async executeChain(chain, initialContext = {}) {
    console.log(`[SkillExecutor] 开始执行技能链: ${chain.length} 个步骤`);

    const results = [];
    let context = { ...initialContext };

    for (let i = 0; i < chain.length; i++) {
      const step = chain[i];
      console.log(`[SkillExecutor] 链步骤 ${i + 1}/${chain.length}: ${step.name || step.skill}`);

      try {
        // 支持条件执行
        if (step.condition && !this.evaluateCondition(step.condition, context)) {
          console.log(`[SkillExecutor] 跳过条件不满足的步骤: ${step.name}`);
          continue;
        }

        const result = await this.execute(step.skill, {
          ...context,
          _chain: {
            index: i,
            total: chain.length,
            previousResults: results
          }
        }, step.options);

        results.push({
          step: i,
          name: step.name || step.skill,
          ...result
        });

        // 更新上下文
        if (step.outputKey) {
          context[step.outputKey] = result.result;
        }

        // 失败处理
        if (!result.success) {
          if (step.onError === 'continue') {
            console.log(`[SkillExecutor] 步骤失败但继续执行`);
            continue;
          } else {
            console.error(`[SkillExecutor] 步骤失败，停止执行链`);
            break;
          }
        }

      } catch (error) {
        console.error(`[SkillExecutor] 步骤异常: ${error.message}`);
        results.push({
          step: i,
          name: step.name || step.skill,
          success: false,
          error: error.message
        });

        if (step.onError !== 'continue') {
          break;
        }
      }
    }

    const allSuccess = results.every(r => r.success);
    console.log(`[SkillExecutor] 技能链执行完成: ${allSuccess ? '成功' : '部分失败'}`);

    return {
      success: allSuccess,
      results,
      finalContext: context
    };
  }

  /**
   * 评估条件表达式
   */
  evaluateCondition(condition, context) {
    if (typeof condition === 'function') {
      return condition(context);
    }
    if (typeof condition === 'boolean') {
      return condition;
    }
    // 简单的键值存在检查
    if (typeof condition === 'string') {
      return !!context[condition];
    }
    return true;
  }

  /**
   * 记录执行历史
   */
  recordExecution(skillName, record) {
    if (!this.executionHistory.has(skillName)) {
      this.executionHistory.set(skillName, []);
    }

    const history = this.executionHistory.get(skillName);
    history.push(record);

    // 限制历史记录大小
    if (history.length > this.maxHistoryPerSkill) {
      history.shift();
    }
  }

  /**
   * 获取技能执行历史
   */
  getExecutionHistory(skillName) {
    return this.executionHistory.get(skillName) || [];
  }

  /**
   * 生成执行ID
   */
  generateExecutionId() {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * 生成错误建议
   */
  generateErrorSuggestions(error, skillName) {
    const suggestions = [];

    if (error.message.includes('技能未找到')) {
      suggestions.push(`使用 'clawhub search ${skillName}' 搜索可用技能`);
      suggestions.push(`使用 'clawhub list' 查看已安装技能`);
    }

    if (error.message.includes('没有可执行模块')) {
      suggestions.push(`检查 SKILL.md 中的 execute.module 配置`);
      suggestions.push(`确认技能目录中包含有效的执行文件`);
    }

    if (error.message.includes('超时')) {
      suggestions.push(`增加超时时间: execute('${skillName}', context, { timeout: 60000 })`);
      suggestions.push(`检查技能是否存在死循环或长时间等待`);
    }

    if (error.message.includes('没有有效的执行方法')) {
      suggestions.push(`确保技能模块导出函数或包含 execute 方法的对象`);
      suggestions.push(`示例: module.exports = async (context) => { return result; }`);
    }

    return suggestions.length > 0 ? suggestions : ['查看详细错误日志以获取更多信息'];
  }

  /**
   * 获取执行统计
   */
  getStatistics() {
    const stats = {
      totalSkills: this.executionHistory.size,
      totalExecutions: 0,
      successCount: 0,
      failCount: 0,
      averageDuration: 0
    };

    let totalDuration = 0;

    for (const [skillName, history] of this.executionHistory.entries()) {
      stats.totalExecutions += history.length;

      for (const record of history) {
        if (record.success) {
          stats.successCount++;
        } else {
          stats.failCount++;
        }
        totalDuration += record.duration || 0;
      }
    }

    if (stats.totalExecutions > 0) {
      stats.averageDuration = Math.round(totalDuration / stats.totalExecutions);
    }

    stats.successRate = stats.totalExecutions > 0
      ? ((stats.successCount / stats.totalExecutions) * 100).toFixed(1)
      : 0;

    return stats;
  }

  /**
   * 清空执行历史
   */
  clearHistory(skillName) {
    if (skillName) {
      this.executionHistory.delete(skillName);
    } else {
      this.executionHistory.clear();
    }
  }
}

// 导出单例
module.exports = new SkillExecutor();
