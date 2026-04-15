/**
 * 技能匹配器 v2.0 - 增强版
 * 支持：已安装技能检查 → ClawHub 搜索 → 近似技能匹配
 */
const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

class SkillMatcher {
  constructor() {
    this.installedSkills = [];
    this.searchCache = new Map();
    
    // 技能相似度映射表（用于查找替代技能）
    this.skillSimilarityMap = {
      // 写作类
      'writer': ['writing', 'author', 'content', 'text', 'creative'],
      'storyteller': ['story', 'narrative', 'tale', 'fiction'],
      'novel-writer': ['novel', 'fiction', 'story', 'book'],
      'content-writer': ['content', 'article', 'blog', 'post'],
      
      // 代码类
      'coder': ['code', 'programming', 'developer'],
      'python-coder': ['python', 'py', 'script'],
      'js-coder': ['javascript', 'js', 'node', 'react'],
      
      // 分析类
      'analyzer': ['analyze', 'analysis', 'data'],
      'data-analyzer': ['data', 'statistics', 'chart'],
      
      // 图片类
      'imagegen': ['image', 'picture', 'draw', 'art'],
      'image-generator': ['image', 'picture', 'generate'],
      
      // 工具类
      'search': ['search', 'find', 'lookup'],
      'fetch': ['fetch', 'get', 'download'],
    };
  }

  /**
   * 获取已安装的技能列表（从 lockfile）
   */
  async getInstalledSkills() {
    if (this.installedSkills.length > 0) {
      return this.installedSkills;
    }

    try {
      // 从 lockfile 读取已安装的技能
      const lockfilePath = path.join(process.cwd(), 'clawhub-lock.json');
      if (fs.existsSync(lockfilePath)) {
        const lockData = JSON.parse(fs.readFileSync(lockfilePath, 'utf-8'));
        this.installedSkills = lockData.skills?.map(s => s.name) || [];
      }
      
      // 如果没有 lockfile，尝试用 clawhub list
      if (this.installedSkills.length === 0) {
        try {
          const result = execSync('clawhub list 2>/dev/null', { 
            encoding: 'utf-8',
            stdio: ['pipe', 'pipe', 'ignore']
          });
          // 解析输出（假设是表格格式）
          const lines = result.split('\n').filter(line => line.trim());
          this.installedSkills = lines
            .slice(1) // 跳过表头
            .map(line => line.split(/\s+/).filter(Boolean)[0])
            .filter(name => name && !name.startsWith('─'));
        } catch (e) {
          console.log('⚠️  无法获取已安装技能列表');
        }
      }

      console.log(`📦 已安装技能：${this.installedSkills.length > 0 ? this.installedSkills.join(', ') : '无'}`);
      return this.installedSkills;
    } catch (error) {
      console.log('获取已安装技能失败，返回空列表');
      return [];
    }
  }

  /**
   * 检查技能是否已安装
   */
  isSkillInstalled(skillName) {
    const installed = this.installedSkills;
    return installed.some(s => {
      // 完全匹配
      if (s === skillName) return true;
      // 包含匹配
      if (s.includes(skillName) || skillName.includes(s)) return true;
      // 去掉前后缀后匹配
      const normalized = s.replace(/-/g, '').toLowerCase();
      const normalizedTarget = skillName.replace(/-/g, '').toLowerCase();
      return normalized === normalizedTarget;
    });
  }

  /**
   * 从 ClawHub 搜索技能
   */
  async searchClawHub(query) {
    // 检查缓存
    if (this.searchCache.has(query)) {
      return this.searchCache.get(query);
    }

    try {
      const result = execSync(`clawhub search ${query}`, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'ignore'],
        timeout: 10000
      });
      
