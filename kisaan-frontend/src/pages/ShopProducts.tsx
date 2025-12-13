// import type { ShopProduct } from '../types/api'; // Removed unused import to fix lint error
// Extend shared ShopProduct type for local needs
type LocalShopProduct = {
  id: number;
  shop_id: number;
  product_id: number;
  is_active: boolean;
  created_at?: Date;
  updated_at?: Date;
  name: string;
  product_name: string;
  category_id: number;
  record_status?: string | null;
  category_name?: string;
};
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { shopProductsApi } from '../services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Trash2, RefreshCw, Package } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';

interface Product {
  id: number;
  name: string;
  category_id: number;
  category_name?: string;
  record_status: 'active' | 'inactive';
}

import type { Category, Shop } from '../types/api';


const ShopProducts: React.FC = () => {
  const { user } = useAuth();
  const [shops, setShops] = useState<Shop[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [shopProducts, setShopProducts] = useState<LocalShopProduct[]>([]);
  const [selectedShop, setSelectedShop] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [showAssignForm, setShowAssignForm] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [filters, setFilters] = useState({ search: '' });

  // Only fetch shops and categories once per session
  const hasFetchedShops = useRef(false);
  const hasFetchedCategories = useRef(false);
  useEffect(() => {
    if (!hasFetchedShops.current) {
      fetchShops();
      hasFetchedShops.current = true;
    }
    if (!hasFetchedCategories.current) {
      fetchCategories();
      hasFetchedCategories.current = true;
    }
  }, []);

  useEffect(() => {
    if (selectedShop) {
      fetchShopProducts();
    }
  }, [selectedShop]);

  // Fetch available products for the selected shop
  useEffect(() => {
    if (selectedShop) {
      shopProductsApi.getAvailableProducts(Number(selectedShop)).then((products) => {
        setAvailableProducts(products || []);
      });
    } else {
      setAvailableProducts([]);
    }
  }, [selectedShop]);

  const fetchShops = async () => {
    try {
      const shopsData = await shopProductsApi.getShops(user);
      setShops(shopsData);
    } catch (error) {
      console.error('Error fetching shops:', error);
    }
  };

  const fetchCategories = async () => {
    try {
      const categoriesData = await shopProductsApi.getCategories();
      setCategories(categoriesData);
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };



  const fetchShopProducts = async () => {
    setIsLoading(true);
    try {
      const shopProductsData = await shopProductsApi.getShopProducts(Number(selectedShop));
      // Map API response to LocalShopProduct type if needed
        const mappedProducts = (((shopProductsData as unknown[]) as LocalShopProduct[]) || []).map(sp => ({
        id: typeof sp.id === 'number' ? sp.id : 0,
        shop_id: typeof sp.shop_id === 'number' ? sp.shop_id : 0,
        product_id: typeof sp.product_id === 'number' ? sp.product_id : 0,
        is_active: typeof sp.is_active === 'boolean' ? sp.is_active : true,
        created_at: sp.created_at ? new Date(sp.created_at) : undefined,
        updated_at: sp.updated_at ? new Date(sp.updated_at) : undefined,
        name: typeof sp.name === 'string' ? sp.name : '-',
        product_name: typeof sp.product_name === 'string' ? sp.product_name : (typeof sp.name === 'string' ? sp.name : '-'),
        category_id: typeof sp.category_id === 'number' ? sp.category_id : 0,
        record_status: typeof sp.record_status === 'string' ? sp.record_status : 'active',
        category_name: typeof sp.category_name === 'string' ? sp.category_name : '-',
      }));
      setShopProducts(mappedProducts);
    } catch (error) {
      console.error('Error fetching shop products:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssignProducts = async () => {
    if (!selectedShop || selectedProducts.length === 0) return;
    try {
      const shopIdNum = Number(selectedShop);
      const promises = selectedProducts.map(productId =>
        shopProductsApi.assignProduct(shopIdNum, productId)
      );
      await Promise.all(promises);
      fetchShopProducts();
      setShowAssignForm(false);
      setSelectedProducts([]);
      setSelectedCategory("");
    } catch (error) {
      console.error('Error assigning products:', error);
    }
  };

  const handleRemoveProduct = async (productId: number) => {
    if (!confirm('Are you sure you want to remove this product from the shop?')) return;
    try {
      await shopProductsApi.removeProduct(Number(selectedShop), productId);
      fetchShopProducts();
    } catch (error) {
      console.error('Error removing product:', error);
    }
  };

  const handleToggleProductStatus = async (productId: number, isActive: boolean) => {
    try {
      await shopProductsApi.toggleProductStatus(Number(selectedShop), productId, isActive);
      fetchShopProducts();
    } catch (error) {
      console.error('Error toggling product status:', error);
    }
  };

  const filteredShopProducts = shopProducts.filter(sp =>
    filters.search === '' || 
    sp.product_name.toLowerCase().includes(filters.search.toLowerCase()) ||
    (sp.category_name ? sp.category_name.toLowerCase() : '').includes(filters.search.toLowerCase())
  );

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            {user?.role === 'superadmin' ? 'Shop Products Assignment' : 'Shop Products'}
          </h1>
          <p className="text-gray-600">
            {user?.role === 'superadmin' 
              ? 'Assign existing products from the catalog to specific shops' 
              : 'View products assigned to your shop'
            }
          </p>
          {user?.role === 'superadmin' && (
            <p className="text-sm text-blue-600 mt-1">
              💡 To create new products, go to{' '}
              <a
                href="/superadmin/products"
                className="underline text-blue-700 hover:text-blue-900 font-semibold"
              >
                Products Management
              </a>{' '}
              page
            </p>
          )}
        </div>
      </div>

      {/* Shop Selection */}
      <Card>
        <CardHeader>
          <CardTitle>
            {user?.role === 'superadmin' ? 'Select Shop' : 'Your Shop'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedShop} onValueChange={setSelectedShop}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder={user?.role === 'superadmin' ? "Select a shop to manage products" : "Select your shop"} />
            </SelectTrigger>
            <SelectContent>
              {shops.map(shop => (
                <SelectItem key={shop.id} value={shop.id.toString()}>
                  {user?.role === 'superadmin' 
                    ? `${shop.name} (Owner: #${shop.owner_id})`
                    : shop.name
                  }
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

  {selectedShop && (
        <>
          {/* Actions */}
          <div className="flex justify-between items-center">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search products..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 w-80"
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={fetchShopProducts} variant="outline" size="sm" disabled={isLoading}>
                <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              {user?.role === 'superadmin' && (
                <Dialog open={showAssignForm} onOpenChange={setShowAssignForm}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="w-4 h-4 mr-2" />
                      Assign Products
                    </Button>
                  </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Assign Products to Shop</DialogTitle>
                    <DialogDescription>Select category and products to assign to this shop.</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label>Select Category</Label>
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select category" />
                        </SelectTrigger>
                        <SelectContent>
                          {categories.map(category => (
                            <SelectItem key={category.id} value={category.id.toString()}>
                              {category.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {selectedCategory ? (
                      (() => {
                        const filteredProducts = availableProducts.filter(
                          (product) => String(product.category_id) === selectedCategory
                        );
                        if (filteredProducts.length > 0) {
                          return (
                            <div>
                              <Label>Select Products</Label>
                              <div className="max-h-60 overflow-y-auto border rounded-md p-4 space-y-2">
                                {filteredProducts.map((product) => (
                                  <div key={product.id} className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`product-${product.id}`}
                                      checked={selectedProducts.includes(product.id)}
                                      onCheckedChange={(checked: boolean) => {
                                        if (checked) {
                                          setSelectedProducts((prev) => [...prev, product.id]);
                                        } else {
                                          setSelectedProducts((prev) => prev.filter((id) => id !== product.id));
                                        }
                                      }}
                                    />
                                    <Label htmlFor={`product-${product.id}`} className="flex-1">
                                      {product.name}
                                    </Label>
                                  </div>
                                ))}
                              </div>
                            </div>
                          );
                        } else {
                          return (
                            <div className="text-gray-500 text-sm py-4">No assignable products in this category.</div>
                          );
                        }
                      })()
                    ) : null}

                    <div className="flex gap-2">
                      <Button 
                        onClick={handleAssignProducts} 
                        disabled={selectedProducts.length === 0}

                        className="flex-1"
                      >
                        Assign Selected Products
                      </Button>
                      <Button variant="outline" onClick={() => setShowAssignForm(false)}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              )}
            </div>
          </div>

          {/* Shop Products Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                Shop Products ({filteredShopProducts.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {filteredShopProducts.length === 0 ? (
                <div className="text-center py-12">
                  <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg">No products assigned to this shop</p>
                  <p className="text-gray-400">Use the "Assign Products" button to add products</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Status</TableHead>
                      {user?.role === 'superadmin' && <TableHead>Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredShopProducts.map((shopProduct) => (
                      <TableRow key={shopProduct.id}>
                        <TableCell className="font-medium">{shopProduct.product_name || '-'}</TableCell>
                        <TableCell>{shopProduct.category_name}</TableCell>
                        <TableCell>
                          <Badge 
                            className={shopProduct.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                            onClick={() => handleToggleProductStatus(shopProduct.product_id, shopProduct.is_active)}
                            style={{ cursor: 'pointer' }}
                          >
                            {shopProduct.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        {user?.role === 'superadmin' && (
                          <TableCell>
                            <div className="flex gap-2">
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleToggleProductStatus(shopProduct.product_id, shopProduct.is_active)}
                              >
                                {shopProduct.is_active ? 'Deactivate' : 'Activate'}
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline" 
                                onClick={() => handleRemoveProduct(shopProduct.product_id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        )}
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};

export default ShopProducts;