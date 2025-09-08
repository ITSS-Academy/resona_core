import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { supabase } from '../../utils/supbabase';

@Injectable()
export class CategoryService {
  create(createCategoryDto: CreateCategoryDto) {
    return 'This action adds a new category';
  }

  async getAll() {
    const { data, error } = await supabase
      .from('category')
      .select()
      .order('name', { ascending: true }); // sắp xếp theo bảng chữ cái

    if (error) {
      throw new BadRequestException(error);
    }
    return data;
  }

  async getCategoryDetails(categoryId: string) {
    // 1. Get category info
    const { data: categoryData, error: categoryError } = await supabase
      .from('category')
      .select('*')
      .eq('id', categoryId)
      .single();
    if (categoryError || !categoryData) {
      throw new BadRequestException('Category not found');
    }
    // 2. Get all category_tracks for this category
    const { data: categoryTracks, error: categoryTracksError } = await supabase
      .from('track')
      .select('id')
      .eq('categoryId', categoryId);
    if (categoryTracksError) {
      throw new BadRequestException('Failed to get category tracks');
    }
    const trackIds = categoryTracks.map((pt) => pt.id);
    if (trackIds.length === 0) {
      return { ...categoryData, tracks: [] };
    }
    // 3. Get all tracks with full details
    const { data: tracks, error: tracksError } = await supabase
      .from('track')
      .select('*')
      .in('id', trackIds);
    if (tracksError) {
      throw new BadRequestException('Failed to get tracks');
    }
    return { ...categoryData, tracks };
  }

  async search( query: string) {
    const { data, error } = await supabase
      .from('category')
      .select('*')
      .ilike('name', `%${query}%`);
    if (error) {
      throw new BadRequestException(error);
    }
    return data;
  }
}
