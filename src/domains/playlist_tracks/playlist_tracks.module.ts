import { Module } from '@nestjs/common';
import { PlaylistTracksService } from './playlist_tracks.service';
import { PlaylistTracksController } from './playlist_tracks.controller';

@Module({
  controllers: [PlaylistTracksController],
  providers: [PlaylistTracksService],
})
export class PlaylistTracksModule {}
