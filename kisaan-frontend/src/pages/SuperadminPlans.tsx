import React, { useState } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { Textarea } from '../components/ui/textarea';
import { Switch } from '../components/ui/switch';
import { Plus, Edit, Trash2, Users, Calendar, Star, Check } from 'lucide-react';

interface Plan {
  id: string;
  name: string;
  description: string;
  price: number;
  billingCycle: 'monthly' | 'yearly';
  features: string[];
  maxUsers: number;
  maxTransactions: number;
  isActive: boolean;
  isPopular?: boolean;
  createdAt: Date;
  updatedAt: Date;
}

// Mock plans data
const mockPlans: Plan[] = [
  {
    id: '1',
    name: 'Basic',
    description: 'Perfect for small shops just getting started',
    price: 999,
    billingCycle: 'monthly',
    features: ['Up to 2 users', 'Basic reporting', 'Email support', 'Mobile app access'],
    maxUsers: 2,
    maxTransactions: 1000,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01')
  },
  {
    id: '2',
    name: 'Professional',
    description: 'For growing businesses with advanced needs',
    price: 2499,
    billingCycle: 'monthly',
    features: ['Up to 10 users', 'Advanced analytics', 'Priority support', 'API access', 'Custom reports'],
    maxUsers: 10,
    maxTransactions: 10000,
    isActive: true,
    isPopular: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-15')
  },
  {
    id: '3',
    name: 'Enterprise',
    description: 'For large organizations with complex requirements',
    price: 4999,
    billingCycle: 'monthly',
    features: ['Unlimited users', 'Custom integrations', '24/7 phone support', 'Advanced security', 'Multi-location support'],
    maxUsers: -1, // -1 means unlimited
    maxTransactions: -1,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-02-01')
  },
  {
    id: '4',
    name: 'Starter (Legacy)',
    description: 'Legacy plan for existing customers',
    price: 499,
    billingCycle: 'monthly',
    features: ['Single user', 'Basic features only'],
    maxUsers: 1,
    maxTransactions: 500,
    isActive: false,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2024-01-01')
  }
];

