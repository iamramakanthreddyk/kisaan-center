import { Category } from '../models/category';
import { CategoryCreate, CategoryUpdate } from '../schemas/category';
import { Op } from 'sequelize';

export class CategoryService {
  async createCategory(data: CategoryCreate): Promise<Category> {
    const category = await Category.create({
      name: data.name,
      description: data.description ?? null,
    });
    return category;
  }

  async getAllCategories(): Promise<Category[]> {
    return Category.findAll({ order: [['name', 'ASC']] });
  }

  async getCategoryById(id: number): Promise<Category | null> {
    const category = await Category.findByPk(id);
    return category;
  }

  async updateCategory(id: number, data: CategoryUpdate): Promise<Category | null> {
    const category = await Category.findByPk(id);
    if (!category) return null;

    const updateData: Record<string, unknown> = { ...data };
    
    // Convert null description to undefined for update
    if (data.description === null) {
      updateData.description = null;
    }

    await category.update(updateData);
    return category;
  }

  async deleteCategory(id: number): Promise<boolean> {
    const category = await Category.findByPk(id);
    if (!category) return false;

    await category.destroy();
    return true;
  }

  // deactivate & active-only concepts removed in simplified model

  async searchCategories(searchTerm: string): Promise<Category[]> {
    const categories = await Category.findAll({
      where: {
        [Op.or]: [
          { name: { [Op.iLike]: `%${searchTerm}%` } },
          { description: { [Op.iLike]: `%${searchTerm}%` } }
        ]
      },
      order: [['name', 'ASC']]
    });
    return categories;
  }

  // reorder functionality removed (no display_order column in simplified model)
}
