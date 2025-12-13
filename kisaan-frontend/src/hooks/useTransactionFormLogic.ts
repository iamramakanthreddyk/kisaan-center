// Utility to ensure a product is a ShopProduct
function toShopProduct(p: unknown): ShopProduct {
  const prod = p as {
    id: number;
    shop_id?: number;
    product_id?: number;
    product_name?: string;
    name?: string;
    category?: { id?: number; name?: string };
  };
  return {
    id: prod.id,
    shop_id: prod.shop_id ?? 0,
    product_id: prod.product_id ?? prod.id ?? 0,
    product_name: typeof prod.product_name === 'string' ? prod.product_name : (typeof prod.name === 'string' ? prod.name : ''),
    category: prod.category && typeof prod.category === 'object' ? {
      id: typeof prod.category.id === 'number' ? prod.category.id : undefined,
      name: typeof prod.category.name === 'string' ? prod.category.name : undefined,
    } : undefined,
  };
}
import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../hooks/use-toast';
import { useSharedUsers } from '../hooks/useSharedUsers';
import { useSharedCategories } from '../hooks/useSharedCategories';
import { useSharedShopProducts } from '../hooks/useShopProductsCache';
import { farmerProductApi, simplifiedApi, transactionsApi, expenseApi } from '../services/api';
import { calculateTransactionAmounts, roundCurrency } from '@/features/transactions/utils/transactionCalculations';

import type { TransactionCreate, Transaction } from '../types/api';

import type { ShopProduct } from '../types/api';

// Local product type for unified transaction logic


export interface TransactionFormData extends TransactionCreate {
  product_id?: number;
}

