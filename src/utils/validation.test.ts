/**
 * 用户名验证测试用例
 * 运行测试：npm test validation.test.ts
 */

import { validateUsername, sanitizeUsername, containsChinese, usernameToEmail } from './validation';

// 测试用例
const testCases = [
  // 有效用户名
  { input: '张三', expected: true, description: '纯中文昵称' },
  { input: '小明123', expected: true, description: '中文+数字' },
  { input: 'UserName', expected: true, description: '纯英文' },
  { input: 'user_name', expected: true, description: '英文+下划线' },
  { input: 'user-123', expected: true, description: '英文+连字符+数字' },
  { input: '张三_abc', expected: true, description: '中文+英文+下划线' },
  { input: '测试用户', expected: true, description: '4个中文字符' },
  
  // 无效用户名
  { input: '', expected: false, description: '空字符串' },
  { input: ' ', expected: false, description: '纯空格' },
  { input: 'a', expected: false, description: '只有1个字符' },
  { input: '123456', expected: false, description: '纯数字' },
  { input: '_user', expected: false, description: '下划线开头' },
  { input: 'user_', expected: false, description: '下划线结尾' },
  { input: '-user', expected: false, description: '连字符开头' },
  { input: 'user-', expected: false, description: '连字符结尾' },
  { input: 'user@name', expected: false, description: '包含@符号' },
  { input: 'user name', expected: false, description: '包含空格' },
  { input: '用户!名', expected: false, description: '包含感叹号' },
  { input: '这是一个非常非常非常长的用户名超过20个字符', expected: false, description: '超过20个字符' },
];

console.log('========================================');
console.log('用户名验证测试');
console.log('========================================\n');

let passCount = 0;
let failCount = 0;

testCases.forEach((testCase, index) => {
  const result = validateUsername(testCase.input);
  const passed = result.valid === testCase.expected;
  
  if (passed) {
    passCount++;
    console.log(`✓ 测试 ${index + 1}: ${testCase.description}`);
    console.log(`  输入: "${testCase.input}"`);
    console.log(`  结果: ${result.valid ? '有效' : '无效'} ${!result.valid ? `(${result.message})` : ''}`);
  } else {
    failCount++;
    console.log(`✗ 测试 ${index + 1}: ${testCase.description} - 失败`);
    console.log(`  输入: "${testCase.input}"`);
    console.log(`  期望: ${testCase.expected ? '有效' : '无效'}`);
    console.log(`  实际: ${result.valid ? '有效' : '无效'} ${!result.valid ? `(${result.message})` : ''}`);
  }
  console.log('');
});

console.log('========================================');
console.log(`测试总结: ${passCount} 通过, ${failCount} 失败`);
console.log('========================================\n');

// 测试 sanitizeUsername
console.log('清理用户名测试:');
console.log(`"  张三  " → "${sanitizeUsername('  张三  ')}"`);
console.log(`"\\t用户名\\n" → "${sanitizeUsername('\t用户名\n')}"`);
console.log('');

// 测试 containsChinese
console.log('中文检测测试:');
console.log(`"张三" → ${containsChinese('张三')}`);
console.log(`"UserName" → ${containsChinese('UserName')}`);
console.log(`"user张三" → ${containsChinese('user张三')}`);
console.log('');

// 测试 usernameToEmail
console.log('用户名转邮箱测试（中文支持）:');
console.log(`"张三" → "${usernameToEmail('张三')}"`);
console.log(`"小明123" → "${usernameToEmail('小明123')}"`);
console.log(`"UserName" → "${usernameToEmail('UserName')}"`);
console.log(`"user_name" → "${usernameToEmail('user_name')}"`);
console.log(`"李医生" → "${usernameToEmail('李医生')}"`);
console.log('');
console.log('说明: 中文用户名会被编码为有效的邮箱格式，但实际显示仍为中文昵称');
