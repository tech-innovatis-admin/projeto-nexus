import { compare, hash } from 'bcryptjs';

/**
 * Cria um hash seguro da senha fornecida
 * @param password Senha em texto puro
 * @returns String com o hash da senha
 */
export async function hashPassword(password: string): Promise<string> {
  return hash(password, 10);
}

/**
 * Verifica se uma senha em texto puro corresponde a um hash armazenado
 * @param password Senha em texto puro
 * @param hashedPassword Hash da senha armazenada
 * @returns Boolean indicando se a senha é válida
 */
export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return compare(password, hashedPassword);
}