export function useTransactionFormLogic({
  onSuccess,
  onCancel,
  initialValues = {},
  useSimplifiedApi = false,
  isBackdated = false,
  transactionDate = new Date(),
  expenseAmount = 0,
  expenseDescription = '',
  includeExpense = false,
}: {
  onSuccess?: (transaction: Transaction) => void;
  onCancel?: () => void;
  mode?: 'sale' | 'purchase';
  initialValues?: Partial<TransactionFormData>;
  useSimplifiedApi?: boolean;
  isBackdated?: boolean;
  transactionDate?: Date;
  expenseAmount?: number;
  expenseDescription?: string;
  includeExpense?: boolean;
}) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { farmers, buyers, isLoading: usersLoading, error: usersError } = useSharedUsers({ enabled: true });
  const { categories, isLoading: categoriesLoading, error: categoriesError } = useSharedCategories({ enabled: true });
  const { products: shopProducts, isLoading: productsLoading, error: productsError } = useSharedShopProducts(user?.shop_id || 0);

  const [formData, setFormData] = useState<TransactionFormData>({
    shop_id: user?.shop_id || 0,
    farmer_id: 0,
    buyer_id: 0,
    category_id: 0,
    product_name: '',
    quantity: 0,
    unit_price: 0,
    transaction_date: initialValues.transaction_date || new Date().toISOString().split('T')[0],
    ...initialValues,
  });
  const [products, setProducts] = useState<ShopProduct[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
  const [calculations, setCalculations] = useState({
    total_sale_value: 0,
    shop_commission: 0,
    farmer_earning: 0,
  });
  const [commissionRate, setCommissionRate] = useState<number>(0.1);
  const commissionRateCache = useRef<{ [shopId: number]: number }>({});
  const [buyerPaid, setBuyerPaid] = useState(0);
  const [farmerPaid, setFarmerPaid] = useState(0);
  const [commissionReceived, setCommissionReceived] = useState(0);
  const [buyerPaymentMethod, setBuyerPaymentMethod] = useState<'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other'>('cash');
  const [farmerPaymentMethod, setFarmerPaymentMethod] = useState<'cash' | 'bank_transfer' | 'upi' | 'card' | 'cheque' | 'other'>('cash');

  // Loading/error state
  const isLoading = usersLoading || categoriesLoading || productsLoading;
  const error = usersError || categoriesError || productsError;

  // Load products for shop/farmer
  useEffect(() => {
    if (!user?.shop_id || !categories || categories.length === 0) {
      setProducts([]);
      return;
    }
    setProducts((shopProducts || []).map(toShopProduct));
  }, [user?.shop_id, categories, shopProducts]);

  // Update products when farmer is selected - show farmer's products first
  useEffect(() => {
    const updateProductsForFarmer = async () => {
      if (!formData.farmer_id || !user?.shop_id) {
        setProducts((shopProducts || []).map(toShopProduct));
        return;
      }
      try {
        const farmerResponse = await farmerProductApi.getFarmerProducts(formData.farmer_id);
        const farmerProducts = farmerResponse.success ? (farmerResponse.data || []) : [];
        // Map farmer products to use actual product_id
        type FarmerProduct = {
          product_id?: number;
          Product?: { id?: number };
        };
        const farmerShopProducts = (farmerProducts as FarmerProduct[]).map((p) => ({
          ...toShopProduct(p),
          id: p.product_id || (p.Product && p.Product.id) || toShopProduct(p).id,
        }));
        // Deduplicate by product_id
        const allProducts = [...farmerShopProducts, ...(shopProducts || []).map(toShopProduct)];
        const dedupedProducts = Object.values(
          allProducts.reduce((acc, prod) => {
            acc[prod.id] = prod;
            return acc;
          }, {} as Record<number, ShopProduct>)
        );
        setProducts(dedupedProducts);
        // Auto-select first farmer product if available
        if (farmerProducts.length > 0 && !formData.product_name) {
          const firstProduct = toShopProduct(farmerProducts[0]);
          setFormData(prev => ({
            ...prev,
            product_id: typeof firstProduct.id === 'number' ? firstProduct.id : 0,
            product_name: typeof firstProduct.product_name === 'string' ? firstProduct.product_name : '',
            unit_price: 0,
            category_id: firstProduct.category?.id ?? prev.category_id,
          }));
        }
      } catch {
        setProducts((shopProducts || []).map(toShopProduct));
      }
    };
    updateProductsForFarmer();
  }, [formData.farmer_id, user?.shop_id, categories]);

  // Calculations
  useEffect(() => {
    const amounts = calculateTransactionAmounts({
      quantity: formData.quantity,
      unit_price: formData.unit_price,
      commissionRateDecimal: commissionRate,
    });
    setCalculations(amounts);
  }, [formData.quantity, formData.unit_price, commissionRate]);

  // Auto-set payment amounts based on calculations
  useEffect(() => {
    // Ensure commission is never negative
    const total = Number((calculations?.total_sale_value ?? 0).toFixed(2));
    let commission = Number((calculations?.shop_commission ?? 0).toFixed(2));
    if (commission < 0) commission = 0;
    let farmer = Number((calculations?.farmer_earning ?? 0).toFixed(2));
    if (farmer < 0) farmer = 0;

    // Deduct expense from farmer payment if expense is included
    if (includeExpense && expenseAmount > 0) {
      farmer = Math.max(0, farmer - expenseAmount);
    }

    // Always auto-update payment amounts to match calculations
    // This ensures values stay synchronized when quantity/price/commission changes
    // Users can still manually edit these values, but they'll reset when calculations change
    setBuyerPaid(roundCurrency(total));
    setFarmerPaid(roundCurrency(farmer));
    setCommissionReceived(roundCurrency(commission));
  }, [calculations, includeExpense, expenseAmount]);  // Commission rate handling
  const fetchCommissionRate = async () => {
    if (!user?.shop_id) return;
    // This would be an API call to get shop commission rate
    // For now, using default
    const rate = 0.1; // 10%
    setCommissionRate(rate);
    commissionRateCache.current[user.shop_id] = rate;
  };
  useEffect(() => {
    if (user?.shop_id) {
      if (commissionRateCache.current[user.shop_id] !== undefined) {
        setCommissionRate(commissionRateCache.current[user.shop_id]);
      } else {
        fetchCommissionRate();
      }
    }
  }, [user?.shop_id]);

  // Submission handler
  const handleSubmit = useCallback(async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setValidationErrors({});
    try {
      const now = new Date().toISOString();
      // derive expected payment amounts to decide canonical statuses
      const expectedBuyerAmount = Number((calculations?.total_sale_value ?? 0).toFixed(2));
      const expectedFarmerAmount = Number((calculations?.farmer_earning ?? 0).toFixed(2));
      const adjustedExpectedFarmerAmount = includeExpense && expenseAmount > 0 ? Math.max(0, expectedFarmerAmount - expenseAmount) : expectedFarmerAmount;

  // compute typed statuses
    const buyerStatus: 'PENDING' | 'PAID' = Number(buyerPaid) >= expectedBuyerAmount ? 'PAID' : 'PENDING';
    const farmerStatus: 'PENDING' | 'PAID' = Number(farmerPaid) >= adjustedExpectedFarmerAmount ? 'PAID' : 'PENDING';

  const transactionData = {
        shop_id: formData.shop_id,
        farmer_id: formData.farmer_id,
        buyer_id: formData.buyer_id,
        category_id: formData.category_id || 1,
        product_id: formData.product_id,
        product_name: formData.product_name,
        quantity: formData.quantity,
        unit_price: formData.unit_price,
        commission_rate: commissionRate * 100,
        notes: '',
        transaction_date: formData.transaction_date || new Date().toISOString().split('T')[0],
        payments: [
          {
            payer_type: 'buyer' as const,
            payee_type: 'shop' as const,
            amount: buyerPaid,
            method: buyerPaymentMethod,
            // Only mark as COMPLETED when buyerPaid meets or exceeds expected buyer amount,
            // otherwise send PENDING so backend treats it as an incomplete payment.
            status: buyerStatus,
            payment_date: now,
          },
          {
            payer_type: 'shop' as const,
            payee_type: 'farmer' as const,
            amount: farmerPaid,
            method: farmerPaymentMethod,
            // Farmer payment is considered completed only when it meets adjusted expected farmer amount
            status: farmerStatus,
            payment_date: now,
          },
        ],
      };
      let response;
      if (useSimplifiedApi) {
        response = await simplifiedApi.createTransaction(transactionData);
      } else if (isBackdated) {
        response = await transactionsApi.createBackdated(transactionData);
      } else {
        response = await transactionsApi.create(transactionData);
      }
      if (response.success) {
        // Create expense if requested
        if (includeExpense && expenseAmount > 0) {
          try {
            await expenseApi.addExpense({
              shop_id: formData.shop_id,
              user_id: formData.farmer_id,
              amount: expenseAmount,
              description: expenseDescription || 'Transaction expense',
            });
            toast({
              title: '✅ Expense Recorded!',
              description: `₹${expenseAmount.toFixed(2)} expense added to farmer's account`,
              variant: 'success',
            });
          } catch (expenseError) {
            console.error('Failed to create expense:', expenseError);
            toast({
              title: '⚠️ Transaction Created but Expense Failed',
              description: 'Please record the expense manually',
              variant: 'destructive',
            });
          }
        }

        toast({
          title: '✅ Sale Created Successfully!',
          description: `Total: ₹${(calculations?.total_sale_value ?? 0).toFixed(2)} | Payments recorded${includeExpense && expenseAmount > 0 ? ` | Expense: ₹${expenseAmount.toFixed(2)}` : ''}`,
          variant: 'success',
        });
        if (onSuccess && response.data) onSuccess(response.data as Transaction);
      }
    } catch (error) {
      let message = 'Failed to create sale';
      if (error && typeof error === 'object') {
        if ('response' in error && error.response && typeof error.response === 'object' && 'data' in error.response && error.response.data && typeof error.response.data === 'object' && 'message' in error.response.data) {
          message = (error.response.data as { message?: string }).message || message;
        } else if ('message' in error && typeof error.message === 'string') {
          message = error.message;
        }
      }
      toast({
        title: '❌ Sale Failed',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  }, [formData, commissionRate, buyerPaid, buyerPaymentMethod, farmerPaid, farmerPaymentMethod, calculations, onSuccess, toast, useSimplifiedApi, isBackdated, transactionDate]);

  // Add resetForm to clear all form state
  const resetForm = () => {
    setFormData({
      shop_id: user?.shop_id || 0,
      farmer_id: 0,
      buyer_id: 0,
      category_id: 0,
      product_name: '',
      quantity: 0,
      unit_price: 0,
      transaction_date: new Date().toISOString().split('T')[0],
    });
    setBuyerPaid(0);
    setFarmerPaid(0);
    setCommissionReceived(0);
    setBuyerPaymentMethod('cash');
    setFarmerPaymentMethod('cash');
    setCommissionRate(0.1);
    setValidationErrors({});
  };
  return {
    formData,
    setFormData,
    products,
    farmers,
    buyers,
    categories,
    isLoading,
    error,
    isSubmitting,
    validationErrors,
    setValidationErrors,
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
    onCancel,
    resetForm,
  };
}