const SuperadminPlans: React.FC = () => {
  const [plans, setPlans] = useState<Plan[]>(mockPlans);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [formData, setFormData] = useState<Partial<Plan>>({
    name: '',
    description: '',
    price: 0,
    billingCycle: 'monthly',
    features: [],
    maxUsers: 0,
    maxTransactions: 0,
    isActive: true
  });

  const handleCreatePlan = () => {
    const newPlan: Plan = {
      ...formData as Plan,
      id: Math.random().toString(36).substr(2, 9),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    setPlans([...plans, newPlan]);
    setIsCreateDialogOpen(false);
    resetForm();
  };

  const handleEditPlan = () => {
    if (!selectedPlan) return;
    
    const updatedPlans = plans.map(plan => 
      plan.id === selectedPlan.id 
        ? { ...plan, ...formData, updatedAt: new Date() }
        : plan
    );
    setPlans(updatedPlans);
    setIsEditDialogOpen(false);
    setSelectedPlan(null);
    resetForm();
  };

  const handleDeletePlan = (planId: string) => {
    if (window.confirm('Are you sure you want to delete this plan? This action cannot be undone.')) {
      setPlans(plans.filter(plan => plan.id !== planId));
    }
  };

  const handleToggleActive = (planId: string) => {
    const updatedPlans = plans.map(plan => 
      plan.id === planId 
        ? { ...plan, isActive: !plan.isActive, updatedAt: new Date() }
        : plan
    );
    setPlans(updatedPlans);
  };

  const openEditDialog = (plan: Plan) => {
    setSelectedPlan(plan);
    setFormData({
      name: plan.name,
      description: plan.description,
      price: plan.price,
      billingCycle: plan.billingCycle,
      features: [...plan.features],
      maxUsers: plan.maxUsers,
      maxTransactions: plan.maxTransactions,
      isActive: plan.isActive,
      isPopular: plan.isPopular
    });
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: 0,
      billingCycle: 'monthly',
      features: [],
      maxUsers: 0,
      maxTransactions: 0,
      isActive: true
    });
  };

  const addFeature = (feature: string) => {
    if (feature.trim() && !formData.features?.includes(feature.trim())) {
      setFormData({
        ...formData,
        features: [...(formData.features || []), feature.trim()]
      });
    }
  };

  const removeFeature = (index: number) => {
    const newFeatures = [...(formData.features || [])];
    newFeatures.splice(index, 1);
    setFormData({ ...formData, features: newFeatures });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(price);
  };

  const PlanDialog = ({ isOpen, onClose, onSave, title, plan }: {
    isOpen: boolean;
    onClose: () => void;
    onSave: () => void;
    title: string;
    plan?: Plan;
  }) => {
    const [newFeature, setNewFeature] = useState('');

    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {plan ? 'Update the plan details below.' : 'Create a new subscription plan for users.'}
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="e.g., Professional"
                />
              </div>
              <div>
                <Label htmlFor="price">Price (₹)</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: parseInt(e.target.value) || 0 })}
                  placeholder="2499"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the plan"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxUsers">Max Users</Label>
                <Input
                  id="maxUsers"
                  type="number"
                  value={formData.maxUsers === -1 ? '' : formData.maxUsers}
                  onChange={(e) => setFormData({ ...formData, maxUsers: e.target.value === '' ? -1 : parseInt(e.target.value) || 0 })}
                  placeholder="10 (or empty for unlimited)"
                />
              </div>
              <div>
                <Label htmlFor="maxTransactions">Max Monthly Transactions</Label>
                <Input
                  id="maxTransactions"
                  type="number"
                  value={formData.maxTransactions === -1 ? '' : formData.maxTransactions}
                  onChange={(e) => setFormData({ ...formData, maxTransactions: e.target.value === '' ? -1 : parseInt(e.target.value) || 0 })}
                  placeholder="10000 (or empty for unlimited)"
                />
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Input
                    value={newFeature}
                    onChange={(e) => setNewFeature(e.target.value)}
                    placeholder="Add a feature"
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        addFeature(newFeature);
                        setNewFeature('');
                      }
                    }}
                  />
                  <Button 
                    type="button"
                    onClick={() => {
                      addFeature(newFeature);
                      setNewFeature('');
                    }}
                  >
                    Add
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {formData.features?.map((feature, index) => (
                    <Badge key={index} variant="secondary" className="gap-1">
                      {feature}
                      <button
                        onClick={() => removeFeature(index)}
                        className="ml-1 hover:text-destructive"
                      >
                        ×
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Switch
                  id="isActive"
                  checked={formData.isActive}
                  onCheckedChange={(checked) => setFormData({ ...formData, isActive: checked })}
                />
                <Label htmlFor="isActive">Active Plan</Label>
              </div>
              
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={formData.isPopular || false}
                  onCheckedChange={(checked) => setFormData({ ...formData, isPopular: checked })}
                />
                <Label htmlFor="isPopular">Mark as Popular</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button onClick={onSave}>
              {plan ? 'Update Plan' : 'Create Plan'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Plans Management</h1>
          <p className="text-gray-600 dark:text-gray-300 mt-1">
            Manage subscription plans and pricing for your platform
          </p>
        </div>
        <Button onClick={() => setIsCreateDialogOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {plans.map((plan) => (
          <Card key={plan.id} className={`relative ${plan.isPopular ? 'ring-2 ring-emerald-500' : ''}`}>
            {plan.isPopular && (
              <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                <Badge className="bg-emerald-500 text-white">
                  <Star className="h-3 w-3 mr-1" />
                  Most Popular
                </Badge>
              </div>
            )}
            
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl">{plan.name}</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant={plan.isActive ? 'default' : 'secondary'}>
                    {plan.isActive ? 'Active' : 'Inactive'}
                  </Badge>
                </div>
              </div>
              <CardDescription>{plan.description}</CardDescription>
              <div className="mt-4">
                <span className="text-3xl font-bold text-gray-900 dark:text-white">
                  {formatPrice(plan.price)}
                </span>
                <span className="text-gray-600 dark:text-gray-300">/{plan.billingCycle}</span>
              </div>
            </CardHeader>

            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-emerald-500" />
                    <span className="text-sm">{feature}</span>
                  </li>
                ))}
              </ul>
              
              <div className="mt-4 space-y-2 text-sm text-gray-600 dark:text-gray-300">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  <span>{plan.maxUsers === -1 ? 'Unlimited users' : `Up to ${plan.maxUsers} users`}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>{plan.maxTransactions === -1 ? 'Unlimited transactions' : `${plan.maxTransactions.toLocaleString()} transactions/month`}</span>
                </div>
              </div>
            </CardContent>

            <CardFooter className="flex justify-between">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => openEditDialog(plan)}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeletePlan(plan.id)}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <Button
                variant={plan.isActive ? "secondary" : "default"}
                size="sm"
                onClick={() => handleToggleActive(plan.id)}
              >
                {plan.isActive ? 'Deactivate' : 'Activate'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      {/* Create Plan Dialog */}
      <PlanDialog
        isOpen={isCreateDialogOpen}
        onClose={() => {
          setIsCreateDialogOpen(false);
          resetForm();
        }}
        onSave={handleCreatePlan}
        title="Create New Plan"
      />

      {/* Edit Plan Dialog */}
      <PlanDialog
        isOpen={isEditDialogOpen}
        onClose={() => {
          setIsEditDialogOpen(false);
          setSelectedPlan(null);
          resetForm();
        }}
        onSave={handleEditPlan}
        title="Edit Plan"
        plan={selectedPlan || undefined}
      />
    </div>
  );
};

export default SuperadminPlans;