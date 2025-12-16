
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Loader2, Calculator, CalendarIcon, Clock } from 'lucide-react';
import { format, isAfter, startOfDay } from 'date-fns';
import { cn } from '@/lib/utils.ts';
import { useAuth } from '../../context/AuthContext';
import { TransactionPartySelectors, TransactionQuantityPricing, TransactionSummary, TransactionPayments } from '@/features/transactions/components';
import { useTransactionFormLogic } from '../../hooks/useTransactionFormLogic';
import { useSharedShopProducts } from '../../hooks/useShopProductsCache';
import type { Transaction } from '../../types/api';
import { shopCategoryApi } from '../../services/shopCategoryApi';

interface TransactionFormProps {
  onSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ onSuccess, onCancel }) => {
  // Enhanced: Add backdated transaction state
  const { user } = useAuth();
  const [isBackdated, setIsBackdated] = useState(false);
  const [transactionDate, setTransactionDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Enhanced: Add expense state
  const [expenseAmount, setExpenseAmount] = useState<number>(0);
  const [expenseDescription, setExpenseDescription] = useState<string>('');
  const [includeExpense, setIncludeExpense] = useState<boolean>(false);

  // Prefill shop category and fetch mapped categories
  const [shopCategoryId, setShopCategoryId] = useState<number | undefined>(undefined);
  const [shopCategories, setShopCategories] = useState<{ id: number; name: string }[]>([]);
  useEffect(() => {
    const fetchCategories = async () => {
      if (user?.shop_id) {
        const cats = await shopCategoryApi.getCategoriesForShop(user.shop_id);
        setShopCategories(Array.isArray(cats) ? cats : []);
        if (cats && cats.length > 0) {
          setShopCategoryId(cats[0].id);
        }
      }
    };
    fetchCategories();
  }, [user?.shop_id]);
  
  // Check if user is owner for backdated transaction permission
  const canCreateBackdated = user?.role === 'owner';

  const {
    formData,
    setFormData,
    farmers,
    buyers,
    isLoading,
    error,
    isSubmitting,
    validationErrors,
    calculations,
    commissionRate,
    setCommissionRate,
    buyerPaid,
    setBuyerPaid,
    farmerPaid,
    setFarmerPaid,
    commissionReceived,
    setCommissionReceived,
    buyerPaymentMethod,
    setBuyerPaymentMethod,
    farmerPaymentMethod,
    setFarmerPaymentMethod,
    handleSubmit,
    resetForm,
  } = useTransactionFormLogic({
    onSuccess: (transaction) => {
      if (resetForm) resetForm();
      setExpenseAmount(0);
      setExpenseDescription('');
      setIncludeExpense(false);
      if (onSuccess) onSuccess(transaction);
    },
    onCancel,
    useSimplifiedApi: false,
    expenseAmount,
    expenseDescription,
    includeExpense,
    initialValues: shopCategoryId ? { category_id: shopCategoryId } : {},
  });

  // If shopCategoryId is set and formData.category_id is not, prefill it
  useEffect(() => {
    if (shopCategoryId && !formData.category_id) {
      setFormData(prev => ({ ...prev, category_id: shopCategoryId }));
    }
  }, [shopCategoryId, formData.category_id, setFormData]);

    // Shop-specific products
    const shopId = user?.shop_id;
    const { products: shopProducts } = useSharedShopProducts(Number(shopId));
    const shopProductsArray = Array.isArray(shopProducts) ? shopProducts : [];

  // Map ShopProduct[] to Product[] for TransactionPartySelectors
  type ShopProduct = {
    id: number;
    name?: string;
    product_name?: string;
    category_id?: number;
    record_status?: string;
    created_at?: string;
    updated_at?: string;
  };
  const mappedProducts = shopProductsArray.map((p) => {
    const sp = p as unknown as ShopProduct;
    return {
      id: sp.id,
      name: sp.name || sp.product_name || '',
      category_id: typeof sp.category_id === 'number' ? sp.category_id : 0,
      record_status: sp.record_status,
      created_at: sp.created_at,
      updated_at: sp.updated_at,
    };
  });

  if (error) {
    return (
      <div className="p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <h3 className="text-red-800 font-medium">Error Loading Form Data</h3>
          <p className="text-red-600 text-sm mt-1">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto px-2 sm:px-0">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base sm:text-lg">
          <Calculator className="h-5 w-5" />
          Create New Transaction
          {isBackdated && <Clock className="h-4 w-4 text-orange-500" />}
        </CardTitle>
        
        {/* Enhanced: Backdated transaction toggle for owners */}
        {canCreateBackdated && (
          <div className="flex items-center space-x-2 mt-4">
            <Switch
              id="backdated-mode"
              checked={isBackdated}
              onCheckedChange={setIsBackdated}
            />
            <Label htmlFor="backdated-mode" className="text-sm font-medium">
              Create backdated transaction
            </Label>
          </div>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            <span className="ml-2">Loading form data...</span>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4 sm:space-y-6">
            
            {/* Enhanced: Date picker for backdated transactions */}
            {isBackdated && canCreateBackdated && (
              <div className="space-y-2">
                <Label htmlFor="transaction-date">Transaction Date</Label>
                <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      id="transaction-date"
                      variant="outline"
                      className={cn(
                        "w-full justify-start text-left font-normal",
                        !transactionDate && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {transactionDate ? format(transactionDate, "PPP") : "Pick a date"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={transactionDate}
                      onSelect={(date) => {
                        if (date) {
                          setTransactionDate(date);
                          setFormData(prev => ({
                            ...prev,
                            transaction_date: date.toISOString().split('T')[0]
                          }));
                          setCalendarOpen(false);
                        }
                      }}
                      disabled={(date) => 
                        isAfter(startOfDay(date), startOfDay(new Date()))
                      }
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                {isAfter(startOfDay(transactionDate), startOfDay(new Date())) && (
                  <p className="text-sm text-red-600">
                    Transaction date cannot be in the future
                  </p>
                )}
              </div>
            )}

            {/* Enhanced: Expense section for transaction */}
            <div className="space-y-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2">
                <Switch
                  id="include-expense"
                  checked={includeExpense}
                  onCheckedChange={setIncludeExpense}
                />
                <Label htmlFor="include-expense" className="text-sm font-medium">
                  Include expense deduction from this transaction
                </Label>
              </div>
              
              {includeExpense && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="expense-amount">Expense Amount (₹)</Label>
                    <input
                      id="expense-amount"
                      type="number"
                      min="0"
                      step="0.01"
                      value={expenseAmount}
                      onChange={(e) => setExpenseAmount(Number(e.target.value) || 0)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="expense-description">Expense Reason</Label>
                    <input
                      id="expense-description"
                      type="text"
                      value={expenseDescription}
                      onChange={(e) => setExpenseDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Transportation, Storage, etc."
                    />
                  </div>
                </div>
              )}
            </div>

            <TransactionPartySelectors
              farmers={farmers}
              buyers={buyers}
              categories={shopCategories}
              products={formData.category_id ? mappedProducts.filter(p => p.category_id === formData.category_id) : mappedProducts}
              values={{
                farmer_id: formData.farmer_id,
                buyer_id: formData.buyer_id,
                category_id: formData.category_id,
                product_id: formData.product_id,
                product_name: formData.product_name
              }}
              errors={validationErrors}
              onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
            />
            <TransactionQuantityPricing
              quantity={formData.quantity}
              unit_price={formData.unit_price}
              errors={validationErrors}
              onChange={patch => setFormData(prev => ({ ...prev, ...patch }))}
            />
            {(formData.quantity > 0 && formData.unit_price > 0) && (
              <>
                <TransactionSummary
                  total_sale_value={calculations.total_sale_value}
                  shop_commission={calculations.shop_commission}
                  farmer_earning={calculations.farmer_earning}
                  commissionRate={commissionRate}
                  onCommissionRateChange={setCommissionRate}
                  formatCurrency={(amount: number) => `₹${amount.toLocaleString()}`}
                  expenseAmount={includeExpense ? expenseAmount : 0}
                  expenseDescription={includeExpense ? expenseDescription : undefined}
                />
                <TransactionPayments
                  buyerPaid={buyerPaid}
                  farmerPaid={farmerPaid}
                  commissionReceived={commissionReceived}
                  commissionRate={commissionRate}
                  buyerPaymentMethod={buyerPaymentMethod}
                  farmerPaymentMethod={farmerPaymentMethod}
                  onChange={patch => {
                    if (patch.buyerPaid !== undefined) setBuyerPaid(patch.buyerPaid);
                    if (patch.farmerPaid !== undefined) setFarmerPaid(patch.farmerPaid);
                    if (patch.commissionReceived !== undefined) setCommissionReceived(patch.commissionReceived);
                    if (patch.buyerPaymentMethod) setBuyerPaymentMethod(patch.buyerPaymentMethod);
                    if (patch.farmerPaymentMethod) setFarmerPaymentMethod(patch.farmerPaymentMethod);
                  }}
                  showValidationErrors={!!Object.keys(validationErrors).length}
                  transactionSummary={{
                    totalSaleValue: calculations.total_sale_value,
                    shopCommission: calculations.shop_commission,
                    farmerEarning: calculations.farmer_earning,
                    expenseAmount: includeExpense ? expenseAmount : 0,
                  }}
                />
              </>
            )}
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 pt-4">
              <Button 
                type="submit" 
                disabled={
                  isSubmitting || 
                  isLoading || 
                  (isBackdated && isAfter(startOfDay(transactionDate), startOfDay(new Date())))
                } 
                className="w-full sm:flex-1"
              >
                {(isSubmitting || isLoading) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {isBackdated ? 'Create Backdated Transaction' : 'Create Transaction'}
              </Button>
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel} className="w-full sm:w-auto">
                  Cancel
                </Button>
              )}
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
};