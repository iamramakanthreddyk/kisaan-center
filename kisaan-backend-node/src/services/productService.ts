/**
 * Product Service
 * Business logic layer for Product operations
 * Follows clean architecture: Controller -> Service -> Repository -> Database
 */

import { ProductRepository } from '../repositories/ProductRepository';
import { ProductEntity } from '../entities/ProductEntity';
import { ValidationError, NotFoundError, DatabaseError } from '../shared/utils/errors';
import { StringFormatter } from '../shared/utils/formatting';

export class ProductService {
  private productRepository: ProductRepository;

  constructor() {
    this.productRepository = new ProductRepository();
  }

  /**
   * Create a new product
   */
  async createProduct(data: {
    name: string;
    category_id: number;
    description?: string;
    unit: string;
    sku?: string;
  }): Promise<ProductEntity | null> {
    try {
      // Validate required fields
      if (!data.name?.trim()) {
        throw new ValidationError('Product name is required');
      }
      if (!data.category_id) {
        throw new ValidationError('Category ID is required');
      }
      if (!data.unit?.trim()) {
        throw new ValidationError('Unit is required');
      }

      // Format and create product entity
      const productEntity = new ProductEntity({
        name: StringFormatter.sanitizeInput(data.name.trim()),
        category_id: data.category_id,
        description: data.description?.trim() || null,
        unit: data.unit.trim(),
        sku: data.sku?.trim() || null
      });

      return await this.productRepository.create(productEntity);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to create product', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get all products with optional filtering
   */
  async getAllProducts(filters?: {
    activeOnly?: boolean;
    categoryId?: number;
    searchTerm?: string;
  }): Promise<ProductEntity[]> {
    try {
      // activeOnly flag ignored: product status concept removed

      if (filters?.categoryId) {
        return await this.productRepository.findByCategory(filters.categoryId);
      }

      if (filters?.searchTerm) {
        return await this.productRepository.searchByName(filters.searchTerm);
      }

      return await this.productRepository.findAll();
    } catch (error) {
      throw new DatabaseError('Failed to retrieve products', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Get product by ID
   */
  async getProductById(id: number): Promise<ProductEntity> {
    try {
      if (!id || id <= 0) {
        throw new ValidationError('Valid product ID is required');
      }

      const product = await this.productRepository.findById(id);
      if (!product) {
        throw new NotFoundError('Product not found');
      }

      return product;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve product', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Update product
   */
  async updateProduct(id: number, data: Partial<{
    name: string;
    description: string;
    unit: string;
    sku: string;
  }>): Promise<ProductEntity | null> {
    try {
      const existingProduct = await this.getProductById(id);

      // Validate and format update data
      const updateEntity = new ProductEntity({
        ...existingProduct,
        ...data,
        name: data.name ? StringFormatter.sanitizeInput(data.name.trim()) : existingProduct.name,
        description: data.description ? data.description.trim() : existingProduct.description,
        unit: data.unit ? data.unit.trim() : existingProduct.unit,
        sku: data.sku ? data.sku.trim() : existingProduct.sku
      });

      const updatedProduct = await this.productRepository.update(id, updateEntity);
      if (!updatedProduct) {
        throw new DatabaseError('Product update failed or product not found');
      }
      return updatedProduct;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to update product', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Delete product
   */
  async deleteProduct(id: number): Promise<boolean> {
    try {
      await this.getProductById(id); // Check if exists
      await this.productRepository.delete(id);
      return true;
    } catch (error) {
      if (error instanceof ValidationError || error instanceof NotFoundError) {
        throw error;
      }
      throw new DatabaseError('Failed to delete product', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  // deactivateProduct removed: central catalog remains immutable; availability handled via assignments.

  /**
   * Get products by category
   */
  async getProductsByCategory(categoryId: number): Promise<ProductEntity[]> {
    try {
      if (!categoryId || categoryId <= 0) {
        throw new ValidationError('Valid category ID is required');
      }

      return await this.productRepository.findByCategory(categoryId);
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to retrieve products by category', error instanceof Error ? { message: error.message } : undefined);
    }
  }

  /**
   * Search products by name
   */
  async searchProducts(searchTerm: string): Promise<ProductEntity[]> {
    try {
      if (!searchTerm?.trim()) {
        throw new ValidationError('Search term is required');
      }

      return await this.productRepository.searchByName(searchTerm.trim());
    } catch (error) {
      if (error instanceof ValidationError) {
        throw error;
      }
      throw new DatabaseError('Failed to search products', error instanceof Error ? { message: error.message } : undefined);
    }
  }
}
