import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { TrackModule } from './domains/track/track.module';
import { TypeOrmModule, TypeOrmModuleOptions } from '@nestjs/typeorm';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PlaylistModule } from './domains/playlist/playlist.module';
import { ProfileModule } from './domains/profile/profile.module';
import { CategoryModule } from './domains/category/category.module';
import { NotificationModule } from './domains/notification/notification.module';
import { PlaylistTracksModule } from './domains/playlist_tracks/playlist_tracks.module';
import { CommentModule } from './domains/comment/comment.module';
import { AuthModule } from './domains/auth/auth.module';
import { SupabaseModule } from './domains/supabase/supabase.module';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule.forRoot({isGlobal: true,})],
      useFactory: (configService: ConfigService): TypeOrmModuleOptions => {
        return {
          type: 'postgres',
          host: configService.get('DB_HOST'),
          port: parseInt(configService.get<string>('DB_PORT') || '6543', 10),
          username: configService.get('DB_USER'),
          password: configService.get('DB_PASSWORD'),
          database: configService.get('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: true,
        }
      },
      inject: [ConfigService],
    }),
    TrackModule,
    PlaylistModule,
    ProfileModule,
    CategoryModule,
    NotificationModule,
    PlaylistTracksModule,
    CommentModule,
    AuthModule,
    SupabaseModule
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
