import { fetchEnvConfig } from './s3Service';

interface LoginConfig {
  username: string;
  password: string;
}

export async function validateLogin(username: string, password: string): Promise<boolean> {
  try {
    const config = await fetchEnvConfig() as LoginConfig;
    return config.username === username && config.password === password;
  } catch (error) {
    console.error('Erro ao validar login:', error);
    return false;
  }
}

export async function getLoginConfig(): Promise<LoginConfig | null> {
  try {
    const config = await fetchEnvConfig() as LoginConfig;
    return config;
  } catch (error) {
    console.error('Erro ao buscar configuração de login:', error);
    return null;
  }
} 