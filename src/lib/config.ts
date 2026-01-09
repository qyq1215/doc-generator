import { LLMConfig } from './types';
import fs from 'fs';
import path from 'path';

/**
 * 从环境变量读取默认LLM配置
 */
export function getDefaultLLMConfigFromEnv(provider?: 'zhipu' | 'ernie' | 'xfyun'): LLMConfig | null {
  // 如果指定了provider，只读取该provider的配置
  if (provider === 'zhipu') {
    const apiKey = process.env.ZHIPU_API_KEY;
    if (!apiKey) return null;
    
    return {
      provider: 'zhipu',
      apiKey,
      model: process.env.ZHIPU_MODEL || 'glm-4-flash',
    };
  }
  
  if (provider === 'ernie') {
    const apiKey = process.env.ERNIE_API_KEY;
    if (!apiKey) return null;
    
    // 千帆API只需要API Key
    // 如果环境变量中是旧格式（API_KEY:SECRET_KEY），只取API Key部分
    const cleanApiKey = apiKey.includes(':') ? apiKey.split(':')[0] : apiKey;
    
    return {
      provider: 'ernie',
      apiKey: cleanApiKey,
      model: process.env.ERNIE_MODEL || 'ernie-3.5-8k',
    };
  }
  
  if (provider === 'xfyun') {
    const appId = process.env.XFYUN_APP_ID;
    const apiKey = process.env.XFYUN_API_KEY;
    const apiSecret = process.env.XFYUN_API_SECRET;
    
    // 如果提供了分离的字段，使用分离字段
    if (appId && apiKey && apiSecret) {
      return {
        provider: 'xfyun',
        appId,
        apiKey,
        apiSecret,
        model: process.env.XFYUN_MODEL || 'spark-lite',
      };
    }
    
    // 如果只提供了组合格式（向后兼容）
    if (apiKey && apiKey.includes(':')) {
      return {
        provider: 'xfyun',
        apiKey,
        model: process.env.XFYUN_MODEL || 'spark-lite',
      };
    }
    
    return null;
  }
  
  // 如果没有指定provider，尝试按优先级读取（zhipu > ernie > xfyun）
  const zhipuConfig = getDefaultLLMConfigFromEnv('zhipu');
  if (zhipuConfig) return zhipuConfig;
  
  const ernieConfig = getDefaultLLMConfigFromEnv('ernie');
  if (ernieConfig) return ernieConfig;
  
  const xfyunConfig = getDefaultLLMConfigFromEnv('xfyun');
  if (xfyunConfig) return xfyunConfig;
  
  return null;
}

/**
 * 从配置文件读取默认LLM配置（仅开发环境）
 */
export function getDefaultLLMConfigFromFile(provider?: 'zhipu' | 'ernie' | 'xfyun'): LLMConfig | null {
  // 只在开发环境读取配置文件
  if (process.env.NODE_ENV === 'production') {
    return null;
  }
  
  const configPath = path.join(process.cwd(), 'src', 'config', 'default-llm-config.json');
  
  try {
    if (!fs.existsSync(configPath)) {
      return null;
    }
    
    const configContent = fs.readFileSync(configPath, 'utf-8');
    const config = JSON.parse(configContent);
    
    if (provider) {
      const providerConfig = config[provider];
      if (!providerConfig) return null;
      
      return {
        provider,
        ...providerConfig,
      };
    }
    
    // 如果没有指定provider，返回第一个可用的配置
    if (config.zhipu && config.zhipu.apiKey) {
      return { provider: 'zhipu', ...config.zhipu };
    }
    if (config.ernie && config.ernie.apiKey) {
      return { provider: 'ernie', ...config.ernie };
    }
    if (config.xfyun && (config.xfyun.appId || config.xfyun.apiKey)) {
      return { provider: 'xfyun', ...config.xfyun };
    }
    
    return null;
  } catch (error) {
    console.error('读取默认配置文件失败:', error);
    return null;
  }
}

/**
 * 获取默认LLM配置（优先环境变量，其次配置文件）
 */
export function getDefaultLLMConfig(provider?: 'zhipu' | 'ernie' | 'xfyun'): LLMConfig | null {
  // 优先从环境变量读取
  const envConfig = getDefaultLLMConfigFromEnv(provider);
  if (envConfig) {
    return envConfig;
  }
  
  // 如果环境变量不存在，尝试从配置文件读取（仅开发环境）
  const fileConfig = getDefaultLLMConfigFromFile(provider);
  if (fileConfig) {
    return fileConfig;
  }
  
  return null;
}
