import { IsInt, IsUUID, Min } from 'class-validator';

export class CreateQueueDto {
  @IsUUID()
  trackId: string;

  @IsInt()
  @Min(0)
  position: number;
}
