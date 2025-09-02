import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class CreateTrackDto {
  @IsNotEmpty()
  @IsUUID()
  trackId: string;

  @IsNotEmpty()
  @IsString()
  trackName: string;

  @IsOptional()
  @IsString()
  artistName?: string;

  @IsOptional()
  @IsString()
  lyricText?: string;
}
