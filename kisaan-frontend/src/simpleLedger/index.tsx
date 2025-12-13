import React, { useState } from 'react';
import LedgerList from './LedgerList';
import LedgerForm from './LedgerForm';
import LedgerSummary from './LedgerSummary';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Button } from '../components/ui/button';
import { BookOpen, Plus } from 'lucide-react';
// note: no additional imports
import { UserSearchDropdown } from '../components/ui/UserSearchDropdown';
import { exportLedgerCsv } from './api';
// no extra imports

const SimpleLedger: React.FC = () => {
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<'entries' | 'summary'>('entries');
  const [refreshTrigger, setRefreshTrigger] = useState(false);
  const [selectedFarmer, setSelectedFarmer] = useState<number | null>(null);
  const [fromDate, setFromDate] = useState<string | undefined>(undefined);
  const [toDate, setToDate] = useState<string | undefined>(undefined);

  const handleEntryAdded = () => {
    setShowForm(false);
    setRefreshTrigger(!refreshTrigger);
  };

  return (
    <div className="max-w-4xl mx-auto p-4 md:p-6">
      <div className="mb-6">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="h-6 w-6 text-primary" />
          <h1 className="text-3xl font-bold">Simple Farmer Ledger</h1>
        </div>
        <p className="text-gray-600">Track credit and debit entries for farmers</p>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-end gap-3 sm:gap-4 mb-3">
        <div className="flex-1">
          <UserSearchDropdown onSelect={(u:any)=> setSelectedFarmer(u?.id ?? null)} roleFilter="farmer" placeholder="Filter by farmer" />
        </div>
        <div className="flex gap-2">
          <input type="date" value={fromDate ?? ''} onChange={e=> setFromDate(e.target.value || undefined)} className="border px-2 py-1 rounded" />
          <input type="date" value={toDate ?? ''} onChange={e=> setToDate(e.target.value || undefined)} className="border px-2 py-1 rounded" />
        </div>
        <div className="flex gap-2">
          <Button onClick={async ()=>{
            // CSV export
            try {
              const blob = await exportLedgerCsv(1, selectedFarmer ?? undefined, fromDate, toDate);
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              const d = new Date().toISOString().slice(0,10).replace(/-/g,'');
              a.download = `ledger-${d}.csv`;
              document.body.appendChild(a);
              a.click();
              a.remove();
            } catch (err) {
              console.error('Export failed', err);
            }
          }}>Export CSV</Button>
          <Button onClick={()=> window.print()} variant="outline">Print / PDF</Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as typeof activeTab)} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="entries">Entries</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
        </TabsList>

        {/* Entries Tab */}
        <TabsContent value="entries" className="mt-6 space-y-4">
          {!showForm && (
            <Button onClick={() => setShowForm(true)} className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          )}
          {showForm && (
            <Card>
              <CardHeader>
                <CardTitle>Add New Entry</CardTitle>
              </CardHeader>
              <CardContent>
                <LedgerForm onSuccess={handleEntryAdded} onCancel={() => setShowForm(false)} />
              </CardContent>
            </Card>
          )}
          <LedgerList refreshTrigger={refreshTrigger} farmerId={selectedFarmer ?? undefined} from={fromDate} to={toDate} />
        </TabsContent>

        {/* Summary Tab */}
        <TabsContent value="summary" className="mt-6">
          <LedgerSummary />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default SimpleLedger;
