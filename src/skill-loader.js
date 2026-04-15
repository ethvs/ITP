/**
 * Skill Loader v2.0
 * 负责从文件系统加载技能，解析 SKILL.md 元数据，创技能执行实例
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

class SkillLoader {
  constructor() {
    this.skillsDir = path.join(process.cwd(), 'skills');
    this.registry = new Map();
    this.metadataCache = new Map();
  }

  /**
   * 扫描 skills 目录，加载所有技能
   */
  async loadAllSkills() {
    console.log('🔍 扫描技能目录...');

    if (!fs.existsSync(this.skillsDir)) {
      console.log(`⚠️ 技能目录不存在：${this.skillsDir}`);
      return [];
    }

    const entries = fs.readdirSync(this.skillsDir, { withFileTypes: true });
    const skills = [];

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const skillName = entry.name;
        const skillPath = path.join(this.skillsDir, skillName);
        const skill = await this.loadSkill(skillName, skillPath);
        if (skill) {
          skills.push(skill);
        }
      }
    }

    console.log(`✓ 已加载 ${skills.length} 个技能`);
    return skills;
  }

  /**
   * 加载单个技能
   */
  async loadSkill(name, skillPath) {
    const skillMdPath = path.join(skillPath, 'SKILL.md');

    if (!fs.existsSync(skillMdPath)) {
      console.log(`⚠️ 技能 ${name} 缺少 SKILL.md，跳过`);
      return null;
    }

    try {
      const content = fs.readFileSync(skillMdPath, 'utf-8');
      const metadata = this.parseSkillMd(content);

      // 加载执行模块
      const executorPath = path.join(skillPath, metadata.execute?.module || 'index.js');
      let executor = null;

      if (fs.existsSync(executorPath)) {
        try {
          delete require.cache[require.resolve(executorPath)];
          executor = require(executorPath);
        } catch (err) {
          console.log(`⚠️ 技能 ${name} 执行模块加载失败：${err.message}`);
        }
      }

      const skill = {
        name,
        path: skillPath,
        metadata,
        executor,
        loadedAt: Date.now()
      };

      // 注册到注册表
      this.registry.set(name, skill);

      // 缓存元数据
      this.metadataCache.set(name, metadata);

      console.log(`✓ 加载技能：${name} (${metadata.name || name})`);
      return skill;

    } catch (error) {
      console.error(`✗ 加载技能 ${name} 失败：${error.message}`);
      return null;
    }
  }

  /**
   * 解析 SKILL.md 文件
   */
  parseSkillMd(content) {
    const lines = content.split('\n');
    let inFrontmatter = false;
    let frontmatterContent = [];
    let markdownContent = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (i === 0 && line.trim() === '---') {
        inFrontmatter = true;
        continue;
      }

      if (inFrontmatter && line.trim() === '---') {
        inFrontmatter = false;
        continue;
      }

      if (inFrontmatter) {
        frontmatterContent.push(line);
      } else {
        markdownContent.push(line);
      }
    }

    // 解析 YAML frontmatter
    let metadata = {};
    if (frontmatterContent.length > 0) {
      try {
        metadata = yaml.load(frontmatterContent.join('\n')) || {};
      } catch (err) {
        console.log(`⚠️ YAML 解析失败：${err.message}`);
      }
    }

    // 添加原始内容
    metadata._rawContent = markdownContent.join('\n');

    // 设置默认值
    metadata.name = metadata.name || 'Unknown Skill';
    metadata.version = metadata.version || '1.0.0';
    metadata.description = metadata.description || '';
    metadata.author = metadata.author || 'Unknown';
    metadata.tags = metadata.tags || [];
    metadata.category = metadata.category || 'general';

    return metadata;
  }

  /**
   * 根据名称获取技能
   */
  getSkill(name) {
    // 精确匹配
    if (this.registry.has(name)) {
      return this.registry.get(name);
    }

    // 模糊匹配
    const normalizedName = name.toLowerCase().replace(/[-_]/g, '');
    for (const [key, skill] of this.registry.entries()) {
      const normalizedKey = key.toLowerCase().replace(/[-_]/g, '');
      if (normalizedKey === normalizedName) {
        return skill;
      }
    }

    return null;
  }

  /**
   * 获取所有已加载技能的元数据
   */
  getAllMetadata() {
    const result = [];
    for (const [name, skill] of this.registry.entries()) {
      result.push({
        name,
        ...skill.metadata
      });
    }
    return result;
  }

  /**
   * 搜索技能
   */
  searchSkills(query) {
    const results = [];
    const lowerQuery = query.toLowerCase();

    for (const [name, skill] of this.registry.entries()) {
      const score = this.calculateMatchScore(skill.metadata, lowerQuery);
      if (score > 0) {
        results.push({
          name,
          score,
          metadata: skill.metadata
        });
      }
    }

    return results.sort((a, b) => b.score - a.score);
  }

  /**
   * 计算匹配分数
   */
  calculateMatchScore(metadata, query) {
    let score = 0;

    // 名称完全匹配
    if (metadata.name?.toLowerCase() === query) {
      score += 100;
    } else if (metadata.name?.toLowerCase().includes(query)) {
      score += 50;
    }

    // 标签匹配
    if (metadata.tags?.some(tag => tag.toLowerCase().includes(query))) {
      score += 30;
    }

    // 描述匹配
    if (metadata.description?.toLowerCase().includes(query)) {
      score += 20;
    }

    // 类别匹配
    if (metadata.category?.toLowerCase().includes(query)) {
      score += 15;
    }

    return score;
  }

  /**
   * 卸载技能
   */
  unloadSkill(name) {
    if (this.registry.has(name)) {
      this.registry.delete(name);
      this.metadataCache.delete(name);
      console.log(`✓ 卸载技能：${name}`);
      return true;
    }
    return false;
  }

  /**
   * 清空所有技能
   */
  clearRegistry() {
    this.registry.clear();
    this.metadataCache.clear();
    console.log('✓ 清空技能注册表');
  }
}

// 导出单例
module.exports = new SkillLoader();
