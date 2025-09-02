import {
  HttpException, HttpStatus,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';
import { SupabaseProvider } from '../supabase/supabase';

@Injectable()
export class AuthService {
  constructor(private readonly supabaseProvider: SupabaseProvider) {}

  async verifyToken(idToken: string): Promise<any> {
    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      const { uid, email, name, photoUrl } = decodedToken;

      const { data, error, count } = await this.supabaseProvider
        .getClient()
        .from('profile')
        .select('*', { count: 'exact' })
        .eq('id', decodedToken.uid);

      if (error) {
        throw new Error(error.message);
      }

      if (count === 0) {
        const { data, error } = await this.supabaseProvider
          .getClient()
          .from('profile')
          .insert([{ id: uid, email, name, photoUrl: photoUrl || 'https://sbcf.fr/wp-content/uploads/2018/03/sbcf-default-avatar.png'}]);

        if (error) {
          throw new HttpException(error.message, 400);
        }

        const { data: user, error: userError } = await this.supabaseProvider
          .getClient()
          .from('profile')
          .select('*')
          .eq('id', decodedToken.uid);

        if (userError) {
          throw new HttpException(userError.message, 400);
        }

        return user[0];
      } else if (count && count > 1) {
        throw new Error('Multiple rows returned for a single user');
      }

      return data[0];
    } catch (error) {
      throw new Error(error.message);
    }
  }

  async getUserById(id: string) {
    const { data, error, count } = await this.supabaseProvider
      .getClient()
      .from('profile')
      .select('*', { count: 'exact' })
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    if (count === 0) {
      throw new UnauthorizedException('User not found');
    } else if (count && count > 1) {
      throw new Error('Multiple rows returned for a single user');
    }

    return data[0];
  }
}
