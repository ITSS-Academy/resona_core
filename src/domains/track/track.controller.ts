import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  Res,
  Req,
  NotFoundException,
  InternalServerErrorException,
  Query,
  UploadedFiles,
} from '@nestjs/common';
import { TrackService } from './track.service';
import { CreateTrackDto } from './dto/create-track.dto';
import { UpdateTrackDto } from './dto/update-track.dto';
import { FileInterceptor, FilesInterceptor, FileFieldsInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { ReadStream, Stats } from 'fs';
import * as fs from 'node:fs';
import express from 'express';
import { finished } from 'stream/promises';
import { supabase } from '../../utils/supbabase';
import { parseFile } from 'music-metadata';
import { getAudioDuration } from '../../utils/hls-converter';

@Controller('track')
export class TrackController {
  constructor(private readonly trackService: TrackService) {}

  @Post('upload')
  @UseInterceptors(
    FilesInterceptor('files', 20, {
      storage: diskStorage({
        destination: './public/assets/tracks',
        filename: (req, file, cb) => {
          const uniqueSuffix =
            Date.now() + '-' + Math.round(Math.random() * 1e9);
          const fileName = `${file.fieldname}-${uniqueSuffix}.${file.originalname.split('.').pop()}`;
          cb(null, fileName);
        },
      }),
      limits: {
        fileSize: 10 * 1024 * 1024,
      },
    }),
  )
  async create(
    @Body() createTrackDto: CreateTrackDto,
    @UploadedFiles() files: Array<Express.Multer.File>,
  ) {
    if (!files) {
      throw new BadRequestException('File is required');
    }
    const trackId = createTrackDto.trackId!;
    const nameDir = `public/assets/chunks/${trackId}`;

    if (!fs.existsSync(nameDir)) {
      fs.mkdirSync(nameDir);
    }

    fs.cpSync(files[0].path, `${nameDir}/${createTrackDto.trackName}`);

    fs.rmSync(files[0].path);

    console.log('Uploaded files:', files);

    return {
      message: 'Track uploaded successfully',
      trackId: createTrackDto.trackId,
      trackName: createTrackDto.trackName,
    };
  }

  @Post('merge')
  @UseInterceptors(
    FileFieldsInterceptor(
      [
        { name: 'thumbnail', maxCount: 1 },
        { name: 'lyrics', maxCount: 1 },
      ],
      {
        fileFilter: (req, file, callback) => {
          if (
            file.fieldname === 'thumbnail' &&
            !file.mimetype.startsWith('image/')
          ) {
            return callback(
              new BadRequestException('Only image files are allowed'),
              false,
            );
          }
          if (
            file.fieldname === 'lyrics' &&
            !file.mimetype.startsWith('text/')
          ) {
            return callback(
              new BadRequestException('Only text files are allowed for lyrics'),
              false,
            );
          }
          callback(null, true);
        },
        limits: { fileSize: 5 * 1024 * 1024 },
      },
    ),
  )
  async merge(
    @Query('trackId') trackId: string,
    @Query('trackName') trackName: string,
    @Query('categoryId') categoryId: string,
    @Query('artistName') artistName: string,
    @Query('ownerId') ownerId: string,
    @UploadedFiles()
    files: {
      thumbnail?: Express.Multer.File[];
      lyrics?: Express.Multer.File[];
    },
  ) {
    const nameDir = `public/assets/chunks/${trackId}`;
    if (!fs.existsSync(nameDir)) {
      throw new BadRequestException('Video chunks directory does not exist');
    }

    if (!trackId || !trackName || !categoryId) {
      throw new BadRequestException(
        'trackId, trackName, and categoryId are required',
      );
    }

    // Extract files
    const thumbnail = files.thumbnail?.[0];
    const lyrics = files.lyrics?.[0];

    // Ensure the directory exists
    const dir = `public/assets/tracks/${trackId}`;
    fs.mkdirSync(dir, { recursive: true });

    // Merge video chunks
    const filesToMerge = fs
      .readdirSync(nameDir)
      .filter((f) => f.endsWith('.mp4') || f.includes('.part'))
      .sort((a, b) => {
        const aIndex = parseInt(a.split('.part')[1] || '0', 10);
        const bIndex = parseInt(b.split('.part')[1] || '0', 10);
        return aIndex - bIndex;
      });

    if (filesToMerge.length === 0) {
      throw new BadRequestException('No track chunks found to merge');
    }

    const mergedFilePath = `${dir}/${trackId}.mp4`;
    const writeStream = fs.createWriteStream(mergedFilePath);

    for (const file of filesToMerge) {
      console.log(`Merging file: ${file}`);
      const filePath = `${nameDir}/${file}`;
      const readStream = fs.createReadStream(filePath);
      readStream.pipe(writeStream, { end: false });
      await finished(readStream);
    }

    writeStream.end();

    // Clean up chunks directory
    fs.rmSync(nameDir, { recursive: true, force: true });

    // Convert to AAC
    let output: string;
    try {
      output = await this.trackService.convertToAac(mergedFilePath, {});
    } catch (err) {
      throw new BadRequestException(
        'Failed to convert track to AAC format: ' + err.message,
      );
    }

    // Read buffer of the output file
    if (!fs.existsSync(output)) {
      throw new NotFoundException('Converted track file not found');
    }

    // Thumbnail upload
    let thumbnailPath!: string;
    if (thumbnail) {
      const { data: thumbnailData, error: thumbnailError } =
        await supabase.storage
          .from('thumbnail' + '')
          .upload(`${trackId}/thumbnail.jpg`, thumbnail.buffer, {
            contentType: thumbnail.mimetype,
            upsert: true,
          });

      if (thumbnailError) {
        throw new BadRequestException(thumbnailError);
      }
      thumbnailPath = thumbnailData.path;
    }

    // Lyrics upload (optional)
    let lyricsPath: string | undefined = undefined;
    if (lyrics) {
      const { data: lyricsData, error: lyricsError } = await supabase.storage
        .from('lyrics')
        .upload(`${trackId}/lyrics.txt`, lyrics.buffer, {
          contentType: lyrics.mimetype,
          upsert: true,
        });
      if (lyricsError) {
        throw new BadRequestException(lyricsError);
      }
      lyricsPath = lyricsData.path;
    }

    // Push to supabase storage named tracks
    const { data: track, error } = await supabase.storage
      .from('tracks')
      .upload(`${trackId}/${trackId}.aac`, fs.readFileSync(output), {
        contentType: 'audio/aac',
        upsert: true,
      });

    if (error) {
      throw new BadRequestException(error);
    }

    // Get audio metadata for duration use ffmpeg
    const duration = await getAudioDuration(output);

    // Create track record in database
    const savedTrack = await this.trackService.create(
      { trackId: trackId, trackName: trackName, artistName: artistName },
      categoryId,
      ownerId,
      track?.path || '',
      duration,
      thumbnailPath,
    );

    // Clean up local files
    fs.unlinkSync(output);
    fs.rmSync(dir, {
      recursive: true,
      force: true,
    });

    return { ...savedTrack, lyricsPath };
  }

  @Get('favorite/:userId')
  getFavoriteTracks(@Param('userId') userId: string) {
    return this.trackService.getFavouriteTracks(userId);
  }

  @Patch(':trackId/increase-view')
  async increaseView(@Param('trackId') trackId: string) {
    return this.trackService.incrementViewCount(trackId);
  }

  @Get('uploaded/:ownerId')
  findByOwner(@Param('ownerId') ownerId: string) {
    return this.trackService.getTracksByOwnerId(ownerId);
  }

  @Get('by-category/:categoryId')
  findByCategory(@Param('categoryId') categoryId: string) {
    return this.trackService.getTracksByCategoryId(categoryId);
  }

  @Get(':trackId')
  getTrackDetails(@Param('trackId') trackId: string) {
    return this.trackService.getTrackDetails(trackId);
  }

  @Get('search')
  search(@Query('search') query: string) {
    return this.trackService.searchTracks(query);
  }

  @Get('thumbnail-url/:trackId')
  async getThumbnailBasedOnTrackId(@Param('trackId') trackId: string) {
    const url = await this.trackService.getThumbnailBasedOnTrackId(trackId);
    if (!url) {
      throw new NotFoundException('Thumbnail not found');
    }
    return { url };
  }

  @Get('lyrics/:trackId')
  async getLyricsByTrackId(@Param('trackId') trackId: string) {
    const lyrics = await this.trackService.getLyricsByTrackId(trackId);
    if (!lyrics) {
      throw new NotFoundException('Lyrics not found');
    }
    return { lyrics };
  }

  @Patch(':id')
  async updateTrack(
    @Param('id') trackId: string,
    @Body() updateTrackDto: UpdateTrackDto,
  ) {
    return this.trackService.updateTrack(trackId, updateTrackDto);
  }

  @Delete(':id')
  async deleteTrack(@Param('id') trackId: string) {
    return this.trackService.deleteTrack(trackId);
  }
}
