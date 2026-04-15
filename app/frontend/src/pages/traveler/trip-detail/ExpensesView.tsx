// ─── ExpensesView — expense tracking tab ───
import { DollarSign } from 'lucide-react';
import type { Trip } from '../../../lib/api';
import Button from '../../../components/ui/Button';

interface ExpensesViewProps {
  trip: Trip;
  onAddExpense: () => void;
}

export default function ExpensesView({ trip, onAddExpense }: ExpensesViewProps) {
  const expenses = (trip as any).expenses || [];
  const total = expenses.reduce((sum: number, e: any) => sum + Number(e.amount || 0), 0);

  return (
    <div>
      <div className="bg-surface-card rounded-xl p-6 shadow-sm mb-6 text-center">
        <div className="text-sm text-content-muted mb-1">Total Spent</div>
        <div className="text-3xl font-bold text-content-heading">${total.toFixed(2)}</div>
      </div>
      <Button onClick={onAddExpense} size="lg" icon={<DollarSign className="h-5 w-5" />} className="w-full mb-6">
        Log Expense
      </Button>
      {expenses.length > 0 ? (
        <div className="space-y-2">
          {expenses.map((expense: any) => (
            <div key={expense.id} className="bg-surface-card p-4 rounded-xl shadow-sm flex items-center gap-3">
              <div className="text-2xl">
                {expense.category === 'food' ? '🍽️' :
                 expense.category === 'transport' ? '🚗' :
                 expense.category === 'accommodation' ? '🏨' :
                 expense.category === 'activities' ? '🎯' :
                 expense.category === 'shopping' ? '🛍️' : '📦'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-medium capitalize">{expense.category}</div>
                {expense.description && <div className="text-sm text-content-muted truncate">{expense.description}</div>}
              </div>
              <div className="font-semibold">${Number(expense.amount).toFixed(2)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-surface-card rounded-xl">
          <DollarSign className="h-12 w-12 text-content-faint mx-auto mb-4" />
          <p className="text-content-muted">No expenses logged yet</p>
        </div>
      )}
    </div>
  );
}
