import { IsNotEmpty, IsString, IsUUID } from 'class-validator';

export class CreateCommentDto {
  @IsNotEmpty()
  @IsUUID()
  trackId: string;

  @IsNotEmpty()
  @IsString()
  content: string;
}
