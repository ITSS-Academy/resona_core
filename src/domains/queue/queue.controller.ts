import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
  BadRequestException,
} from '@nestjs/common';
import { QueueService } from './queue.service';
import { CreateQueueDto } from './dto/create-queue.dto';
import { UpdateQueueDto } from './dto/update-queue.dto';

@Controller('queue')
export class QueueController {
  constructor(private readonly queueService: QueueService) {}

  // Thêm 1 bài hát vào queue
  @Post()
  async addSongToQueue(
    @Body('userId') userId: string,
    @Body('trackId') trackId: string
  ) {
    return this.queueService.addSongToQueue(userId, trackId);
  }

  // Lấy queue theo user
  @Get(':userId')
  async getQueueByUser(@Param('userId') userId: string) {
    return this.queueService.getQueueByUser(userId);
  }

  // Xóa 1 bài hát khỏi queue
  @Delete()
  async removeSongFromQueue(
    @Query('userId') userId: string,
    @Query('trackId') trackId: string,
  ) {
    return this.queueService.removeSongFromQueue(userId, trackId);
  }

  // Xóa toàn bộ queue
  @Delete(':userId/clear')
  async clearQueue(@Param('userId') userId: string) {
    return this.queueService.clearQueue(userId);
  }

  // @Get(':userId/random')
  // async getRandomTracksForUser(
  //   @Param('userId') userId: string,
  //   @Query('limit') limit?: string,
  // ) {
  //   const limitNumber = limit ? parseInt(limit, 10) : 10;
  //
  //   if (isNaN(limitNumber) || limitNumber <= 0) {
  //     throw new BadRequestException('Limit must be a positive number');
  //   }
  //
  //   return this.queueService.getRandomTracksForUser(userId, limitNumber);
  // }

  @Post(':userId/refill')
  async refillQueue(
    @Param('userId') userId: string,
    @Query('limit') limit?: string,
  ) {
    const limitNumber = limit ? parseInt(limit, 10) : 10;

    if (isNaN(limitNumber) || limitNumber <= 0) {
      throw new BadRequestException('Limit must be a positive number');
    }

    return this.queueService.refillQueue(userId, limitNumber);
  }

  @Post('play-now/:userId')
  async playSongNow(
    @Param('userId') userId: string,
    @Body('trackId') trackId: string,
  ) {
    if (!trackId) {
      throw new BadRequestException('trackId is required');
    }

    // gọi service để clear queue và thêm track mới
    const data = await this.queueService.playSongNow(userId, { id: trackId } as any);

    return { message: 'Track is now playing', track: data };
  }

  @Post('add-playlist/:userId')
  async addPlaylistToQueue(
    @Param('userId') userId: string,
    @Body('playlistId') playlistId: string,
  ) {
    return this.queueService.addPlaylistToQueue(userId, playlistId);
  }
}
