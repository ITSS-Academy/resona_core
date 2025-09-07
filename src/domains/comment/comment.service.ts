import { BadRequestException, Injectable, InternalServerErrorException } from '@nestjs/common';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Comment } from './entities/comment.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Track } from '../track/entities/track.entity';

@Injectable()
export class CommentService {
  constructor(@InjectRepository(Comment)
              private commentRepository: Repository<Comment>,) {
  }

  async create(userId: string, dto: CreateCommentDto): Promise<Comment> {
    try {
      const comment = this.commentRepository.create({
        content: dto.content,
        track: { id: dto.trackId },
        profile: { id: userId },
      });

      return await this.commentRepository.save(comment);
    } catch (error) {
      console.error('Error creating comment:', error);
      throw new BadRequestException('Failed to create comment');
    }
  }

  async getComments(songId: string): Promise<Comment[]> {
    try {
      return await this.commentRepository.find({
        where: { track: { id: songId } },
        relations: ['profile'], // nhớ sửa lại đúng quan hệ trong entity
        order: { createdAt: 'DESC' },
      });
    } catch (error) {
      console.error('Error fetching comments:', error);
      throw new InternalServerErrorException('Failed to fetch comments');
    }
  }

  async deleteComment(commentId: string, userId: string): Promise<{ message: string }> {
    try {
      const result = await this.commentRepository.delete({
        id: commentId,
        profile: { id: userId },
      });

      if (result.affected === 0) {
        throw new BadRequestException('Comment not found or not authorized');
      }

      return { message: 'Comment deleted successfully' };
    } catch (error) {
      console.error('Error deleting comment:', error);
      throw new BadRequestException('Failed to delete comment');
    }
  }


}