      // 解析搜索结果（假设是表格格式）
      const skills = this.parseClawHubOutput(result, query);
      this.searchCache.set(query, skills);
      return skills;
    } catch (error) {
      console.log(`⚠️  ClawHub 搜索失败：${query}`);
      return [];
    }
  }

  /**
   * 解析 ClawHub 输出
   */
  parseClawHubOutput(output, query) {
    const skills = [];
    const lines = output.split('\n').filter(line => line.trim());
    
    // 跳过表头，解析每一行
    for (const line of lines) {
      if (line.includes('──') || line.includes('名称') || line.trim().startsWith('○')) {
        continue;
      }
      
      // 尝试提取技能名称和描述
      const parts = line.split(/\s{2,}/).map(p => p.trim()).filter(Boolean);
      if (parts.length > 0) {
        const name = parts[0]?.replace(/^[●○]/, '').trim();
        const desc = parts.slice(1).join(' ').trim();
        
        if (name && name.length < 50) { // 过滤掉无效行
          skills.push({
            name,
            description: desc || '',
            source: 'clawhub',
            score: this.calculateRelevanceScore(name, query)
          });
        }
      }
    }
    
    return skills;
  }

  /**
   * 计算技能与查询的相关性分数
   */
  calculateRelevanceSkill(skillName, query) {
    const skill = skillName.toLowerCase();
    const q = query.toLowerCase();
    
    // 完全匹配
    if (skill === q) return 100;
    
    // 包含关系
    if (skill.includes(q) || q.includes(skill)) return 80;
    
    // 部分匹配
    const skillWords = skill.split(/[-_\s]/);
    const queryWords = q.split(/[-_\s]/);
    
    const matchCount = skillWords.filter(w => 
      queryWords.some(qw => w.includes(qw) || qw.includes(w))
    ).length;
    
    return Math.round((matchCount / Math.max(skillWords.length, queryWords.length)) * 60);
  }

  /**
   * 查找近似技能（当精确匹配失败时）
   */
  async findSimilarSkills(requiredSkill, allSkills) {
    console.log(`🔍 查找 "${requiredSkill}" 的近似技能...`);
    
    // 获取相似关键词
    const similarKeywords = this.skillSimilarityMap[requiredSkill] || [];
    
    // 从已安装技能中找
    const installed = await this.getInstalledSkills();
    for (const installedSkill of installed) {
      // 检查是否是近义词
      for (const keyword of similarKeywords) {
        if (installedSkill.toLowerCase().includes(keyword)) {
          console.log(`✓ 找到近似技能：${installedSkill} (基于关键词：${keyword})`);
          return installedSkill;
        }
      }
    }
    
    // 从 ClawHub 搜索近义词
    for (const keyword of similarKeywords) {
      const results = await this.searchClawHub(keyword);
      if (results.length > 0) {
        const bestMatch = results[0].name;
        console.log(`✓ ClawHub 找到近似技能：${bestMatch} (关键词：${keyword})`);
        return bestMatch;
      }
    }
    
    // 尝试通用技能
    const generalSkills = ['writer', 'helper', 'tool', 'utils'];
    for (const general of generalSkills) {
      if (requiredSkill.includes(general) || general.includes(requiredSkill)) {
        return general;
      }
    }
    
    return null;
  }

  /**
   * 主方法：准备技能（优先已安装，其次搜索，最后找近似）
   */
  async prepareSkills(requiredSkills) {
    const result = {
      installed: [],
      toInstall: [],
      alternatives: [],
      missing: []
    };

    console.log('\n🔧 步骤 2: 技能匹配与准备');
    console.log(`需要的技能：${requiredSkills.join(', ') || '无特定技能需求'}`);

    // 1. 首先获取已安装技能
    await this.getInstalledSkills();

    // 2. 对每个需要的技能进行检查
    for (const skill of requiredSkills) {
      // 2.1 检查是否已安装
      if (this.isSkillInstalled(skill)) {
        console.log(`✓ 已安装：${skill}`);
        result.installed.push(skill);
        continue;
      }

      // 2.2 在 ClawHub 搜索
      console.log(`🔍 ClawHub 搜索：${skill}`);
      const searchResults = await this.searchClawHub(skill);
      
      if (searchResults.length > 0) {
        // 找到匹配技能，选择评分最高的
        const bestMatch = searchResults.sort((a, b) => b.score - a.score)[0];
        console.log(`✓ 找到技能：${bestMatch.name} (评分：${bestMatch.score})`);
        result.toInstall.push(bestMatch.name);
        continue;
      }

      // 2.3 查找近似技能
      const similarSkill = await this.findSimilarSkills(skill, this.installedSkills);
      if (similarSkill) {
        console.log(`✓ 使用近似技能：${similarSkill}`);
        result.alternatives.push({
          original: skill,
          alternative: similarSkill
        });
        result.toInstall.push(similarSkill);
        continue;
      }

      // 2.4 实在找不到
      console.log(`✗ 未找到技能：${skill}`);
      result.missing.push(skill);
    }

    // 3. 安装缺失的技能
    if (result.toInstall.length > 0) {
      console.log(`\n📥 准备安装技能：${result.toInstall.join(', ')}`);
      for (const skill of result.toInstall) {
        if (!this.isSkillInstalled(skill)) {
          const installed = await this.installSkill(skill);
          if (installed) {
            this.installedSkills.push(skill);
          }
        }
      }
    }

    return result;
  }

  /**
   * 安装技能
   */
  async installSkill(skillName) {
    console.log(`📦 安装技能：${skillName}`);
    try {
      execSync(`clawhub install ${skillName}`, { 
        stdio: 'inherit',
        timeout: 60000
      });
      console.log(`✓ 安装成功：${skillName}`);
      return true;
    } catch (error) {
      console.log(`✗ 安装失败：${skillName} - ${error.message}`);
      return false;
    }
  }

  /**
   * 全局调用已安装技能
   */
  async invokeInstalledSkills(skillNames, context = {}) {
    console.log('\n🚀 全局调用技能');
    const results = [];
    
    const skillExecutor = require('./skill-executor');

    for (const skillName of skillNames) {
      if (this.isSkillInstalled(skillName)) {
        console.log(`→ 调用技能：${skillName}`);
        try {
          const result = await skillExecutor.execute(skillName, context);
          results.push({
            skill: skillName,
            invoked: true,
            success: true,
            result
          });
          console.log(` ✓ ${skillName} 执行成功`);
        } catch (error) {
          results.push({
            skill: skillName,
            invoked: false,
            success: false,
            error: error.message
          });
          console.log(` ✗ ${skillName} 执行失败: ${error.message}`);
        }
      } else {
        console.log(`⚠️ 技能 ${skillName} 未安装，跳过调用`);
      }
    }
    
    return results;
  }
}

module.exports = SkillMatcher;
