import { NotFoundException } from '@nestjs/common';
import { ProductsService, SAMPLE_PRODUCTS } from './products.service';
import { TOPPING_CATALOG } from './constants/toppings.constant';

describe('ProductsService (MVP Sprint 1 Menu & Stock Calculation)', () => {
  let service: ProductsService;
  let mockPrisma: any;

  beforeEach(() => {
    mockPrisma = {
      product: {
        findMany: jest.fn(),
        count: jest.fn(),
        findUnique: jest.fn(),
      },
    };
    service = new ProductsService(mockPrisma);
  });

  it('findAll computes isOutOfStock per variant and whole product from DB recipes', async () => {
    mockPrisma.product.findMany.mockResolvedValue([
      {
        id: 'prod-db-1',
        name: 'Cà phê Test',
        category: 'COFFEE',
        imageUrl: '/img.jpg',
        description: 'Mô tả',
        reviews: [{ stars: 5 }, { stars: 4 }],
        variants: [
          {
            id: 'var-s',
            size: 'S',
            price: 29000,
            topping: null,
            recipes: [{ quantityRequired: 10, ingredient: { stockQuantity: 5 } }], // out of stock
          },
          {
            id: 'var-m',
            size: 'M',
            price: 35000,
            topping: null,
            recipes: [{ quantityRequired: 15, ingredient: { stockQuantity: 30 } }], // available
          },
        ],
      },
      {
        id: 'prod-db-2',
        name: 'Trà Hết Hàng',
        category: 'TEA',
        imageUrl: '/img2.jpg',
        description: null,
        reviews: [],
        variants: [
          {
            id: 'var-tea-s',
            size: 'S',
            price: 39000,
            topping: null,
            recipes: [{ quantityRequired: 20, ingredient: { stockQuantity: 0 } }],
          },
        ],
      },
    ]);
    mockPrisma.product.count.mockResolvedValue(2);

    const res: any = await service.findAll({ category: 'coffee', page: 1, limit: 10 });

    expect(mockPrisma.product.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { isActive: true, category: 'COFFEE' },
        skip: 0,
        take: 10,
      }),
    );
    expect(res.items).toHaveLength(2);
    expect(res.items[0]).toMatchObject({
      id: 'prod-db-1',
      minPrice: 29000,
      rating: 4.5,
      reviewCount: 2,
      isOutOfStock: false,
    });
    expect(res.items[0].variants[0].isOutOfStock).toBe(true);
    expect(res.items[0].variants[1].isOutOfStock).toBe(false);
    expect(res.items[1].isOutOfStock).toBe(true);
    expect(res.meta).toEqual({
      page: 1,
      limit: 10,
      totalItems: 2,
      totalPages: 1,
    });
  });

  it('findAll falls back to filtered SAMPLE_PRODUCTS when DB fails or is empty', async () => {
    mockPrisma.product.findMany.mockRejectedValue(new Error('DB offline'));

    const res = await service.findAll({ category: 'TEA', search: 'Đào', page: 1, limit: 5 });

    expect(res.items.length).toBeGreaterThanOrEqual(1);
    expect(res.items.every((p) => p.category === 'TEA' && p.name.toLowerCase().includes('đào'))).toBe(true);
    expect((res.meta as any).dataSource).toBe('sample_data_fallback');
  });

  it('findOne returns product detail with avgRating and variant stock status', async () => {
    mockPrisma.product.findUnique.mockResolvedValue({
      id: 'prod-001',
      name: 'Cà phê Sữa Đá',
      variants: [
        {
          id: 'var-001-s',
          size: 'S',
          price: 29000,
          recipes: [{ quantityRequired: 10, ingredient: { stockQuantity: 50 } }],
        },
      ],
      reviews: [{ stars: 5, customer: { fullName: 'Minh' } }],
    });

    const res: any = await service.findOne('prod-001');
    expect(res.avgRating).toBe(5);
    expect(res.reviewCount).toBe(1);
    expect(res.isOutOfStock).toBe(false);
    expect(res.variants[0].isOutOfStock).toBe(false);
  });

  it('findOne throws NotFoundException when product ID does not exist in DB or sample list', async () => {
    mockPrisma.product.findUnique.mockResolvedValue(null);

    await expect(service.findOne('non-existent-prod')).rejects.toThrow(NotFoundException);
  });

  it('findOne returns matching sample product when DB throws', async () => {
    mockPrisma.product.findUnique.mockRejectedValue(new Error('DB offline'));

    const res = await service.findOne(SAMPLE_PRODUCTS[0].id);
    expect(res.id).toBe(SAMPLE_PRODUCTS[0].id);
  });

  it('getToppings returns system topping catalog', () => {
    expect(service.getToppings()).toBe(TOPPING_CATALOG);
    expect(service.getToppings().length).toBeGreaterThan(0);
  });
});
