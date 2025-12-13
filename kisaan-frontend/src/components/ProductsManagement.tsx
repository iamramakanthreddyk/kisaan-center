
import { useState, useEffect } from 'react';
import { formatDate } from '../utils/formatDate';
import { useSharedShopProducts } from '../hooks/useShopProductsCache';
import { apiClient } from '../services/apiClient';
import { shopProductsApi } from '../services/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Button } from './ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from './ui/table';
import { Badge } from './ui/badge';
import { Plus, AlertCircle, Package, Trash2 } from 'lucide-react';
// import AddProductDialog from './AddProductDialog';
import { useToast } from '@/hooks/use-toast';

import type { Product as BaseProduct } from '../types/api';

// Extend Product type locally to match backend fields
type Product = BaseProduct & {
  product_name?: string;
  category_name?: string;
  unit?: string | null;
  description?: string | null;
  price?: number | null;
  category?: {
    id: number;
    name: string;
  };
};



interface ProductsManagementProps {
  shopId?: number;
}

export default function ProductsManagement({ shopId }: ProductsManagementProps) {
  // Use global shop products cache only
  const shopProductsResult = useSharedShopProducts(shopId ?? 0);
  // ...removed debug log...
  let products: Product[] = [];
  // Support both array and object-with-data for products
  if (Array.isArray(shopProductsResult.products)) {
    products = shopProductsResult.products as Product[];
  } else if (
    shopProductsResult.products &&
    typeof shopProductsResult.products === 'object' &&
    'data' in shopProductsResult.products &&
    Array.isArray((shopProductsResult.products as { data?: unknown }).data)
  ) {
    products = ((shopProductsResult.products as { data: Product[] }).data);
  } else {
    products = [];
  }
  // No filtering: pass all fields as-is
  const productsLoading = shopProductsResult.isLoading;
  const refreshProducts = shopProductsResult.refresh;
  // Debug: log products to inspect created_at and full product objects
  // ...removed debug logs...
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  // Cache for available products by shopId
  // Global cache for available products by shopId (per session)
  const availableProductsCache: { [shopId: number]: Product[] } = {};
  // Removed unused isLoading state
  // const [showAddProduct, setShowAddProduct] = useState(false);
  const { toast } = useToast();

  // ...removed debug log...

  if (!shopId) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center py-8">
            <AlertCircle className="h-12 w-12 mx-auto mb-4 text-orange-500" />
            <p className="text-lg font-medium">No Shop Found</p>
            <p className="text-muted-foreground">Please contact support to set up your shop.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  // No need to fetch/set products manually; handled by useSharedShopProducts

  useEffect(() => {
    if (shopId) {
      if (availableProductsCache[shopId]) {
        setAllProducts(availableProductsCache[shopId].filter((item): item is Product =>
          typeof item.id === 'number' &&
          typeof item.name === 'string' &&
          typeof item.category_id === 'number' &&
          typeof item.created_at === 'string') as Product[]
        );
      } else {
        fetchAvailableProducts(shopId);
      }
    }
    // No return value
  }, [shopId]);

  const fetchAvailableProducts = async (shopId: number) => {
    try {
      const response = await apiClient.get(`/shops/${shopId}/available-products`) as { products?: Product[]; data?: Product[]; message?: string };
  // ...removed debug log...
      const available = (response && (response.products || response.data)) || [];
      const message = response && response.message;
      availableProductsCache[shopId] = Array.isArray(available) ? available : [];
      setAllProducts(Array.isArray(availableProductsCache[shopId])
        ? (availableProductsCache[shopId].filter((item): item is Product =>
            typeof item.id === 'number' &&
            typeof item.name === 'string' &&
            typeof item.category_id === 'number' &&
            typeof item.created_at === 'string') as Product[])
        : []);
  // ...removed debug log...
      if (message) {
  // ...removed debug log...
      }
    } catch {
      // Fallback to all products if shop-specific endpoint fails
      try {
        const fallbackResponse = await apiClient.get('/products') as { data?: Product[]; products?: Product[] };
        const allProds = (fallbackResponse && (fallbackResponse.data || fallbackResponse.products)) || [];
        // Filter out already assigned products
        const assignedIds = products.map(p => p.id);
        const filtered = Array.isArray(allProds) ? allProds.filter((p: Product) => 
          !assignedIds.includes(p.id) && p.record_status === 'active'
        ) : [];
        availableProductsCache[shopId] = filtered;
        setAllProducts(Array.isArray(filtered)
          ? (filtered.filter((item): item is Product =>
              typeof item.id === 'number' &&
              typeof item.name === 'string' &&
              typeof item.category_id === 'number' &&
              typeof item.created_at === 'string') as Product[])
          : []);
      } catch {
        setAllProducts([]);
      }
    }
  };

  // Fetch shop categories
  // Removed unused fetchShopCategories

  // Removed unused handleProductAdded

  // Assign a product to this shop
  const handleAssignProduct = async (productId: number) => {
    if (!shopId) return;
    try {
  // ...removed debug log...
  await apiClient.post(`/shops/${shopId}/products/${productId}`);
  // ...removed debug log...
      await Promise.all([
        refreshProducts(),
        fetchAvailableProducts(shopId)
      ]);
    } catch (err) {
      const error = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : 'Failed to assign product';
      // ...removed debug log...
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  };

  // Remove a product from this shop
  const handleRemoveProduct = async (productId: number) => {
    if (!shopId) return;
    try {
      await shopProductsApi.removeProduct(shopId, productId);
      await Promise.all([
        refreshProducts(),
        fetchAvailableProducts(shopId)
      ]);
      toast({
        title: 'Product Removed',
        description: 'Product has been removed from your shop.',
        variant: 'default',
      });
    } catch (err) {
      const error = err && typeof err === 'object' && 'message' in err ? (err as { message?: string }).message : 'Failed to remove product';
      toast({
        title: 'Error',
        description: error,
        variant: 'destructive',
      });
    }
  };

  // Removed unused formatCurrency

  if (productsLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading products...</span>
          </div>
        </CardContent>
      </Card>
    );
  }



  // Extra debug: log products array right before rendering
  // ...removed debug log...

  // UI warning if first product is missing unit/description
  let missingFieldsWarning = null;
  if (products.length > 0) {
    const first = products[0];
    if (!('unit' in first) || first.unit === undefined) {
      missingFieldsWarning = 'Warning: First product is missing unit field!';
    } else if (!('description' in first) || first.description === undefined) {
      missingFieldsWarning = 'Warning: First product is missing description field!';
    }
  }

  return (
    <>
      {missingFieldsWarning && (
        <div style={{ background: '#fffbe6', color: '#ad6800', padding: '8px', borderRadius: '4px', marginBottom: '12px', border: '1px solid #ffe58f' }}>
          {missingFieldsWarning}
        </div>
      )}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
            <div className="flex-1 min-w-0">
              <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
                <Package className="h-5 w-5 text-green-600" />
                My Shop Products - Currently Assigned
              </CardTitle>
              <CardDescription className="text-sm sm:text-base">
                Products currently assigned to your shop for selling. ({products.length} assigned)
              </CardDescription>
              {/* Shop categories removed */}
            </div>
          </div>
        </CardHeader>

        <CardContent>
          {products.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No products assigned to your shop yet</p>
              <p className="text-sm mt-2">Assign products from the central catalog below to start selling.</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-green-800 mb-2">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">Your Shop's Product Inventory</span>
                </div>
                <p className="text-sm text-green-700">
                  These products are assigned to your shop and available for transactions. 
                  You can remove products you no longer want to sell.
                </p>
              </div>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                <Table className="w-full max-w-full">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      {/* <TableHead>Price</TableHead> */}
                      <TableHead>Unit</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {products.map((product) => {
                      // Debug: log created_at before formatting
                      // ...removed debug log...
                      return (
                        <TableRow key={product.id} className="hover:bg-green-50">
                          <TableCell className="font-medium">{product.product_name || product.name || '-'}</TableCell>
                          <TableCell>
                            <Badge variant="outline">{(product.category?.name) || product.category_name || '-'}</Badge>
                          </TableCell>
                          {/* Price column removed */}
                          <TableCell>{typeof product.unit === 'string' && product.unit.trim() !== '' ? product.unit : '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{product.description ? product.description : '-'}</TableCell>
                          <TableCell>
                            {product.created_at ? formatDate(product.created_at) : '-'}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              title="Remove"
                              onClick={() => handleRemoveProduct(product.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card/List Layout */}
              <div className="block sm:hidden space-y-3">
                {products.map((product) => (
                  <div key={product.id} className="rounded-lg border p-3 bg-white shadow-sm w-full max-w-full overflow-x-hidden mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-base break-words break-all w-2/3">{product.product_name || product.name || '-'}</span>
                      <Badge variant="outline" className="w-fit">{(product.category?.name) || product.category_name || '-'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-2">
                      {/* Price field removed */}
                      <div className="break-words break-all"><span className="font-medium">Unit:</span> {product.unit ? product.unit : '-'}</div>
                      <div className="break-words break-all col-span-2"><span className="font-medium">Assigned:</span> {product.created_at ? formatDate(product.created_at) : '-'}</div>
                    </div>
                    <div className="text-xs break-words break-all mb-2"><span className="font-medium">Description:</span> {product.description ? product.description : '-'}</div>
                    <div className="flex justify-end">
                      <Button 
                        size="icon" 
                        variant="outline" 
                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                        title="Remove"
                        onClick={() => handleRemoveProduct(product.id)}
                      >
                        <Trash2 className="w-5 h-5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Central Products Available for Assignment */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5 text-blue-600" />
            Central Products - Available for Assignment
          </CardTitle>
          <CardDescription>
            {`All central products available for assignment (${allProducts.length} available)`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {allProducts.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="font-medium">No central products available for assignment</p>
              <p className="text-sm mt-2">
                No categories assigned to your shop. All central products are available for assignment.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center gap-2 text-blue-800 mb-2">
                  <Package className="h-4 w-4" />
                  <span className="font-medium">Central Product Catalog</span>
                </div>
                <p className="text-sm text-blue-700">
                  These are products from the central catalog that you can assign to your shop for selling. 
                  Once assigned, they will appear in your shop's product list for transactions.
                </p>
                <div className="mt-2 text-xs text-blue-600">
                  Debug: Shop ID: {shopId}, Assigned: {products.length}, Available: {allProducts.length}
                </div>
              </div>
              {/* Desktop Table */}
              <div className="hidden sm:block overflow-x-auto w-full max-w-full">
                <Table className="min-w-max">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product Name</TableHead>
                      <TableHead>Category</TableHead>
                      {/* <TableHead>Price</TableHead> */}
                      <TableHead>Unit</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Assigned Date</TableHead>
                      <TableHead>Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {allProducts.map((product) => {
                      // ...removed debug log...
                      return (
                        <TableRow key={product.id} className="hover:bg-blue-50">
                          <TableCell className="font-medium">{product.product_name || product.name || 'N/A'}</TableCell>
                          <TableCell>
                            <Badge variant="secondary">{product.category?.name || product.category_name || '-'}</Badge>
                          </TableCell>
                          {/* Price column removed */}
                          <TableCell>{product.unit ?? '-'}</TableCell>
                          <TableCell className="max-w-xs truncate">{product.description ?? '-'}</TableCell>
                          <TableCell>{product.created_at ? formatDate(product.created_at) : '-'}</TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              className="bg-green-600 hover:bg-green-700 text-white"
                              onClick={() => handleAssignProduct(product.id)}
                            >
                              <Plus className="w-4 h-4 mr-1" />
                              Assign to Shop
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
              {/* Mobile Card/List Layout */}
              <div className="block sm:hidden space-y-3">
                {allProducts.map((product) => (
                  <div key={product.id} className="rounded-lg border p-3 bg-white shadow-sm w-full max-w-full overflow-x-hidden mx-auto">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold text-base break-words break-all w-2/3">{product.product_name || product.name || 'N/A'}</span>
                      <Badge variant="secondary" className="w-fit">{product.category?.name || product.category_name || '-'}</Badge>
                    </div>
                    <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs mb-2">
                      {/* Price field removed */}
                      <div className="break-words break-all"><span className="font-medium">Unit:</span> {product.unit ?? '-'}</div>
                      <div className="break-words break-all col-span-2"><span className="font-medium">Assigned:</span> {product.created_at ? formatDate(product.created_at) : '-'}</div>
                    </div>
                    <div className="text-xs break-words break-all mb-2"><span className="font-medium">Description:</span> {product.description ?? '-'}</div>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={() => handleAssignProduct(product.id)}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Assign to Shop
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Removed AddProductDialog, only assignment logic remains */}
    </>
  );
}