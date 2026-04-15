/**
 * Config Manager - ITP 配置管理器
 * 管理 ~/.hermes/config.yaml 中的 itp_enhancement 配置
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const yaml = require('js-yaml');

class ConfigManager {
  constructor() {
    this.configDir = process.env.HERMES_HOME || path.join(os.homedir(), '.hermes');
    this.configFile = path.join(this.configDir, 'config.yaml');
    this.taskTemplatesFile = path.join(this.configDir, 'task_templates.yaml');

    // 默认配置
    this.defaultConfig = {
      itp_enhancement: {
        enabled: true,
        auto_activate: true,
        quality_gate: {
          enabled: true,
          auto_polish: true,
          max_iterations: 3,
          thresholds: {
            completeness: 0.90,
            ai_score: 0.05,
            logic_consistency: 0.90,
            fluency: 0.90,
            format_compliance: 0.95,
            boundary_coverage: 0.80
          }
        },
        stage_tracking: {
          enabled: true,
          show_progress_bar: true,
          emoji_mode: true
        },
        model_routing: {
          enabled: true,
          cost_optimization: true
        },
        transparency: {
          show_before_execution: true,
          include_cost_estimate: true
        },
        checkpoint: {
          auto_save_steps: 5,
          max_per_task: 5,
          retention_days: 30
        }
      }
    };

    this.config = null;
    this.taskTemplates = null;
  }

  /**
   * 获取当前配置（优先读取文件，否则使用默认值）
   */
  getConfig() {
    if (this.config) {
      return this.config;
    }

    try {
      if (fs.existsSync(this.configFile)) {
        const content = fs.readFileSync(this.configFile, 'utf-8');
        const userConfig = yaml.load(content) || {};
        this.config = this.mergeConfig(this.defaultConfig, userConfig.itp_enhancement ? userConfig : { itp_enhancement: userConfig });
      } else {
        this.config = { ...this.defaultConfig };
        this.ensureConfigFile();
      }
    } catch (error) {
      console.warn(`[ITP Config] 读取配置失败: ${error.message}，使用默认配置`);
      this.config = { ...this.defaultConfig };
    }

    return this.config;
  }

  /**
   * 合并配置（深度合并）
   */
  mergeConfig(defaultConfig, userConfig) {
    const result = JSON.parse(JSON.stringify(defaultConfig));

    for (const key in userConfig) {
      if (userConfig.hasOwnProperty(key)) {
        if (typeof userConfig[key] === 'object' && userConfig[key] !== null && !Array.isArray(userConfig[key])) {
          result[key] = this.mergeConfig(result[key] || {}, userConfig[key]);
        } else {
          result[key] = userConfig[key];
        }
      }
    }

    return result;
  }

  /**
   * 确保配置文件存在
   */
  ensureConfigFile() {
    try {
      if (!fs.existsSync(this.configDir)) {
        fs.mkdirSync(this.configDir, { recursive: true });
      }

      const yamlContent = yaml.dump(this.defaultConfig, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      fs.writeFileSync(this.configFile, yamlContent, 'utf-8');
    } catch (error) {
      console.warn(`[ITP Config] 创建配置文件失败: ${error.message}`);
    }
  }

  /**
   * 获取任务模板配置
   */
  getTaskTemplates() {
    if (this.taskTemplates) {
      return this.taskTemplates;
    }

    const defaultTemplates = {
      creative_writing: {
        stages: ['T1', 'T2', 'T3', 'T4'],
        quality_focus: ['ai_score', 'fluency', 'logic_consistency'],
        polishing_intensity: 'high',
        checkpoint_frequency: 3
      },
      code_generation: {
        stages: ['T1', 'T2', 'T4'],
        quality_focus: ['completeness', 'format_compliance', 'boundary_coverage'],
        polishing_intensity: 'medium',
        checkpoint_frequency: 5
      },
      data_analysis: {
        stages: ['T1', 'T2', 'T3', 'T4'],
        quality_focus: ['logic_consistency', 'boundary_coverage', 'completeness'],
        polishing_intensity: 'medium',
        checkpoint_frequency: 4
      },
      general: {
        stages: ['T1', 'T2', 'T4'],
        quality_focus: ['completeness', 'fluency'],
        polishing_intensity: 'low',
        checkpoint_frequency: 5
      }
    };

    try {
      if (fs.existsSync(this.taskTemplatesFile)) {
        const content = fs.readFileSync(this.taskTemplatesFile, 'utf-8');
        const userTemplates = yaml.load(content) || {};
        this.taskTemplates = { ...defaultTemplates, ...userTemplates };
      } else {
        this.taskTemplates = defaultTemplates;
      }
    } catch (error) {
      this.taskTemplates = defaultTemplates;
    }

    return this.taskTemplates;
  }

  /**
   * 获取特定任务类型的配置
   */
  getTaskTypeConfig(taskType) {
    const templates = this.getTaskTemplates();
    return templates[taskType] || templates.general;
  }

  /**
   * 更新配置
   */
  updateConfig(updates) {
    const currentConfig = this.getConfig();
    this.config = this.mergeConfig(currentConfig, updates);

    try {
      const yamlContent = yaml.dump(this.config, {
        indent: 2,
        lineWidth: -1,
        noRefs: true
      });

      fs.writeFileSync(this.configFile, yamlContent, 'utf-8');
      return true;
    } catch (error) {
      console.error(`[ITP Config] 更新配置失败: ${error.message}`);
      return false;
    }
  }

  /**
   * 检查功能是否启用
   */
  isEnabled(feature) {
    const config = this.getConfig();
    const parts = feature.split('.');
    let current = config.itp_enhancement;

    for (const part of parts) {
      if (current === undefined) return false;
      current = current[part];
    }

    return current !== false;
  }

  /**
   * 获取质量阈值
   */
  getQualityThresholds() {
    const config = this.getConfig();
    return config.itp_enhancement?.quality_gate?.thresholds || this.defaultConfig.itp_enhancement.quality_gate.thresholds;
  }
}

module.exports = ConfigManager;
