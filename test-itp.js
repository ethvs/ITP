/**
 * ITP Skill Test Script
 * 测试 ITP 智能任务流水线
 */

const skillLoader = require('./src/skill-loader');
const skillExecutor = require('./src/skill-executor');

async function testITPSkill() {
  console.log('═══════════════════════════════════════════');
  console.log('      ITP Skill 测试套件');
  console.log('═══════════════════════════════════════════\n');

  try {
    // 1. 加载所有技能
    console.log('[测试] 加载技能...\n');
    await skillLoader.loadAllSkills();

    // 2. 检查 ITP 技能是否已注册
    const skill = skillLoader.getSkill('itp');
    if (!skill) {
      throw new Error('ITP 技能未找到');
    }

    console.log('✓ ITP 技能已加载');
    console.log(`  - 名称: ${skill.metadata.name}`);
    console.log(`  - 版本: ${skill.metadata.version || '1.0.0'}`);
    console.log(`  - 类别: ${skill.metadata.category || 'general'}`);
    console.log(`  - 作者: ${skill.metadata.author || 'Unknown'}`);
    console.log(`  - 标签: ${skill.metadata.tags?.join(', ') || 'none'}\n`);  //Use optional chaining on 'metadata'

    // 3. 测试 intent 分析接口
    console.log('[测试] 意图分析接口...\n');
    const testInput = '帮我写一本科幻小说，讲述人类探索火星的故事';  //Your input: '帮我写一本科幻小说，讲述人类探索火星的故事';
    console.log(`输入: "${testInput}"\n`);

    // 4. 执行 ITP 技能
    console.log('[测试] 执行完整流水线...\n');
    const result = await skillExecutor.execute('itp', {
      message: testInput,
      userMessage: testInput
    });

    // 5. 检查结果
    console.log('\n═══════════════════════════════════════════');
    console.log('      执行结果');
    console.log('═══════════════════════════════════════════\n');

    if (result.success) {
      console.log('✓ 执行成功!');
      console.log(`  - 执行ID: ${result.executionId}`);
      console.log(`  - 耗时: ${result.duration}ms`);

      if (result.metadata) {
        console.log(`  - 质量检查: ${result.metadata.quality?.passed ? '通过' : '未通过'}`);

        if (result.iitpStats) {
          console.log(`  - 执行阶段: ${result.iitpStats.stages.join(' → ')}`);
        }
      }

      console.log('\n--- 输出内容 ---\n');
      const content = result.result?.content || result.result;
      if (typeof content === 'string') {
        console.log(content.substring(0, 500) + (content.length > 500 ? '...' : ''));
      } else {
        console.log(JSON.stringify(content, null, 2).substring(0, 500) + '...');
      }

    } else {
      console.log('✗ 执行失败');
      console.log(`错误: ${result.error}`);
      if (result.suggestions) {
        console.log('建议:');
        result.suggestions.forEach(s => console.log(`  - ${s}`));
      }
    }

    // 6. 测试检查点功能
    console.log('\n═══════════════════════════════════════════');
    console.log('      检查点功能测试');
    console.log('═══════════════════════════════════════════\n');

    // 获取导出的检查点接口
    const itpModule = require('./skills/itp');

    // 测试列出检查点
    console.log('[测试] 列出检查点...');
    const checkpoints = await itpModule.list_checkpoints();
    console.log(`✓ 已发现 ${checkpoints.length} 个检查点\n`);

    console.log('═══════════════════════════════════════════');
    console.log('      所有测试完成 ✓');
    console.log('═══════════════════════════════════════════');

    return { success: true, result };

  } catch (error) {
    console.error('\n✗ 测试失败:');
    console.error(error.message);
    console.error(error.stack);
    return { success: false, error: error.message };
  }
}

// 运行测试
testITPSkill().then(result => {
  process.exit(result.success ? 0 : 1);
});
