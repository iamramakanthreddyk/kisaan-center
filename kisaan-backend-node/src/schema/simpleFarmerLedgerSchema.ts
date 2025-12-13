import * as yup from 'yup';
import { LEDGER_CATEGORY_VALUES } from '../constants/ledgerCategories';
import { LEDGER_TYPE_VALUES } from '../constants/ledgerTypes';

export const simpleFarmerLedgerSchema = yup.object({
  shop_id: yup.number().required(),
  farmer_id: yup.number().required(),
  amount: yup.number().required(),
  type: yup.mixed().oneOf(LEDGER_TYPE_VALUES).required(),
  category: yup.mixed().oneOf(LEDGER_CATEGORY_VALUES).required(),
  notes: yup.string().optional(),
  created_by: yup.number().required(),
  commission_amount: yup.number().optional(),
  net_amount: yup.number().optional(),
});
