import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateCuratorDto {
  @Type(() => Number)
  @IsNumber()
  telegramId: number;

  @IsString()
  fio: string;

  @IsArray()
  @IsString({ each: true })
  regions: string[];
}

export class UpdateCuratorDto {
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  telegramId?: number;

  @IsOptional()
  @IsString()
  fio?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  regions?: string[];

  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
