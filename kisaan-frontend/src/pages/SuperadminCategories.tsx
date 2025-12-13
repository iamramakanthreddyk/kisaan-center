import React, { useState, useEffect } from 'react';
import { categoriesApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '../components/ui/dialog';
import { Label } from '../components/ui/label';

interface Category {
  id: number;
  name: string;
  description?: string | null;
  createdAt: string;
  updatedAt: string;
  status: 'active' | 'inactive';
}

const SuperadminCategories: React.FC = () => {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<{ name: string; description: string; status: 'active' | 'inactive' }>({ name: '', description: '', status: 'active' });
  const [filters, setFilters] = useState<{ search: string; status: string }>({ search: '', status: '' });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; category: Category | null }>({ open: false, category: null });

  useEffect(() => {
    fetchCategories();
  }, [filters]);

  const fetchCategories = async () => {
    setIsLoading(true);
    try {
      const response = await categoriesApi.getAll();
      const arr = response.data ?? [];
      // Normalize API data to match expected type
      let normalized = arr.map((cat) => ({
        ...cat,
        created_at: (cat as { created_at?: string; createdAt?: string }).created_at ?? (cat as { createdAt?: string }).createdAt,
        updated_at: (cat as { updated_at?: string; updatedAt?: string }).updated_at ?? (cat as { updatedAt?: string }).updatedAt,
        status: (cat as { status?: string }).status ?? 'active',
        description: (cat as { description?: string }).description ?? '',
      })) as Category[];
      if (filters.search) {
        normalized = normalized.filter((c) =>
          c.name?.toLowerCase().includes(filters.search.toLowerCase())
        );
      }
      if (filters.status) {
        normalized = normalized.filter((c) => c.status === filters.status);
      }
      setCategories(normalized);
    } catch (error) {
      console.error('Error fetching categories:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) return;
    try {
      if (editingCategory) {
        await categoriesApi.update(editingCategory.id, formData);
      } else {
        await categoriesApi.create(formData);
      }
      fetchCategories();
      setShowCreateForm(false);
      setEditingCategory(null);
      setFormData({ name: '', description: '', status: 'active' });
    } catch (error) {
      console.error('Error saving category:', error);
    }
  };

  const handleDelete = async (id: number) => {
    try {
      await categoriesApi.delete(id);
      fetchCategories();
    } catch (error) {
      console.error('Error deleting category:', error);
    }
  };

  const handleEdit = (category: Category) => {
  setEditingCategory(category);
  setFormData({ name: category.name, description: category.description ?? '', status: category.status });
  setShowCreateForm(true);
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Categories Management</h1>
          <p className="text-gray-600">Manage product categories</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={fetchCategories} variant="outline" size="sm" disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Dialog open={showCreateForm} onOpenChange={setShowCreateForm}>
            <DialogTrigger asChild>
              <Button onClick={() => { setEditingCategory(null); setFormData({ name: '', description: '', status: 'active' }); }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Category
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingCategory ? 'Edit Category' : 'Create Category'}</DialogTitle>
                <DialogDescription>Fill out the category details below.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="name">Category Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter category name"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={formData.status} onValueChange={(value: 'active' | 'inactive') => setFormData(prev => ({ ...prev, status: value }))}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex gap-2">
                  <Button type="submit" className="flex-1">
                    {editingCategory ? 'Update' : 'Create'}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setShowCreateForm(false)}>
                    Cancel
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search categories..."
                value={filters.search}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10"
              />
            </div>
            <Select value={filters.status || "all"} onValueChange={(value: string) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}>
              <SelectTrigger>
                <SelectValue placeholder="All statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Categories ({categories.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {categories.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-gray-500 text-lg">No categories found</p>
            </div>
          ) : (
            <div className="overflow-x-auto w-full max-w-full">
              <Table className="w-full">
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
              {Array.isArray(categories) && categories.map((category) => (
                    <TableRow key={category.id}>
                      <TableCell>#{category.id}</TableCell>
                      <TableCell className="font-medium">{category.name}</TableCell>
                      <TableCell className="text-gray-600">
                        {category.description || '-'}
                      </TableCell>
                      <TableCell>{
                        category.createdAt && !isNaN(Date.parse(category.createdAt))
                          ? new Date(category.createdAt).toLocaleDateString()
                          : '-'
                      }</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => handleEdit(category)}>
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setDeleteDialog({ open: true, category })} className="text-red-600">
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialog.open} onOpenChange={(open: boolean) => {
        if (!open) setDeleteDialog({ open: false, category: null });
      }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Category</DialogTitle>
            <DialogDescription>This action cannot be undone.</DialogDescription>
          </DialogHeader>
          <div className="py-4">Are you sure you want to delete this category?</div>
          <div className="flex gap-2 justify-end">
            <Button
              variant="destructive"
              onClick={async () => {
                if (deleteDialog.category) {
                  await handleDelete(deleteDialog.category.id);
                }
                setDeleteDialog({ open: false, category: null });
              }}
            >
              Delete
            </Button>
            <Button variant="outline" onClick={() => setDeleteDialog({ open: false, category: null })}>
              Cancel
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SuperadminCategories;