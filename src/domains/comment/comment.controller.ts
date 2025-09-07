import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Put,
  BadRequestException,
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';

@Controller('comment')
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Post(':trackId/:userId')
  async createComment(
    @Param('trackId') trackId: string,
    @Param('userId') userId: string,
    @Body() dto: CreateCommentDto,
  ) {
    return this.commentService.create(userId, { ...dto, trackId });
  }

  @Get(':trackId')
  async getComments(@Param('trackId') trackId: string) {
    return this.commentService.getComments(trackId);
  }

  @Delete(':commentId/:userId')
  async deleteComment(
    @Param('commentId') commentId: string,
    @Param('userId') userId: string,
  ): Promise<{ message: string }> {
    return this.commentService.deleteComment(commentId, userId);
  }
}
