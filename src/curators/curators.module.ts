import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CuratorSchema } from '../schemas/curator.schema.js';
import { CuratorsController } from './curators.controller.js';
import { CuratorsService } from './curators.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: 'Curator', schema: CuratorSchema }]),
  ],
  controllers: [CuratorsController],
  providers: [CuratorsService],
  exports: [CuratorsService],
})
export class CuratorsModule {}
