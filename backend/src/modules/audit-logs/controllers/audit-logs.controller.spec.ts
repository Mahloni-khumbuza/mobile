import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogsService } from '../services/audit-logs.service';
import { AuditLogsController } from './audit-logs.controller';

describe('AuditLogsController', () => {
  let controller: AuditLogsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuditLogsController],
      providers: [{ provide: AuditLogsService, useValue: {} }],
    }).compile();

    controller = module.get<AuditLogsController>(AuditLogsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
