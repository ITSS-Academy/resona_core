import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreatePlaylistDto {
  @IsNotEmpty()
  title: string;

  @IsString()
  description?: string;

  @IsOptional()
  isPublic?: boolean;
}

export class PlaylistTrackDto {
  @IsNotEmpty()
  @IsUUID()
  playlistId: string;

  @IsNotEmpty()
  @IsUUID()
  trackId: string;
}
