/**
 * 用户名验证工具函数
 * 支持中文、英文、数字、下划线、连字符
 */

export interface UsernameValidationResult {
  valid: boolean;
  message?: string;
}

/**
 * 验证用户名格式
 * @param username 用户名
 * @returns 验证结果
 */
export function validateUsername(username: string): UsernameValidationResult {
  // 检查是否为空
  if (!username || username.trim().length === 0) {
    return {
      valid: false,
      message: '用户名不能为空',
    };
  }

  const trimmedUsername = username.trim();

  // 检查长度（中文字符按1个字符计算）
  const length = trimmedUsername.length;
  if (length < 2) {
    return {
      valid: false,
      message: '用户名至少需要2个字符',
    };
  }
  if (length > 20) {
    return {
      valid: false,
      message: '用户名不能超过20个字符',
    };
  }

  // 允许：中文、英文、数字、下划线、连字符
  // 正则：\u4e00-\u9fa5 是中文字符范围
  const validPattern = /^[\u4e00-\u9fa5a-zA-Z0-9_-]+$/;
  if (!validPattern.test(trimmedUsername)) {
    return {
      valid: false,
      message: '用户名只能包含中文、英文、数字、下划线和连字符',
    };
  }

  // 不允许纯数字（避免与ID混淆）
  if (/^\d+$/.test(trimmedUsername)) {
    return {
      valid: false,
      message: '用户名不能为纯数字',
    };
  }

  // 不允许以特殊字符开头或结尾
  if (/^[-_]|[-_]$/.test(trimmedUsername)) {
    return {
      valid: false,
      message: '用户名不能以特殊字符开头或结尾',
    };
  }

  return {
    valid: true,
  };
}

/**
 * 清理用户名（移除首尾空格）
 * @param username 原始用户名
 * @returns 清理后的用户名
 */
export function sanitizeUsername(username: string): string {
  return username.trim();
}

/**
 * 检查用户名是否包含中文
 * @param username 用户名
 * @returns 是否包含中文
 */
export function containsChinese(username: string): boolean {
  return /[\u4e00-\u9fa5]/.test(username);
}

/**
 * 将用户名转换为有效的邮箱地址
 * 处理中文字符，确保生成的邮箱格式符合RFC规范
 * 
 * @param username 用户名（可包含中文）
 * @returns 有效的邮箱地址
 * 
 * @example
 * usernameToEmail('张三') // → 'E5BCA0E4B889@miaoda.com'
 * usernameToEmail('user123') // → 'user123@miaoda.com'
 */
export function usernameToEmail(username: string): string {
  // 如果用户名不包含中文和特殊字符，直接使用
  if (/^[a-zA-Z0-9_-]+$/.test(username)) {
    return `${username}@miaoda.com`;
  }
  
  // 使用URL编码处理中文和特殊字符，然后替换%为_
  // 例如：'张三' → '%E5%BC%A0%E4%B8%89' → '_E5_BC_A0_E4_B8_89'
  const encoded = encodeURIComponent(username).replace(/%/g, '_');
  return `${encoded}@miaoda.com`;
}
