import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { supabase } from '../../utils/supbabase';

@Injectable()
export class ProfileService {
  create(createProfileDto: CreateProfileDto) {
    return 'This action adds a new profile';
  }

  findAll() {
    return `This action returns all profile`;
  }

  // findOne(id: number) {
  //   return `This action returns a #${id} profile`;
  // }

  update(id: number, updateProfileDto: UpdateProfileDto) {
    return `This action updates a #${id} profile`;
  }

  remove(id: number) {
    return `This action removes a #${id} profile`;
  }

  async search(query: string) {
    const {data, error} = await supabase.from('profile').select('*').ilike('name', `%${query}%`);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async followProfile(followerId: string, followingId: string) {
    const {data, error} = await supabase.from('profile_followers').insert({followerId, followingId}).select();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getFollowers(profileId: string) {
    // 1. Lấy danh sách followerId
    const { data: followers, error } = await supabase
      .from('profile_followers')
      .select('followerId')
      .eq('followingId', profileId);

    if (error) throw new Error(error.message);

    if (!followers.length) return [];

    // 2. Dùng followerId để lấy thông tin profile
    const ids = followers.map(f => f.followerId);

    const { data: profiles, error: profileError } = await supabase
      .from('profile')
      .select('*')
      .in('id', ids);

    if (profileError) throw new Error(profileError.message);

    return profiles;
  }



  async getProfileById(profileId: string) {
    const { data, error } = await supabase
      .from('profile')
      .select('*')
      .eq('id', profileId)
      .single();
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }

  async getPopularProfiles() {
    const { data, error } = await supabase
      .from('profile')
      .select('*, followers:profileFollowers(followerId)')
      .order('followers', { foreignTable: 'profileFollowers', ascending: false, nullsFirst: false })
      .limit(10);
    if (error) {
      throw new Error(error.message);
    }
    return data;
  }
}
