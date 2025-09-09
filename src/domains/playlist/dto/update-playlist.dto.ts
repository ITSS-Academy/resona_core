import { PartialType } from '@nestjs/mapped-types';
import { CreatePlaylistDto } from './create-playlist.dto';
import { IsNotEmpty, IsOptional, IsString, IsUUID } from 'class-validator';

export class UpdatePlaylistDto extends PartialType(CreatePlaylistDto) {}

export class UpdateTitleDto {
  @IsOptional()
  @IsString()
  title?: string;
}
