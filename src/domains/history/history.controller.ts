import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { HistoryService } from './history.service';
import { CreateHistoryDto } from './dto/create-history.dto';
import { UpdateHistoryDto } from './dto/update-history.dto';

@Controller('history')
export class HistoryController {
  constructor(private readonly historyService: HistoryService) {}

  // Thêm vào history (khi play 1 bài hát)
  @Post()
  async addToHistory(
    @Body('userId') userId: string,
    @Body('trackId') trackId: string,
  ) {
    return this.historyService.addToHistory(userId, trackId);
  }

  // Lấy lịch sử nghe nhạc của 1 user
  @Get(':userId')
  async getHistoryByUser(
    @Param('userId') userId: string,
    @Query('limit') limit?: number,
  ) {
    return this.historyService.getHistoryByUser(userId, limit);
  }

  // Xóa toàn bộ history của 1 user
  @Delete(':userId')
  async clearHistory(@Param('userId') userId: string) {
    return this.historyService.clearHistory(userId);
  }
}
