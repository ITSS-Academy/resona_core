import { Module } from '@nestjs/common';
import { SupabaseProvider } from './supabase';

@Module({
  providers: [SupabaseProvider],
  exports: [SupabaseProvider],
})
export class SupabaseModule {}