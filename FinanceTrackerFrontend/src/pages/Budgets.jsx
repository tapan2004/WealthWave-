import React, { useState, useEffect } from 'react';
import { Target, Plus, AlertTriangle, X, Pencil, Trash2 } from 'lucide-react';
import Card from '../components/Card';
import api from '../services/api';

const calculateStatus = (spent, total) => {
  const percent = Math.min((spent / total) * 100, 100);
  const isExceeded = spent > total;
  let statusClass = 'bg-primary-600';
  let statusText = `${(100 - percent).toFixed(0)}% remaining`;

  if (isExceeded) {
    statusClass = 'bg-rose-600';
    statusText = 'Budget Exceeded';
  } else if (percent >= 80) {
    statusClass = 'bg-amber-500';
  }

  return { percent, statusClass, statusText, isExceeded };
};

const Budgets = () => {
  const [budgets, setBudgets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState(null);
  const [formData, setFormData] = useState({ categoryId: '', limitAmount: '' });
  const [deleteConfirm, setDeleteConfirm] = useState(null);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [budgetsRes, categoriesRes] = await Promise.all([
        api.get('/budgets/check'),
        api.get('/categories/type?type=EXPENSE')
      ]);
      setBudgets(budgetsRes.data);
      setCategories(categoriesRes.data);
      if (categoriesRes.data.length > 0) {
        setFormData(prev => ({ ...prev, categoryId: categoriesRes.data[0].id }));
      }
    } catch (err) {
      console.error('Error fetching budgets data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setEditingBudget(null);
    setFormData({ 
      categoryId: categories.length > 0 ? categories[0].id : '', 
      limitAmount: '' 
    });
    setShowModal(true);
  };

  const openEditModal = (budget) => {
    setEditingBudget(budget);
    setFormData({
      categoryId: budget.categoryId,
      limitAmount: budget.budget.toString()
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingBudget) {
        await api.put(`/budgets/${editingBudget.id}`, {
          limitAmount: parseFloat(formData.limitAmount)
        });
      } else {
        const now = new Date();
        await api.post('/budgets', {
          categoryId: formData.categoryId,
          limitAmount: parseFloat(formData.limitAmount),
          month: now.getMonth() + 1,
          year: now.getFullYear()
        });
      }
      setShowModal(false);
      setEditingBudget(null);
      setFormData(prev => ({ ...prev, limitAmount: '' }));
      fetchData();
    } catch (err) {
      console.error('Error saving budget:', err);
      alert(editingBudget ? 'Failed to update budget.' : 'Failed to set budget. You might already have a budget for this category.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/budgets/${id}`);
      setDeleteConfirm(null);
      fetchData();
    } catch (err) {
      console.error('Error deleting budget:', err);
      alert('Failed to delete budget.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-end gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Budgets</h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1">Track your spending limits per category.</p>
        </div>
        <button 
          onClick={openCreateModal}
          className="flex items-center gap-2 bg-primary-600 hover:bg-primary-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm shadow-primary-500/20"
        >
          <Plus className="w-5 h-5" />
          Set Budget
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10 text-slate-500 dark:text-slate-400">Loading budgets...</div>
      ) : (
        <div className="grid grid-cols-1 gap-6">
          {budgets.map((budget, idx) => {
            const { percent, statusClass, statusText, isExceeded } = calculateStatus(budget.spent, budget.budget);
            
            return (
              <Card key={idx} className="hover:shadow-md transition-shadow group">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-primary-50 dark:bg-primary-500/10 text-primary-600 dark:text-primary-400 flex items-center justify-center">
                      <Target className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-slate-800 dark:text-slate-100">{budget.category}</h3>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{statusText}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right mr-2">
                      <span className="font-bold text-lg text-slate-800 dark:text-slate-100">₹{(budget.spent || 0).toFixed(2)}</span>
                      <span className="text-slate-500 dark:text-slate-400"> / ₹{(budget.budget || 0).toFixed(2)}</span>
                    </div>
                    {/* Action buttons */}
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      <button 
                        onClick={() => openEditModal(budget)}
                        className="p-2 rounded-lg text-slate-400 hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-500/10 dark:hover:text-primary-400 transition-colors"
                        title="Edit budget limit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => setDeleteConfirm(budget.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10 dark:hover:text-rose-400 transition-colors"
                        title="Remove budget"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                <div className="relative pt-1">
                  <div className="overflow-hidden h-3 mb-4 text-xs flex rounded-full bg-slate-100 dark:bg-slate-800">
                    <div 
                      style={{ width: `${percent}%` }}
                      className={`shadow-none flex flex-col text-center whitespace-nowrap text-white justify-center ${statusClass} transition-all duration-1000 ease-out`}
                    ></div>
                  </div>
                </div>

                {isExceeded && (
                  <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm mt-3 bg-rose-50 dark:bg-rose-500/10 p-3 rounded-lg border border-rose-100 dark:border-rose-900/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p>You have exceeded your budget for this category.</p>
                  </div>
                )}
                {percent >= 80 && !isExceeded && (
                  <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 text-sm mt-3 bg-amber-50 dark:bg-amber-500/10 p-3 rounded-lg border border-amber-100 dark:border-amber-900/30">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <p>You are approaching your budget limit.</p>
                  </div>
                )}
              </Card>
            );
          })}
          {budgets.length === 0 && (
            <div className="text-center py-12 text-slate-500 dark:text-slate-400">
              You haven't set any budgets for this month yet.
            </div>
          )}
        </div>
      )}

      {/* Create / Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 max-h-[90vh] flex flex-col">
            <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-800">
              <h2 className="text-xl font-bold text-slate-800 dark:text-white">
                {editingBudget ? `Edit Budget: ${editingBudget.category}` : 'Set Budget Limit'}
              </h2>
              <button onClick={() => { setShowModal(false); setEditingBudget(null); }} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
              {!editingBudget && (
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Expense Category</label>
                  {categories.length === 0 ? (
                    <div className="text-sm text-rose-500 py-2">Please create an expense category first.</div>
                  ) : (
                    <select 
                      required
                      value={formData.categoryId}
                      onChange={e => setFormData({...formData, categoryId: e.target.value})}
                      className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 bg-white dark:bg-slate-800 dark:text-white"
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  )}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Monthly Limit Amount ($)</label>
                <input 
                  type="number"
                  step="0.01" 
                  min="0"
                  required
                  value={formData.limitAmount}
                  onChange={e => setFormData({...formData, limitAmount: e.target.value})}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500 bg-white dark:bg-slate-800 dark:text-white"
                  placeholder="e.g. 500.00"
                />
              </div>
              <div className="pt-4 flex gap-3">
                <button 
                  type="button"
                  onClick={() => { setShowModal(false); setEditingBudget(null); }}
                  className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
                <button 
                  type="submit"
                  disabled={!editingBudget && categories.length === 0}
                  className="flex-1 px-4 py-2 text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-50 rounded-lg font-medium transition-colors"
                >
                  {editingBudget ? 'Save Changes' : 'Save Budget'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800 p-6 text-center">
            <div className="w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-rose-600 dark:text-rose-400" />
            </div>
            <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-2">Remove Budget?</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mb-6">
              This will remove the spending limit for this category. Your transactions will not be affected.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-2 text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-2 text-white bg-rose-600 hover:bg-rose-700 rounded-lg font-medium transition-colors"
              >
                Remove
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Budgets;
