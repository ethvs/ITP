/**
 * Checkpoint Manager - 检查点管理器
 * 负责任务检查点的创建、存储和恢复
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

class CheckpointManager {
  constructor() {
    this.checkpointDir = path.join(
      process.env.HERMES_HOME || path.join(os.homedir(), '.hermes'),
      'checkpoints',
      'itp'
    );
    this.ensureCheckpointDir();
    this.checkpoints = new Map();
    this.loadExistingCheckpoints();
  }

  /**
   * 确保检查点目录存在
   */
  ensureCheckpointDir() {
    if (!fs.existsSync(this.checkpointDir)) {
      fs.mkdirSync(this.checkpointDir, { recursive: true });
    }
  }

  /**
   * 加载现有检查点
   */
  loadExistingCheckpoints() {
    if (!fs.existsSync(this.checkpointDir)) return;

    const files = fs.readdirSync(this.checkpointDir).
                       filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.checkpointDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
        const checkpointId = path.basename(file, '.json');
        this.checkpoints.set(checkpointId, data);
      } catch (error) {
        console.warn(`[ITP Checkpoint] 加载检查点失败: ${file}`);
      }
    }
  }

  /**
   * 创建检查点
   */
  async save(checkpoint) {
    const checkpointId = checkpoint.checkpoint_id || this.generateId();
    const fullCheckpoint = {
      ...checkpoint,
      checkpoint_id: checkpointId,
      saved_at: new Date().toISOString()
    };

    const filePath = path.join(this.checkpointDir, `${checkpointId}.json`);

    try {
      fs.writeFileSync(filePath, JSON.stringify(fullCheckpoint, null, 2), 'utf-8');
      this.checkpoints.set(checkpointId, fullCheckpoint);

      // 清理过期检查点
      this.cleanupOldCheckpoints();

      console.log(`[ITP Checkpoint] 已保存: ${checkpointId}`);
      return fullCheckpoint;
    } catch (error) {
      console.error(`[ITP Checkpoint] 保存失败: ${error.message}`);
      throw error;
    }
  }

  /**
   * 加载检查点
   */
  async load(checkpointId) {
    // 首先从内存查找
    if (this.checkpoints.has(checkpointId)) {
      return this.checkpoints.get(checkpointId);
    }

    // 从文件加载
    const filePath = path.join(this.checkpointDir, `${checkpointId}.json`);

    try {
      if (!fs.existsSync(filePath)) {
        return null;
      }

      const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
      this.checkpoints.set(checkpointId, data);
      return data;
    } catch (error) {
      console.error(`[ITP Checkpoint] 加载失败: ${error.message}`);
      return null;
    }
  }

  /**
   * 列出所有检查点
   */
  async list() {
    const checkpoints = [];

    for (const [id, data] of this.checkpoints) {
      checkpoints.push({
        id,
        label: data.label || '未命名',
        stage: data.stage || 'unknown',
        step: data.step || 0,
        created_at: data.created_at,
        saved_at: data.saved_at
      });
    }

    return checkpoints.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    );
  }

  /**
   * 删除检查点
   */
  async delete(checkpointId) {
    this.checkpoints.delete(checkpointId);

    const filePath = path.join(this.checkpointDir, `${checkpointId}.json`);

    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        return true;
      }
      return false;
    } catch (error) {
      console.error(`[ITP Checkpoint] 删除失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 清理过期检查点
   */
  cleanupOldCheckpoints(retentionDays = 30) {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const files = fs.readdirSync(this.checkpointDir).
                       filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const filePath = path.join(this.checkpointDir, file);
        const stat = fs.statSync(filePath);

        if (stat.mtime < cutoffDate) {
          fs.unlinkSync(filePath);
          const checkpointId = path.basename(file, '.json');
          this.checkpoints.delete(checkpointId);
        }
      } catch (error) {
        // 忽略清理错误
      }
    }
  }

  /**
   * 生成检查点ID
   */
  generateId() {
    return crypto.randomBytes(4).toString('hex');
  }

  /**
   * 创建执行上下文快照
   */
  createSnapshot(context, stage, step, results = {}) {
    return {
      checkpoint_id: this.generateId(),
      created_at: new Date().toISOString(),
      label: `SNAPSHOT_${stage}_${step}`,
      stage,
      step,
      context_snapshot: {
        input: context.input || context,
        timestamp: Date.now()
      },
      intermediate_results: results,
      current_stage: this.getStageName(stage)
    };
  }

  /**
   * 获取阶段名称
   */
  getStageName(stage) {
    const stages = {
      T1: '需求分析',
      T2: '核心创建',
      T3: '质量优化',
      T4: '交付输出'
    };
    return stages[stage] || stage;
  }

  /**
   * 从检查点恢复状态
   */
  async restore(checkpointId) {
    const checkpoint = await this.load(checkpointId);
    if (!checkpoint) {
      throw new Error(`检查点不存在: ${checkpointId}`);
    }

    return {
      success: true,
      checkpointId,
      stage: checkpoint.stage,
      step: checkpoint.step,
      context: checkpoint.context_snapshot,
      results: checkpoint.intermediate_results,
      resumeMessage: `已从检查点 [${checkpointId}] 恢复，当前阶段: ${this.getStageName(checkpoint.stage)}`
    };
  }

  /**
   * 获取最近的检查点
   */
  async getLatest() {
    const checkpoints = await this.list();
    if (checkpoints.length === 0) {
      return null;
    }
    return this.load(checkpoints[0].id);
  }

  /**
   * 导出检查点到指定路径
   */
  async export(checkpointId, exportPath) {
    const checkpoint = await this.load(checkpointId);
    if (!checkpoint) {
      throw new Error(`检查点不存在: ${checkpointId}`);
    }

    fs.writeFileSync(
      exportPath,
      JSON.stringify(checkpoint, null, 2),
      'utf-8'
    );

    return { success: true, exportPath };
  }

  /**
   * 从指定路径导入检查点
   */
  async import(importPath) {
    const data = JSON.parse(fs.readFileSync(importPath, 'utf-8'));
    return this.save(data);
  }

  /**
   * 统计检查点信息
   */
  getStatistics() {
    return {
      total: this.checkpoints.size,
      byStage: this.countByStage(),
      directory: this.checkpointDir
    };
  }

  /**
   * 按阶段统计
   */
  countByStage() {
    const counts = {};
    for (const data of this.checkpoints.values()) {
      const stage = data.stage || 'unknown';
      counts[stage] = (counts[stage] || 0) + 1;
    }
    return counts;
  }
}

module.exports = CheckpointManager;
