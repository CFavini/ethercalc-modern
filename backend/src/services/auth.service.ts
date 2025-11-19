// Caminho: backend/src/services/auth.service.ts

import {supabase} from '../config/supabase';

export class AuthService {
  /**
   * 📝 Registra um novo usuário com email e senha usando o Supabase Auth.
   * @param payload { email, password, displayName }
   */
  async register(payload: {
    email: string;
    password: string;
    displayName: string;
  }) {
    const { email, password, displayName } = payload;

    // 1. Cria o usuário na tabela auth.users e, pelo trigger SQL, em user_profiles
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
        },
      },
    });

    if (error) {
      if (error.message.includes('already exists')) {
        throw new Error('Email já cadastrado');
      }
      throw new Error(`Erro de registro: ${error.message}`);
    }

    if (!data.user || !data.session) {
      throw new Error('Não foi possível criar sessão após registro.');
    }

    // Retorna o usuário (auth) e a sessão
    return { user: data.user, session: data.session };
  }

  /**
   * 🔐 Realiza login e obtém a sessão do usuário.
   * @param email Email do usuário.
   * @param password Senha do usuário.
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      // Supabase usa "Invalid login credentials" para email e senha errados
      throw new Error('Credenciais inválidas');
    }

    if (!data.user || !data.session) {
      throw new Error('Não foi possível obter a sessão após login.');
    }

    // Retorna o usuário e a sessão (incluindo access_token e refresh_token)
    return { user: data.user, session: data.session };
  }

  /**
   * 🚪 Encerra a sessão do usuário.
   */
  async logout(accessToken: string) {
    // Supabase usa o access token para invalidar a sessão
    const { error } = await supabase.auth.signOut(accessToken);

    if (error) {
      // Ignoramos erros leves de logout (ex: token já expirou)
      console.warn('Erro ao tentar logout (pode ser ignorável):', error.message);
    }
    return { success: true };
  }
} 