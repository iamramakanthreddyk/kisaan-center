import { Request, Response } from 'express';
import BalanceSnapshot from '../models/balanceSnapshot';

export class BalanceSnapshotController {
  // POST /balance-snapshots - Create a new snapshot for a user
  async createSnapshot(req: Request, res: Response) {
    try {
      const { 
        user_id, 
        balance_type, 
        previous_balance = 0, 
        amount_change, 
        new_balance, 
        transaction_type,
        reference_id,
        reference_type,
        description 
      } = req.body;
      
      if (!user_id || !balance_type || amount_change === undefined || new_balance === undefined || !transaction_type) {
        return res.status(400).json({ 
          success: false, 
          message: 'user_id, balance_type, amount_change, new_balance, and transaction_type are required' 
        });
      }
      
      const snapshot = await BalanceSnapshot.create({ 
        user_id, 
        balance_type, 
        previous_balance, 
        amount_change, 
        new_balance, 
        transaction_type,
        reference_id,
        reference_type,
        description 
      });
      
      return res.status(201).json({ success: true, data: snapshot });
    } catch (error) {
      console.error('Error creating balance snapshot:', error);
      return res.status(500).json({ success: false, message: 'Failed to create balance snapshot', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }

  // GET /balance-snapshots/:user_id - Get all snapshots for a user
  async getSnapshots(req: Request, res: Response) {
    try {
      const { user_id } = req.params;
      const snapshots = await BalanceSnapshot.findAll({
        where: { user_id },
        order: [['created_at', 'DESC']]
      });
      return res.json({ success: true, data: snapshots });
    } catch (error) {
      console.error('Error fetching balance snapshots:', error);
      return res.status(500).json({ success: false, message: 'Failed to fetch balance snapshots', error: error instanceof Error ? error.message : 'Unknown error' });
    }
  }
}
