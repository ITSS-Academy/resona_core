import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  @Post()
  create(@Body() createCategoryDto: CreateCategoryDto) {
    return this.categoryService.create(createCategoryDto);
  }

  @Get()
  getAll() {
    return this.categoryService.getAll();
  }

  @Get('search')
  search( @Query('search') query: string) {
    return this.categoryService.search( query);
  }

  // get tracks by category
  @Get('all-tracks/:id')
  getCategoryDetails(@Param('id') id: string) {
    return this.categoryService.getCategoryDetails(id);
  }
}
