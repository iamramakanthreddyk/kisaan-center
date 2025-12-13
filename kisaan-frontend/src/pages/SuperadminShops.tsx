import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Search, Eye, Edit, RefreshCw, MapPin, Phone, User } from 'lucide-react';
import { shopsApi } from '../services/api';
import type { Shop } from '../types/api';
import { ShopForm } from '../components/superadmin/ShopForm';
import { useIsMobile } from '../hooks/useMediaQuery';

const SuperadminShops: React.FC = () => {
  const [shops, setShops] = useState<Shop[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [filters, setFilters] = useState({
    status: '',
    search: ''
  });

  // Responsive hooks
  const isMobile = useIsMobile();
  // const isSmallMobile = useIsSmallMobile();

  useEffect(() => {
    fetchShops();
  }, [filters]);

  const fetchShops = async () => {
    setIsLoading(true);
    try {
  const params: Partial<Pick<Shop, 'status'>> & { limit: number } = { limit: 100 };
  if (filters.status === 'active' || filters.status === 'inactive') params.status = filters.status;
      
      const response = await shopsApi.getAll(params);
      if (response.data) {
        let filteredShops = response.data;
        
        if (filters.search) {
          const searchLower = filters.search.toLowerCase();
          filteredShops = filteredShops.filter(s => 
            s.name.toLowerCase().includes(searchLower) ||
            s.address.toLowerCase().includes(searchLower) ||
            s.contact.includes(filters.search)
          );
        }
        
        setShops(filteredShops);
      }
    } catch (error) {
      console.error('Error fetching shops:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleShopCreated = (shop: Shop) => {
    setShops(prev => [shop, ...prev]);
    setShowCreateForm(false);
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800';
  };

  if (showCreateForm) {
    return (
      <div className="p-6">
        <ShopForm 
          onSuccess={handleShopCreated}
          onCancel={() => setShowCreateForm(false)}
        />
      </div>
    );
  }

  return (
    <div className={`${isMobile ? 'p-4' : 'p-6'} space-y-4 sm:space-y-6`}>
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className={`font-bold text-gray-900 ${isMobile ? 'text-2xl' : 'text-3xl'}`}>
            Shops Management
          </h1>
          <p className="text-gray-600 text-sm sm:text-base">Manage all shops and their owners</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button 
            onClick={fetchShops}
            variant="outline"
            size={isMobile ? "sm" : "default"}
            className="flex-1 sm:flex-none"
            disabled={isLoading}
          >
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
          <Button 
            onClick={() => setShowCreateForm(true)}
            size={isMobile ? "sm" : "default"}
            className="flex-1 sm:flex-none"
          >
            <Plus className="w-4 h-4 mr-2" />
            {isMobile ? "Create" : "Create Shop"}
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 sm:p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search shops..."
                value={filters.search}
                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                className="pl-10 h-9 sm:h-10 text-sm"
              />
            </div>
            <Select 
              value={filters.status || "all"} 
              onValueChange={(value) => setFilters(prev => ({ ...prev, status: value === "all" ? "" : value }))}
            >
              <SelectTrigger className="h-9 sm:h-10 text-sm">
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

      {/* Shops List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-sm sm:text-base">
            <span>Shops ({shops.length})</span>
            {isLoading && <RefreshCw className="w-4 h-4 animate-spin" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-6">
          {shops.length === 0 ? (
            <div className="text-center py-8 sm:py-12">
              <p className="text-gray-500 text-base sm:text-lg">No shops found</p>
              <p className="text-gray-400 text-xs sm:text-sm mt-2">
                {filters.search || filters.status
                  ? 'Try adjusting your filters'
                  : 'Create your first shop to get started'
                }
              </p>
            </div>
          ) : (
            <>
              {/* Mobile Card Layout */}
              {isMobile ? (
                <div className="space-y-3">
                  {shops.map((shop) => (
                    <Card key={shop.id} className="p-4 border border-gray-200 hover:shadow-md transition-shadow">
                      <div className="space-y-3">
                        {/* Header */}
                        <div className="flex items-start justify-between">
                          <div className="min-w-0 flex-1">
                            <h3 className="font-semibold text-sm text-gray-900 truncate">
                              {shop.name}
                            </h3>
                            <p className="text-xs text-gray-500 mt-1">ID: #{shop.id}</p>
                          </div>
                          <Badge className={`${getStatusColor(shop.status)} text-xs ml-2 flex-shrink-0`}>
                            {shop.status}
                          </Badge>
                        </div>

                        {/* Contact Info */}
                        <div className="space-y-2">
                          <div className="flex items-center text-xs text-gray-600">
                            <MapPin className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
                            <span className="truncate">{shop.address}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <Phone className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
                            <span>{shop.contact}</span>
                          </div>
                          <div className="flex items-center text-xs text-gray-600">
                            <User className="w-3 h-3 mr-2 text-gray-400 flex-shrink-0" />
                            <span>Owner ID: #{shop.owner_id}</span>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-gray-100">
                          <Button size="sm" variant="outline" className="flex-1 h-8">
                            <Eye className="w-3 h-3 mr-1" />
                            View
                          </Button>
                          <Button size="sm" variant="outline" className="flex-1 h-8">
                            <Edit className="w-3 h-3 mr-1" />
                            Edit
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                /* Desktop Table Layout */
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Shop Name</TableHead>
                      <TableHead>Address</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Owner ID</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {shops.map((shop) => (
                      <TableRow key={shop.id}>
                        <TableCell>#{shop.id}</TableCell>
                        <TableCell className="font-medium">{shop.name}</TableCell>
                        <TableCell>{shop.address}</TableCell>
                        <TableCell>{shop.contact}</TableCell>
                        <TableCell>#{shop.owner_id}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(shop.status)}>
                            {shop.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperadminShops;