import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreatePlaylistDto {
  @IsNotEmpty()
  title: string;

  @IsString()
  description?: string;
}

export class PlaylistTrackDto {
  @IsNotEmpty()
  @IsUUID()
  playlistId: string;

  @IsNotEmpty()
  @IsUUID()
  trackId: string;
}
