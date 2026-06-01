import { Test, TestingModule } from '@nestjs/testing';
import { BoardroomsService } from '../services/boardrooms.service';
import { BoardroomsController } from './boardrooms.controller';

describe('BoardroomsController', () => {
  let controller: BoardroomsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [BoardroomsController],
      providers: [{ provide: BoardroomsService, useValue: {} }],
    }).compile();

    controller = module.get<BoardroomsController>(BoardroomsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
