import { NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { getQueueToken } from '@nestjs/bull';
import { WebhooksService } from './webhooks.service';
import { WebhookConfig } from '../entities/webhook-config.entity';
import { WebhookDeliveryLog } from '../entities/webhook-delivery-log.entity';

const mockWebhookRepo = () => ({
  create: jest.fn((data: unknown) => data),
  save: jest.fn((entity: unknown) => Promise.resolve({ ...(entity as object), id: 'wh-1' })),
  find: jest.fn(),
  findOne: jest.fn(),
});

const mockDeliveryRepo = () => ({
  create: jest.fn((data: unknown) => data),
  save: jest.fn((entity: unknown) => Promise.resolve(entity)),
  findOne: jest.fn(),
  findAndCount: jest.fn(),
});

const mockQueue = () => ({
  add: jest.fn(),
});

describe('WebhooksService', () => {
  let service: WebhooksService;
  let whRepo: ReturnType<typeof mockWebhookRepo>;
  let dlRepo: ReturnType<typeof mockDeliveryRepo>;
  let queue: ReturnType<typeof mockQueue>;

  beforeEach(async () => {
    whRepo = mockWebhookRepo();
    dlRepo = mockDeliveryRepo();
    queue = mockQueue();
    const module = await Test.createTestingModule({
      providers: [
        WebhooksService,
        { provide: getRepositoryToken(WebhookConfig), useValue: whRepo },
        { provide: getRepositoryToken(WebhookDeliveryLog), useValue: dlRepo },
        { provide: getQueueToken('webhooks'), useValue: queue },
      ],
    }).compile();
    service = module.get(WebhooksService);
  });

  describe('create', () => {
    test('should create a webhook config', async () => {
      const result = await service.create('tenant-1', {
        url: 'https://example.com/hook',
        secret: 'whsec_test',
        events: ['signer.added'],
      });
      expect(whRepo.create).toHaveBeenCalledWith({
        tenantId: 'tenant-1',
        url: 'https://example.com/hook',
        secret: 'whsec_test',
        events: ['signer.added'],
        retryConfig: null,
      });
      expect(whRepo.save).toHaveBeenCalled();
      expect(result).toBeDefined();
    });
  });

  describe('findOneByTenant', () => {
    test('should return config when found', async () => {
      const config = { id: 'wh-1', tenantId: 'tenant-1' };
      whRepo.findOne.mockResolvedValue(config);
      const result = await service.findOneByTenant('wh-1', 'tenant-1');
      expect(result).toEqual(config);
    });

    test('should throw NotFoundException when not found', async () => {
      whRepo.findOne.mockResolvedValue(null);
      await expect(service.findOneByTenant('unknown', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    test('should update webhook config fields', async () => {
      const config = {
        id: 'wh-1',
        tenantId: 'tenant-1',
        url: 'https://old.com',
        events: ['signer.added'],
        isActive: true,
        retryConfig: null,
      };
      whRepo.findOne.mockResolvedValue(config);
      await service.update('wh-1', 'tenant-1', {
        url: 'https://new.com',
        events: ['signature.completed'],
      });
      expect(config.url).toBe('https://new.com');
      expect(config.events).toEqual(['signature.completed']);
      expect(whRepo.save).toHaveBeenCalled();
    });
  });

  describe('softDelete', () => {
    test('should deactivate webhook config', async () => {
      const config = { id: 'wh-1', tenantId: 'tenant-1', isActive: true };
      whRepo.findOne.mockResolvedValue(config);
      await service.softDelete('wh-1', 'tenant-1');
      expect(config.isActive).toBe(false);
      expect(whRepo.save).toHaveBeenCalledWith(config);
    });
  });

  describe('dispatch', () => {
    test('should enqueue deliveries for all subscribed configs', async () => {
      whRepo.find.mockResolvedValue([
        { id: 'wh-1', events: ['signer.added'], isActive: true, retryConfig: null },
        { id: 'wh-2', events: ['other.event'], isActive: true, retryConfig: null },
      ]);
      await service.dispatch('tenant-1', 'signer.added', { signerId: 's1' });
      expect(queue.add).toHaveBeenCalledTimes(1);
      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({ webhookConfigId: 'wh-1' }),
        expect.any(Object),
      );
    });
  });

  describe('findDeliveries', () => {
    test('should return paginated deliveries', async () => {
      const config = { id: 'wh-1', tenantId: 'tenant-1' };
      whRepo.findOne.mockResolvedValue(config);
      dlRepo.findAndCount.mockResolvedValue([[{ id: 'dl-1' }], 1]);
      const result = await service.findDeliveries('wh-1', 'tenant-1', 1, 20);
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('retryDelivery', () => {
    test('should enqueue retry for a failed delivery', async () => {
      dlRepo.findOne.mockResolvedValue({
        id: 'dl-1',
        webhookConfigId: 'wh-1',
        payload: { event: 'test' },
      });
      whRepo.findOne.mockResolvedValue({
        id: 'wh-1',
        tenantId: 'tenant-1',
        isActive: true,
        retryConfig: null,
      });
      await service.retryDelivery('dl-1', 'tenant-1');
      expect(queue.add).toHaveBeenCalledWith(
        'deliver',
        expect.objectContaining({ webhookConfigId: 'wh-1' }),
        expect.any(Object),
      );
    });

    test('should throw NotFoundException for unknown delivery', async () => {
      dlRepo.findOne.mockResolvedValue(null);
      await expect(service.retryDelivery('unknown', 'tenant-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('saveDeliveryLog', () => {
    test('should persist a delivery log entry', async () => {
      await service.saveDeliveryLog({
        webhookConfigId: 'wh-1',
        event: 'signer.added',
        payload: { test: true },
        statusCode: 200,
        responseBody: 'OK',
        duration: 150,
        success: true,
        error: null,
        attemptNumber: 1,
      });
      expect(dlRepo.create).toHaveBeenCalled();
      expect(dlRepo.save).toHaveBeenCalled();
    });
  });
});
