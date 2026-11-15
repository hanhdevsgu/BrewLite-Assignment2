import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, ReviewStatus } from '@prisma/client';
import { ReviewsService } from './reviews.service';

describe('ReviewsService (KiemTraDaMua & Review Ownership)', () => {
  let service: ReviewsService;
  let prismaMock: any;

  beforeEach(() => {
    prismaMock = {
      isConnected: true,
      customer: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      account: {
        findFirst: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
      },
      order: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
      },
      review: {
        findFirst: jest.fn(),
        findUnique: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
    };

    service = new ReviewsService(prismaMock);
  });

  it('từ chối khi sao đánh giá nằm ngoài khoảng 1..5', async () => {
    await expect(
      service.createReview('cust-1', { productId: 'prod-1', stars: 6 }),
    ).rejects.toThrow(BadRequestException);
  });

  it('từ chối khi không tìm thấy hồ sơ khách hàng hợp lệ', async () => {
    prismaMock.customer.findUnique.mockResolvedValue(null);
    prismaMock.account.findFirst.mockResolvedValue(null);

    await expect(
      service.createReview('unknown-actor', { productId: 'prod-1', stars: 5 }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('từ chối với NotFoundException khi sản phẩm không tồn tại', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prismaMock.product.findUnique.mockResolvedValue(null);

    await expect(
      service.createReview('cust-1', { productId: 'prod-missing', stars: 5 }),
    ).rejects.toThrow(NotFoundException);
  });

  it('chặn đánh giá (KiemTraDaMua -> 403) khi khách chưa có đơn COMPLETED chứa món đó', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Cà phê Sữa Đá' });
    prismaMock.order.findFirst.mockResolvedValue(null);

    await expect(
      service.createReview('cust-1', { productId: 'prod-1', stars: 5, content: 'Rất ngon' }),
    ).rejects.toThrow(ForbiddenException);
    expect(prismaMock.review.create).not.toHaveBeenCalled();
  });

  it('chặn đánh giá khi truyền orderId chưa COMPLETED hoặc không thuộc về user', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Cà phê Sữa Đá' });
    prismaMock.order.findUnique.mockResolvedValue({
      id: 'ord-paid-only',
      customerId: 'cust-1',
      status: OrderStatus.PAID,
      items: [{ variantId: 'var-1', variant: { productId: 'prod-1' } }],
    });

    await expect(
      service.createReview('cust-1', {
        productId: 'prod-1',
        orderId: 'ord-paid-only',
        stars: 4,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('chặn đánh giá trùng lặp (ConflictException) cho cùng 1 sản phẩm', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Cà phê Sữa Đá' });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'ord-done',
      customerId: 'cust-1',
      status: OrderStatus.COMPLETED,
    });
    prismaMock.review.findFirst.mockResolvedValue({ id: 'rev-existing' });

    await expect(
      service.createReview('cust-1', { productId: 'prod-1', stars: 5 }),
    ).rejects.toThrow(ConflictException);
  });

  it('tạo đánh giá thành công khi khách hàng đã có đơn COMPLETED chứa món đó', async () => {
    prismaMock.customer.findUnique.mockResolvedValue({ id: 'cust-1' });
    prismaMock.product.findUnique.mockResolvedValue({ id: 'prod-1', name: 'Cà phê Sữa Đá' });
    prismaMock.order.findFirst.mockResolvedValue({
      id: 'ord-done',
      customerId: 'cust-1',
      status: OrderStatus.COMPLETED,
    });
    prismaMock.review.findFirst.mockResolvedValue(null);
    prismaMock.review.create.mockResolvedValue({
      id: 'rev-new',
      customerId: 'cust-1',
      productId: 'prod-1',
      orderId: 'ord-done',
      stars: 5,
      content: 'Chuẩn vị',
      status: ReviewStatus.VISIBLE,
    });

    const res = await service.createReview('cust-1', {
      productId: 'prod-1',
      stars: 5,
      content: 'Chuẩn vị',
    });

    expect(res.id).toBe('rev-new');
    expect(prismaMock.review.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          customerId: 'cust-1',
          productId: 'prod-1',
          orderId: 'ord-done',
          stars: 5,
        }),
      }),
    );
  });

  it('chặn khách hàng khác sửa hoặc xóa đánh giá (ForbiddenException)', async () => {
    prismaMock.review.findUnique.mockResolvedValue({
      id: 'rev-1',
      customerId: 'cust-owner',
    });
    prismaMock.customer.findFirst.mockResolvedValue({ id: 'cust-other' });

    await expect(service.updateReview('rev-1', 'cust-other', 3, 'Sửa lén')).rejects.toThrow(
      ForbiddenException,
    );
    await expect(service.deleteReview('rev-1', 'cust-other')).rejects.toThrow(ForbiddenException);
  });
});
