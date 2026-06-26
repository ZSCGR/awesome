// ==========================================
// 1. 模拟 GitHub Actions 环境变量和输入参数 (必须在导入任何模块前设置)
// ==========================================
// 请在这里填入你的 GitHub 个人访问令牌（PAT），以便拉取你的 Star 数据
// 也可以直接在命令行执行: export GITHUB_TOKEN="xxx" 然后运行此脚本
const token = process.env.GITHUB_TOKEN || 'YOUR_GITHUB_TOKEN_HERE';

process.env['INPUT_API-TOKEN'] = token;
process.env['INPUT_OUTPUT-FILENAME'] = 'README-test.md';
process.env['INPUT_COMPACT-BY-TOPIC'] = 'true';
process.env['GITHUB_REPOSITORY'] = 'ZSCGR/awesome-stars'; // 你的 GitHub 仓库地址路径
process.env['GITHUB_REF'] = 'refs/heads/main';

// ==========================================
// 2. 使用动态导入并运行测试
// ==========================================
async function runLocal() {
  // ⚡ 关键：使用动态导入确保配置已生效
  const { main } = await import('./index');
  const { default: git } = await import('./git');
  const fs = await import('fs/promises');

  // 模拟 Git 提交逻辑（本地测试时不进行真正的 remote push）
  git.pushNewFiles = async (files) => {
    if (!files) return;
    console.log('\n==========================================');
    console.log('⚡ [本地模拟] 拦截远程 Git 提交，直接写入本地文件:');
    console.log('==========================================');
    
    for (const file of files) {
      await fs.writeFile(file.filename, file.data, 'utf8');
      console.log(`✅ 已成功写入本地文件: ${file.filename} (${file.data.length} 字节)`);
    }
    
    console.log('==========================================\n');
  };

  if (token === 'YOUR_GITHUB_TOKEN_HERE') {
    console.warn('⚠️ 警告: 你尚未配置真实的 GITHUB_TOKEN！');
    console.warn('请编辑此文件中的 token 变量，或在运行前执行: export GITHUB_TOKEN="你的Token"');
  }

  console.log('🚀 开始本地运行测试...');
  try {
    await main();
    console.log('🎉 本地运行测试完成！');
  } catch (error) {
    console.error('❌ 本地运行测试失败:', error);
  }
}

runLocal();
