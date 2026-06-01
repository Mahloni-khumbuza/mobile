import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Amenity } from '../../amenities/entities/amenity.entity';
import { Boardroom } from '../entities/boardroom.entity';
import { BoardroomsService } from './boardrooms.service';

describe('BoardroomsService', () => {
  let service: BoardroomsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BoardroomsService,
        { provide: getRepositoryToken(Boardroom), useValue: {} },
        { provide: getRepositoryToken(Amenity), useValue: {} },
      ],
    }).compile();

    service = module.get<BoardroomsService>(BoardroomsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
